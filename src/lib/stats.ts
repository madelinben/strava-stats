import { computeWeeklyCompliance } from './compliance';
import { clusterByDistance, type LatLng } from './geo';
import { decodePolyline } from './polyline';
import { bucketForSport, MAP_BUCKET_IDS } from './sports';
import type { GeneratedPlan } from './trainingPlan';

/**
 * Regions merge only through a chain of hops each within this distance —
 * single-linkage clustering, so two activities join the same region iff
 * there's no "distinctly large, unconnected" gap between them. Chosen from
 * real activity spacing: within-city starts cluster within ~2 km of each
 * other, while separate towns (e.g. Chester ↔ Liverpool, ~20+ km, no
 * intermediate activities bridging the gap) sit well clear of this radius.
 */
const REGION_THRESHOLD_KM = 10;

const SHOE_LIFE_KM = 800;

import { formatDurationLong } from './format';
import type {
  ActivityEffortSource,
  ActivityLite,
  DashboardData,
  DistanceEffort,
  GroupStats,
  HeatDay,
  MapPoint,
  MapRegion,
  Sport,
  SportRoute,
  StatHighlight,
  StravaActivitySummary,
  StravaAthlete,
  StravaBestEffort,
  YearBundle,
} from '../types';

const GROUP_DEFS = [
  { id: 'parkrun', name: 'Parkrun', schedule: 'Saturdays', match: /parkrun/i },
  { id: 'chstr', name: 'CHSTR', schedule: 'Mondays', match: /chstr/i },
  { id: 'rcic', name: 'RCIC', schedule: 'Thursdays', match: /\brcic\b/i },
] as const;

function sportOf(a: StravaActivitySummary): Sport {
  return (a.sport_type ?? a.type) as Sport;
}

function isRun(a: StravaActivitySummary): boolean {
  const t = sportOf(a);
  return t === 'Run' || t === 'TrailRun' || t === 'VirtualRun';
}

function isRide(a: StravaActivitySummary): boolean {
  const t = sportOf(a);
  return t === 'Ride' || t === 'VirtualRide' || t === 'EBikeRide' || t === 'GravelRide';
}

function isHike(a: StravaActivitySummary): boolean {
  return sportOf(a) === 'Hike';
}

function metresToKm(m: number): number {
  return m / 1000;
}

function formatKm(m: number, digits = 2): string {
  return `${metresToKm(m).toFixed(digits)} km`;
}

/** Pace as m:ss per km from average_speed (m/s). */
export function pacePerKm(averageSpeedMs: number): string {
  if (!averageSpeedMs || averageSpeedMs <= 0) return '—';
  const secPerKm = 1000 / averageSpeedMs;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatShortDate(isoLocal: string): string {
  const [y, m, d] = isoLocal.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toMapPoint(a: StravaActivitySummary): MapPoint | null {
  if (!a.start_latlng || a.start_latlng.length < 2) return null;
  const [lat, lng] = a.start_latlng;
  if (lat === 0 && lng === 0) return null;
  return {
    id: a.id,
    lat,
    lng,
    name: a.name,
    date: a.start_date_local.slice(0, 10),
  };
}

function toSportRoute(a: StravaActivitySummary): SportRoute | null {
  const polyline = a.map?.summary_polyline;
  if (!polyline) return null;
  return { id: a.id, date: a.start_date_local.slice(0, 10), polyline };
}

function buildGroupStats(runs: StravaActivitySummary[]): GroupStats[] {
  return GROUP_DEFS.map((def) => {
    const matched = runs.filter((a) => def.match.test(a.name));
    const totalDistance = matched.reduce((s, a) => s + a.distance, 0);
    const totalElev = matched.reduce((s, a) => s + (a.total_elevation_gain || 0), 0);
    const totalTime = matched.reduce((s, a) => s + a.moving_time, 0);
    const fastest = matched.reduce(
      (best, a) => (a.average_speed > best ? a.average_speed : best),
      0,
    );
    const last = matched
      .map((a) => a.start_date_local.slice(0, 10))
      .sort()
      .at(-1);

    return {
      id: def.id,
      name: def.name,
      schedule: def.schedule,
      runs: matched.length,
      totalDistanceKm: Number(metresToKm(totalDistance).toFixed(2)),
      avgDistanceKm:
        matched.length > 0
          ? Number(metresToKm(totalDistance / matched.length).toFixed(2))
          : 0,
      avgPacePerKm:
        matched.length > 0 && totalTime > 0
          ? pacePerKm(totalDistance / totalTime)
          : '—',
      fastestPacePerKm: fastest > 0 ? pacePerKm(fastest) : '—',
      totalElevationM: Math.round(totalElev),
      lastRun: last ? formatShortDate(last) : null,
    };
  });
}

/** Race clock time: m:ss or h:mm:ss */
function formatRaceTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

const DISTANCE_PB_TARGETS: Array<{
  id: string;
  label: string;
  /** Exact race distance in metres (for pace). */
  distanceM: number;
  /** Strava best_efforts[].name values (case-insensitive). */
  effortNames: string[];
}> = [
  { id: '5k', label: 'Quickest 5k', distanceM: 5000, effortNames: ['5k'] },
  { id: '10k', label: 'Quickest 10k', distanceM: 10000, effortNames: ['10k'] },
  {
    id: '10mile',
    label: 'Quickest 10 mile',
    distanceM: 16093.44,
    effortNames: ['10 mile', '10mile'],
  },
  {
    id: 'half',
    label: 'Quickest half marathon',
    distanceM: 21097.5,
    effortNames: ['half-marathon', 'half marathon'],
  },
  {
    id: 'marathon',
    label: 'Quickest marathon',
    distanceM: 42195,
    effortNames: ['marathon'],
  },
];

function normalizeEffortName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function effortSeconds(effort: StravaBestEffort): number {
  // Strava's Best Efforts UI uses elapsed time for the exact distance segment
  return effort.elapsed_time > 0 ? effort.elapsed_time : effort.moving_time;
}

function bestStravaEffort(
  sources: ActivityEffortSource[],
  id: string,
  label: string,
  distanceM: number,
  effortNames: string[],
): DistanceEffort {
  const wanted = new Set(effortNames.map(normalizeEffortName));
  let best: {
    seconds: number;
    distance: number;
    activityName: string;
    date: string;
  } | null = null;

  for (const activity of sources) {
    for (const effort of activity.best_efforts ?? []) {
      if (!wanted.has(normalizeEffortName(effort.name))) continue;
      const seconds = effortSeconds(effort);
      if (seconds <= 0) continue;
      if (!best || seconds < best.seconds) {
        best = {
          seconds,
          distance: effort.distance > 0 ? effort.distance : distanceM,
          activityName: activity.name,
          date: activity.start_date_local,
        };
      }
    }
  }

  if (!best) {
    return {
      id,
      label,
      value: '—',
      pace: '—',
      sub: 'No Strava best effort at this distance yet',
    };
  }

  const speed = best.distance / best.seconds;
  return {
    id,
    label,
    value: formatRaceTime(best.seconds),
    pace: `${pacePerKm(speed)} /km`,
    sub: `${best.activityName} · ${formatShortDate(best.date)}`,
  };
}

function distancePbs(sources: ActivityEffortSource[]): DistanceEffort[] {
  return DISTANCE_PB_TARGETS.map((t) =>
    bestStravaEffort(sources, t.id, t.label, t.distanceM, t.effortNames),
  );
}

/** "4:57 /km" → 297 (seconds). */
function paceLabelToSeconds(pace: string): number | null {
  const m = pace.match(/(\d+):(\d\d)/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatPaceSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

/** Builds the "how your data shaped this plan" blurb from the athlete's actual
 * all-time bests, instead of a fixed hand-written paragraph — so a fork with
 * a different history (or none yet) gets an honest, relevant blurb. */
export function buildAnalysisBlurb(
  allTimeDistancePbs: DistanceEffort[],
  longestRunKm: number,
): string {
  const prefix = 'How your data shaped this plan:';
  const fivek = allTimeDistancePbs.find((p) => p.id === '5k' && p.value !== '—');
  const tenk = allTimeDistancePbs.find((p) => p.id === '10k' && p.value !== '—');

  if (!fivek && !tenk && longestRunKm === 0) {
    return `${prefix} no runs logged yet — this plan uses generic training-phase structure until there's a timed 5k or 10k (or at least a run) on Strava to tune it to.`;
  }

  const paceParts: string[] = [];
  if (fivek) paceParts.push(`your quickest 5k is ${fivek.value} (${fivek.pace})`);
  if (tenk) paceParts.push(`your quickest 10k is ${tenk.value} (${tenk.pace})`);

  const basePaceSec = tenk
    ? paceLabelToSeconds(tenk.pace)
    : fivek
      ? paceLabelToSeconds(fivek.pace)
      : null;
  const easyRangeSentence = basePaceSec
    ? ` — pointing to an easy-pace baseline around ${formatPaceSeconds(basePaceSec + 60)}–${formatPaceSeconds(basePaceSec + 90)}/km`
    : '';

  const paceSentence = paceParts.length
    ? `${paceParts.join(' and ')}${easyRangeSentence}.`
    : '';
  const longRunSentence =
    longestRunKm > 0
      ? ` Your longest logged run is ${longestRunKm} km, so the plan below builds from that rather than assuming endurance you haven't logged yet.`
      : '';

  return `${prefix} ${paceSentence}${longRunSentence}`.trim();
}

function furthest(activities: StravaActivitySummary[]): StatHighlight {
  if (!activities.length) return { value: '—', sub: 'None logged' };
  const best = activities.reduce((a, b) => (a.distance >= b.distance ? a : b));
  return {
    value: formatKm(best.distance),
    sub: `${best.name} · ${formatShortDate(best.start_date_local)}`,
  };
}

function longestTime(activities: StravaActivitySummary[]): StatHighlight {
  if (!activities.length) return { value: '—', sub: 'None logged' };
  const best = activities.reduce((a, b) =>
    a.moving_time >= b.moving_time ? a : b,
  );
  return {
    value: formatDurationLong(best.moving_time),
    sub: `${best.name} · ${formatShortDate(best.start_date_local)}`,
  };
}

function highestElevation(activities: StravaActivitySummary[]): StatHighlight {
  if (!activities.length) return { value: '—', sub: 'None logged' };
  const best = activities.reduce((a, b) =>
    (a.total_elevation_gain || 0) >= (b.total_elevation_gain || 0) ? a : b,
  );
  return {
    value: `${Math.round(best.total_elevation_gain)} m`,
    sub: `${best.name} · ${formatShortDate(best.start_date_local)}`,
  };
}

function favouriteHikeLocation(hikes: StravaActivitySummary[]): StatHighlight {
  if (!hikes.length) return { value: '—', sub: 'None logged' };
  const counts = new Map<string, { count: number; sample: string }>();
  for (const h of hikes) {
    const key = h.name.includes('Race the Sun')
      ? 'Race the Sun'
      : h.name.split(/[-–—]/)[0]?.trim() || h.name;
    const prev = counts.get(key) ?? { count: 0, sample: h.name };
    counts.set(key, { count: prev.count + 1, sample: key });
  }
  let bestKey = '';
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v.count > bestCount) {
      bestKey = k;
      bestCount = v.count;
    }
  }
  const sample = hikes.find((h) => h.name.includes(bestKey)) ?? hikes[0];
  return {
    value: bestKey,
    sub:
      bestCount > 1
        ? `${sample?.name.includes('South Downs') ? 'South Downs · ' : ''}${bestCount} hikes on the same event`
        : formatShortDate(sample.start_date_local),
  };
}

/**
 * Geo-cluster one bucket's activities into named-later regions. `label` is
 * left blank here — sync.ts fills it in with a reverse-geocoded place name
 * (network I/O has no business in this otherwise-pure function).
 */
function buildRegions(points: MapPoint[], routes: SportRoute[]): MapRegion[] {
  const coordsById = new Map<number, LatLng>();
  for (const p of points) coordsById.set(p.id, { lat: p.lat, lng: p.lng });
  for (const r of routes) {
    if (coordsById.has(r.id)) continue;
    const first = decodePolyline(r.polyline)[0];
    if (first) coordsById.set(r.id, { lat: first[0], lng: first[1] });
  }
  if (coordsById.size === 0) return [];

  const clusterable = [...coordsById.entries()].map(([id, ll]) => ({ id, ...ll }));
  const clusters = clusterByDistance(clusterable, REGION_THRESHOLD_KM);

  return clusters
    .sort((a, b) => b.items.length - a.items.length)
    .map((cluster, i) => ({
      id: `region-${i}`,
      label: '',
      center: cluster.center,
      bounds: cluster.bounds,
      activityIds: cluster.items.map((it) => it.id),
      count: cluster.items.length,
    }));
}

function dateRangeLabel(activities: StravaActivitySummary[]): string {
  if (!activities.length) return 'No activities';
  const dates = activities.map((a) => a.start_date_local.slice(0, 10)).sort();
  const first = formatShortDate(dates[0]);
  const last = formatShortDate(dates[dates.length - 1]);
  return `${first} – ${last}`;
}

/** Build the year-scoped stats bundle for one calendar year's worth of activities. */
export function buildYearBundle(
  yearActivities: StravaActivitySummary[],
  yearEffortSources: ActivityEffortSource[],
): YearBundle {
  const runs = yearActivities.filter(isRun);
  const rides = yearActivities.filter(isRide);
  const hikes = yearActivities.filter(isHike);

  const runDistance = runs.reduce((s, a) => s + a.distance, 0);
  const runTime = runs.reduce((s, a) => s + a.moving_time, 0);
  const rideDistance = rides.reduce((s, a) => s + a.distance, 0);
  const rideTime = rides.reduce((s, a) => s + a.moving_time, 0);
  const hikeTime = hikes.reduce((s, a) => s + a.moving_time, 0);
  const hikeDistance = hikes.reduce((s, a) => s + a.distance, 0);

  const heatmap: HeatDay[] = yearActivities.map((a) => ({
    date: a.start_date_local.slice(0, 10),
    sport: sportOf(a),
  }));

  const activityLog: ActivityLite[] = yearActivities.map((a) => ({
    id: a.id,
    name: a.name,
    type: sportOf(a),
    date: a.start_date_local.slice(0, 10),
    distanceKm: Number(metresToKm(a.distance).toFixed(2)),
    movingTime: formatDurationLong(a.moving_time),
    movingTimeSec: a.moving_time,
    pace: pacePerKm(a.average_speed),
  }));

  const loggedKm = Number(metresToKm(runDistance).toFixed(1));
  const shoePercent = Math.min(100, Math.round((loggedKm / SHOE_LIFE_KM) * 100));

  const pointsByBucket: Record<string, MapPoint[]> = {};
  const routesByBucket: Record<string, SportRoute[]> = {};
  for (const a of yearActivities) {
    const bucketId = bucketForSport(sportOf(a)).id;
    if (!MAP_BUCKET_IDS.has(bucketId)) continue;

    const pt = toMapPoint(a);
    if (pt) (pointsByBucket[bucketId] ??= []).push(pt);

    const route = toSportRoute(a);
    if (route) (routesByBucket[bucketId] ??= []).push(route);
  }

  const regionsByBucket: Record<string, MapRegion[]> = {};
  for (const bucketId of new Set([...Object.keys(pointsByBucket), ...Object.keys(routesByBucket)])) {
    regionsByBucket[bucketId] = buildRegions(
      pointsByBucket[bucketId] ?? [],
      routesByBucket[bucketId] ?? [],
    );
  }

  return {
    summary: {
      activities: yearActivities.length,
      runDistanceKm: Number(metresToKm(runDistance).toFixed(1)),
      runs: runs.length,
      rides: rides.length,
      hikes: hikes.length,
      dateRange: dateRangeLabel(yearActivities),
    },
    heatmap,
    activityLog,
    running: {
      furthest: furthest(runs),
      distancePbs: distancePbs(yearEffortSources),
      totalTime: {
        value: formatDurationLong(runTime),
        sub: `Across ${runs.length} runs · ${formatKm(runDistance, 1)} total`,
      },
      shoeWear: {
        loggedKm,
        lifeKm: SHOE_LIFE_KM,
        percent: shoePercent,
      },
    },
    groups: buildGroupStats(runs),
    pointsByBucket,
    routesByBucket,
    regionsByBucket,
    cycling: {
      furthest: furthest(rides),
      longestTime: longestTime(rides),
      totalTime: {
        value: formatDurationLong(rideTime),
        sub: `Across ${rides.length} rides`,
      },
      totalDistance: {
        value: formatKm(rideDistance, 1),
        sub: `${rides.length} rides logged`,
      },
    },
    hiking: {
      highestElevation: highestElevation(hikes),
      favouriteLocation: favouriteHikeLocation(hikes),
      furthest: furthest(hikes),
      totalTime: {
        value: formatDurationLong(hikeTime),
        sub: `Across ${hikes.length} hikes`,
      },
      totalDistance: {
        value: formatKm(hikeDistance, 1),
        sub: `${hikes.length} hikes logged`,
      },
    },
  };
}

/** Assemble the full dashboard payload from already-built per-year bundles.
 * `allActivities` (full history, every year) is only used for the "this week"
 * compliance check, which isn't year-scoped. */
export function buildDashboard(
  athlete: StravaAthlete,
  allActivities: StravaActivitySummary[],
  years: Record<string, YearBundle>,
  availableYears: number[],
  currentYear: number,
  plan: GeneratedPlan | null,
  now: Date = new Date(),
): DashboardData {
  const locationParts = [athlete.city, athlete.country].filter(Boolean);
  const name = `${athlete.firstname} ${athlete.lastname}`.trim();
  const initials =
    `${athlete.firstname?.[0] ?? ''}${athlete.lastname?.[0] ?? ''}`.toUpperCase() ||
    'BM';

  const allTime = years.all;
  const longestRunKm = allTime
    ? allTime.activityLog
        .filter((a) => bucketForSport(a.type).id === 'run')
        .reduce((max, a) => Math.max(max, a.distanceKm), 0)
    : 0;
  const analysis = buildAnalysisBlurb(allTime?.running.distancePbs ?? [], longestRunKm);

  return {
    generatedAt: now.toISOString(),
    athlete: {
      name: name || 'Athlete',
      location: locationParts.length ? locationParts.join(', ') : '—',
      initials,
    },
    compliance: computeWeeklyCompliance(allActivities, plan, now),
    analysis,
    years,
    availableYears,
    currentYear,
  };
}
