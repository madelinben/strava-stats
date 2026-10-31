/**
 * Daily Strava → dashboard.json sync.
 * Credentials from env only — never bundled into the SPA.
 *
 * Usage: npm run sync
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { buildDashboard, buildYearBundle } from '../src/lib/stats';
import { buildTrainingPlan, pickMilestone } from '../src/lib/trainingPlan';
import type {
  ActivityEffortSource,
  StravaActivitySummary,
  StravaAthlete,
  StravaBestEffort,
  TrackedEvent,
  YearBundle,
} from '../src/types';

config();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(ROOT, 'public', 'data', 'dashboard.json');
const VERSION_PATH = join(ROOT, 'public', 'data', 'version.json');
const YEARS_DIR = join(ROOT, 'public', 'data', 'years');
const EVENTS_PATH = join(ROOT, 'public', 'data', 'events.json');
const STREAMS_DIR = join(ROOT, 'public', 'data', 'streams');
const ENV_PATH = join(ROOT, '.env');

function isRunActivitySummary(a: StravaActivitySummary): boolean {
  const t = a.sport_type ?? a.type;
  return t === 'Run' || t === 'TrailRun' || t === 'VirtualRun';
}

function loadTrackedEvents(): TrackedEvent[] {
  if (!existsSync(EVENTS_PATH)) return [];
  return JSON.parse(readFileSync(EVENTS_PATH, 'utf8')) as TrackedEvent[];
}

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
let refreshToken = process.env.STRAVA_REFRESH_TOKEN;

const MAX_PAGES = 40;
const PER_PAGE = 100;
const MAX_429_RETRIES = 3;
/** Min run distance to bother fetching detail for best efforts (5k). */
const MIN_EFFORT_DISTANCE_M = 5000;
/** Stream fetches per sync — Strava allows 100 req/15 min (1000/day), and best
 * efforts share that budget, so backfill happens over several syncs. */
const MAX_STREAMS_PER_RUN = 60;
/** Points kept per route; plenty for a smooth gradient on a phone-sized graphic. */
const STREAM_POINTS = 200;

function requireCreds(): void {
  if (!CLIENT_ID || !CLIENT_SECRET || !refreshToken) {
    console.error(
      'Missing STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, or STRAVA_REFRESH_TOKEN.\n' +
        'Local: copy .env.example → .env and run npm run auth.\n' +
        'CI: set the same names as GitHub Actions secrets.',
    );
    process.exit(1);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function stravaFetch(url: string, accessToken: string, attempt = 0): Promise<Response> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 429) {
    if (attempt >= MAX_429_RETRIES) {
      throw new Error('Strava rate limit (429) — aborting to avoid retry storm');
    }
    const retryAfter = Number(res.headers.get('Retry-After') ?? 60);
    const waitMs = Math.min(Math.max(retryAfter, 15), 300) * 1000;
    console.warn(`429 from Strava — waiting ${waitMs / 1000}s (attempt ${attempt + 1})`);
    await sleep(waitMs);
    return stravaFetch(url, accessToken, attempt + 1);
  }
  return res;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

async function refreshAccessToken(): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken!,
  });
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<TokenResponse>;
}

function persistRefreshToken(next: string): void {
  if (next === refreshToken) return;
  refreshToken = next;

  // Local: rewrite .env if present
  if (existsSync(ENV_PATH)) {
    let text = readFileSync(ENV_PATH, 'utf8');
    if (/^STRAVA_REFRESH_TOKEN=/m.test(text)) {
      text = text.replace(/^STRAVA_REFRESH_TOKEN=.*$/m, `STRAVA_REFRESH_TOKEN=${next}`);
    } else {
      text += `\nSTRAVA_REFRESH_TOKEN=${next}\n`;
    }
    writeFileSync(ENV_PATH, text, 'utf8');
    console.log('Updated STRAVA_REFRESH_TOKEN in local .env');
  }

  // CI: write back to Actions secrets so next day's run works (Strava rotates tokens)
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.SECRETS_PAT) {
    const repo = process.env.GITHUB_REPOSITORY;
    if (!repo) {
      console.warn('GITHUB_REPOSITORY missing — cannot update secret');
      return;
    }
    try {
      execFileSync(
        'gh',
        ['secret', 'set', 'STRAVA_REFRESH_TOKEN', '--repo', repo, '--body', next],
        {
          env: { ...process.env, GH_TOKEN: process.env.SECRETS_PAT },
          stdio: ['pipe', 'inherit', 'inherit'],
        },
      );
      console.log('Updated STRAVA_REFRESH_TOKEN GitHub Actions secret');
    } catch (e) {
      console.error('Failed to write back STRAVA_REFRESH_TOKEN secret:', e);
      throw e;
    }
  } else if (process.env.GITHUB_ACTIONS === 'true') {
    console.warn(
      'SECRETS_PAT not set — rotated refresh token was NOT written back. ' +
        'Next scheduled sync may fail until you update STRAVA_REFRESH_TOKEN manually.',
    );
  }
}

async function fetchAthlete(accessToken: string): Promise<StravaAthlete> {
  const res = await stravaFetch('https://www.strava.com/api/v3/athlete', accessToken);
  if (!res.ok) throw new Error(`Athlete fetch failed (${res.status}): ${await res.text()}`);
  return res.json() as Promise<StravaAthlete>;
}

async function fetchAllActivities(accessToken: string): Promise<StravaActivitySummary[]> {
  const all: StravaActivitySummary[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://www.strava.com/api/v3/athlete/activities?per_page=${PER_PAGE}&page=${page}`;
    const res = await stravaFetch(url, accessToken);
    if (!res.ok) {
      throw new Error(`Activities fetch failed page ${page} (${res.status}): ${await res.text()}`);
    }
    const batch = (await res.json()) as StravaActivitySummary[];
    all.push(...batch);
    console.log(`Fetched page ${page}: ${batch.length} activities (total ${all.length})`);
    if (batch.length < PER_PAGE) break;
    // Gentle pacing between pages
    await sleep(200);
  }
  return all;
}

function isRunActivity(a: StravaActivitySummary): boolean {
  const t = a.sport_type ?? a.type;
  return t === 'Run' || t === 'TrailRun' || t === 'VirtualRun';
}

/**
 * Detailed activity fetch — only source of Strava best_efforts (exact distance times).
 * Limited to runs long enough to contain a 5k+ effort; paced to respect rate limits.
 */
async function fetchRunBestEfforts(
  accessToken: string,
  activities: StravaActivitySummary[],
): Promise<ActivityEffortSource[]> {
  const runs = activities.filter(
    (a) => isRunActivity(a) && a.distance >= MIN_EFFORT_DISTANCE_M,
  );
  console.log(
    `Fetching best efforts for ${runs.length} runs (≥ ${MIN_EFFORT_DISTANCE_M} m)…`,
  );
  const sources: ActivityEffortSource[] = [];

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const res = await stravaFetch(
      `https://www.strava.com/api/v3/activities/${run.id}`,
      accessToken,
    );
    if (!res.ok) {
      console.warn(
        `Skip activity ${run.id} (${res.status}): ${run.name}`,
      );
      await sleep(200);
      continue;
    }
    const detail = (await res.json()) as {
      id: number;
      name: string;
      start_date_local: string;
      best_efforts?: StravaBestEffort[];
    };
    sources.push({
      id: detail.id,
      name: detail.name,
      start_date_local: detail.start_date_local,
      best_efforts: detail.best_efforts ?? [],
    });
    if ((i + 1) % 10 === 0 || i === runs.length - 1) {
      console.log(`  best efforts ${i + 1}/${runs.length}`);
    }
    await sleep(200);
  }

  return sources;
}

function encodePolyline(points: [number, number][]): string {
  let out = '';
  let pLat = 0;
  let pLng = 0;
  const enc = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    while (n >= 0x20) {
      out += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    out += String.fromCharCode(n + 63);
  };
  for (const [lat, lng] of points) {
    const la = Math.round(lat * 1e5);
    const ln = Math.round(lng * 1e5);
    enc(la - pLat);
    enc(ln - pLng);
    pLat = la;
    pLng = ln;
  }
  return out;
}

/**
 * Per-activity GPS streams (speed + altitude along the route) for the
 * single-route export's blue→red gradient. One small file per activity, loaded
 * lazily by the SPA. Incremental: existing files are skipped, newest first,
 * capped per run. An empty file marks "no GPS stream" so it isn't refetched.
 */
async function fetchRouteStreams(
  accessToken: string,
  activities: StravaActivitySummary[],
): Promise<void> {
  mkdirSync(STREAMS_DIR, { recursive: true });
  const todo = activities
    .filter((a) => a.map?.summary_polyline && !existsSync(join(STREAMS_DIR, `${a.id}.json`)))
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .slice(0, MAX_STREAMS_PER_RUN);
  console.log(`Fetching route streams for ${todo.length} activities…`);

  for (const a of todo) {
    const res = await stravaFetch(
      `https://www.strava.com/api/v3/activities/${a.id}/streams?keys=latlng,velocity_smooth,altitude&key_by_type=true`,
      accessToken,
    );
    const file = join(STREAMS_DIR, `${a.id}.json`);
    if (res.status === 404) {
      writeFileSync(file, '{"p":"","v":[],"a":[]}\n', 'utf8');
    } else if (!res.ok) {
      console.warn(`Skip streams ${a.id} (${res.status})`);
    } else {
      const body = (await res.json()) as Record<string, { data: unknown[] } | undefined>;
      const latlng = (body.latlng?.data ?? []) as [number, number][];
      const vel = (body.velocity_smooth?.data ?? []) as number[];
      const alt = (body.altitude?.data ?? []) as number[];
      const step = Math.max(1, Math.ceil(latlng.length / STREAM_POINTS));
      const idx = latlng.map((_, i) => i).filter((i) => i % step === 0 || i === latlng.length - 1);
      writeFileSync(
        file,
        `${JSON.stringify({
          p: encodePolyline(idx.map((i) => latlng[i])),
          v: idx.map((i) => Math.round((vel[i] ?? 0) * 10)),
          a: idx.map((i) => Math.round(alt[i] ?? 0)),
        })}\n`,
        'utf8',
      );
    }
    await sleep(200);
  }
}

function activityYear(a: { start_date_local: string }): number {
  return Number(a.start_date_local.slice(0, 4));
}

/** Year archive path — git-tracked, unlike dashboard.json, so a closed year's
 * numbers survive even if a future Strava fetch returns less history. */
function yearArchivePath(year: number): string {
  return join(YEARS_DIR, `${year}.json`);
}

/** Bump whenever YearBundle's shape changes — makes an archive written by an
 * older version of this script get silently recomputed instead of shipped
 * as-is (and crashing the SPA on the missing/renamed fields). */
const ARCHIVE_SCHEMA_VERSION = 4;

function loadArchive(archivePath: string): YearBundle | null {
  if (!existsSync(archivePath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(archivePath, 'utf8')) as YearBundle & {
      schemaVersion?: number;
    };
    if (parsed.schemaVersion !== ARCHIVE_SCHEMA_VERSION) return null;
    const { schemaVersion: _schemaVersion, ...bundle } = parsed;
    return bundle;
  } catch {
    return null;
  }
}

/**
 * Nominatim reverse geocoding — free, no API key, usage policy caps anonymous
 * use at ~1 req/sec and requires an identifying User-Agent. Only called for
 * years rebuilt this run (archived years keep the label they got when they
 * were first built), so this stays well within that budget.
 */
const NOMINATIM_USER_AGENT =
  'strava-stats-dashboard/1.0 (personal Strava dashboard; github.com/madelinben/strava-stats)';

async function reverseGeocode(center: { lat: number; lng: number }): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${center.lat}&lon=${center.lng}&zoom=10`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
    if (!res.ok) return 'Unknown area';
    const data = (await res.json()) as { address?: Record<string, string>; display_name?: string };
    const a = data.address ?? {};
    return a.city || a.town || a.village || a.county || data.display_name?.split(',')[0] || 'Unknown area';
  } catch (e) {
    console.warn(`Reverse geocode failed for ${center.lat},${center.lng}:`, e);
    return 'Unknown area';
  }
}

/** Fill in every region's blank label via reverse geocoding, rate-limited to
 * respect Nominatim's usage policy. Mutates `bundle` in place. */
async function labelBundleRegions(bundle: YearBundle): Promise<void> {
  for (const regions of Object.values(bundle.regionsByBucket)) {
    for (const region of regions) {
      region.label = await reverseGeocode(region.center);
      await sleep(1100);
    }
  }
}

/**
 * Build (or reuse) each calendar year's stats bundle.
 * Past years are cached to disk the first time they're computed and never
 * recomputed after — only the current year is always rebuilt from the fresh
 * Strava fetch.
 */
async function buildYears(
  activities: StravaActivitySummary[],
  effortSources: ActivityEffortSource[],
  currentYear: number,
): Promise<{ years: Record<string, YearBundle>; availableYears: number[] }> {
  const activityYears = new Set(activities.map(activityYear));
  activityYears.add(currentYear);
  const availableYears = [...activityYears].sort((a, b) => a - b);

  const years: Record<string, YearBundle> = {};
  for (const year of availableYears) {
    const archivePath = yearArchivePath(year);
    const archived = year !== currentYear ? loadArchive(archivePath) : null;
    if (archived) {
      years[String(year)] = archived;
      continue;
    }

    const yearActivities = activities.filter((a) => activityYear(a) === year);
    const yearEffortSources = effortSources.filter(
      (s) => Number(s.start_date_local.slice(0, 4)) === year,
    );
    const bundle = buildYearBundle(yearActivities, yearEffortSources);
    console.log(`Labelling ${year} map regions…`);
    await labelBundleRegions(bundle);
    years[String(year)] = bundle;

    if (year !== currentYear) {
      mkdirSync(YEARS_DIR, { recursive: true });
      writeFileSync(
        archivePath,
        `${JSON.stringify({ schemaVersion: ARCHIVE_SCHEMA_VERSION, ...bundle }, null, 2)}\n`,
        'utf8',
      );
      console.log(`Archived ${year} → ${archivePath}`);
    }
  }

  // "All time" — always recomputed fresh (never archived, since the current
  // year's slice of it changes every sync).
  years.all = buildYearBundle(activities, effortSources);
  console.log('Labelling all-time map regions…');
  await labelBundleRegions(years.all);

  return { years, availableYears };
}

async function main(): Promise<void> {
  requireCreds();
  console.log('Refreshing Strava access token…');
  const tokens = await refreshAccessToken();
  persistRefreshToken(tokens.refresh_token);

  console.log('Fetching athlete…');
  const athlete = await fetchAthlete(tokens.access_token);

  console.log('Fetching activities…');
  const activities = await fetchAllActivities(tokens.access_token);

  const effortSources = await fetchRunBestEfforts(
    tokens.access_token,
    activities,
  );

  await fetchRouteStreams(tokens.access_token, activities);

  const now = new Date();
  const currentYear = now.getFullYear();
  const { years, availableYears } = await buildYears(activities, effortSources, currentYear);

  const trackedEvents = loadTrackedEvents();
  const milestone = pickMilestone(trackedEvents, now);
  const longestRunKm = activities
    .filter(isRunActivitySummary)
    .reduce((max, a) => Math.max(max, a.distance / 1000), 0);
  const plan = buildTrainingPlan(milestone, longestRunKm, now);

  const dashboard = buildDashboard(athlete, activities, years, availableYears, currentYear, plan, now);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(dashboard, null, 2), 'utf8');
  // Cache buster for the SPA — PersistQueryClient uses this as `buster` so a
  // successful cron/deploy drops stale sessionStorage (no server revalidate API on Pages).
  writeFileSync(
    VERSION_PATH,
    JSON.stringify(
      {
        generatedAt: dashboard.generatedAt,
        source: 'strava-sync',
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Wrote ${VERSION_PATH} (cache buster ${dashboard.generatedAt})`);
  const currentYearBundle = years[String(currentYear)];
  console.log(
    `Summary (${currentYear}): ${currentYearBundle.summary.activities} activities · ${currentYearBundle.summary.runDistanceKm} km run`,
  );
  for (const pb of currentYearBundle.running.distancePbs) {
    console.log(`  ${pb.label}: ${pb.value} (${pb.pace})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
