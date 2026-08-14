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
import { buildDashboard } from '../src/lib/stats';
import type { StravaActivitySummary, StravaAthlete } from '../src/types';

config();

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = join(ROOT, 'public', 'data', 'dashboard.json');
const ENV_PATH = join(ROOT, '.env');

const CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
let refreshToken = process.env.STRAVA_REFRESH_TOKEN;

const MAX_PAGES = 40;
const PER_PAGE = 100;
const MAX_429_RETRIES = 3;

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

async function main(): Promise<void> {
  requireCreds();
  console.log('Refreshing Strava access token…');
  const tokens = await refreshAccessToken();
  persistRefreshToken(tokens.refresh_token);

  console.log('Fetching athlete…');
  const athlete = await fetchAthlete(tokens.access_token);

  console.log('Fetching activities…');
  const activities = await fetchAllActivities(tokens.access_token);

  const dashboard = buildDashboard(athlete, activities);
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(dashboard, null, 2), 'utf8');
  console.log(`Wrote ${OUT_PATH}`);
  console.log(
    `Summary: ${dashboard.summary.activities} activities · ${dashboard.summary.runDistanceKm} km run`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
