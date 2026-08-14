import {
  ANALYSIS_BLURB,
  RACE_DATE,
  RACE_NAME,
  RACE_TARGET,
  SHOE_LIFE_KM,
} from '../data/trainingPlan';
import { computeWeeklyCompliance } from './compliance';
import type {
  DashboardData,
  GroupStats,
  HeatDay,
  MapPoint,
  Sport,
  StatHighlight,
  StravaActivitySummary,
  StravaAthlete,
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

function formatDurationLong(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
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
    lat,
    lng,
    name: a.name,
    date: a.start_date_local.slice(0, 10),
  };
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

function best5k(runs: StravaActivitySummary[]): StatHighlight {
  // ~5k ± 8%
  const candidates = runs.filter((a) => {
    const k = metresToKm(a.distance);
    return k >= 4.6 && k <= 5.4;
  });
  if (!candidates.length) {
    return { value: '—', sub: 'No 5k-distance runs logged' };
  }
  const best = candidates.reduce((a, b) =>
    a.average_speed >= b.average_speed ? a : b,
  );
  return {
    value: `${pacePerKm(best.average_speed)} /km`,
    sub: `${best.name} · ${formatDuration(best.moving_time)} · ${formatShortDate(best.start_date_local)}`,
  };
}

function best10k(runs: StravaActivitySummary[]): StatHighlight {
  const candidates = runs.filter((a) => {
    const k = metresToKm(a.distance);
    return k >= 9.4 && k <= 10.6;
  });
  if (!candidates.length) {
    return { value: '—', sub: 'No 10k-distance runs logged' };
  }
  const best = candidates.reduce((a, b) =>
    a.average_speed >= b.average_speed ? a : b,
  );
  return {
    value: `${pacePerKm(best.average_speed)} /km`,
    sub: `${best.name} · ${formatDuration(best.moving_time)} · ${formatShortDate(best.start_date_local)}`,
  };
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

function dateRangeLabel(activities: StravaActivitySummary[]): string {
  if (!activities.length) return 'No activities';
  const dates = activities.map((a) => a.start_date_local.slice(0, 10)).sort();
  const first = formatShortDate(dates[0]);
  const last = formatShortDate(dates[dates.length - 1]);
  return `${first} – ${last}`;
}

export function buildDashboard(
  athlete: StravaAthlete,
  activities: StravaActivitySummary[],
  now: Date = new Date(),
): DashboardData {
  const runs = activities.filter(isRun);
  const rides = activities.filter(isRide);
  const hikes = activities.filter(isHike);

  const runDistance = runs.reduce((s, a) => s + a.distance, 0);
  const runTime = runs.reduce((s, a) => s + a.moving_time, 0);
  const rideDistance = rides.reduce((s, a) => s + a.distance, 0);
  const rideTime = rides.reduce((s, a) => s + a.moving_time, 0);
  const hikeTime = hikes.reduce((s, a) => s + a.moving_time, 0);

  const heatmap: HeatDay[] = activities.map((a) => ({
    date: a.start_date_local.slice(0, 10),
    sport: sportOf(a),
  }));

  const loggedKm = Number(metresToKm(runDistance).toFixed(1));
  const shoePercent = Math.min(100, Math.round((loggedKm / SHOE_LIFE_KM) * 100));

  const locationParts = [athlete.city, athlete.country].filter(Boolean);
  const name = `${athlete.firstname} ${athlete.lastname}`.trim();
  const initials =
    `${athlete.firstname?.[0] ?? ''}${athlete.lastname?.[0] ?? ''}`.toUpperCase() ||
    'BM';

  return {
    generatedAt: now.toISOString(),
    athlete: {
      name: name || 'Athlete',
      location: locationParts.length ? locationParts.join(', ') : '—',
      initials,
    },
    focus: {
      race: RACE_NAME,
      date: RACE_DATE,
      target: RACE_TARGET,
    },
    summary: {
      activities: activities.length,
      runDistanceKm: Number(metresToKm(runDistance).toFixed(1)),
      runs: runs.length,
      rides: rides.length,
      hikes: hikes.length,
      dateRange: dateRangeLabel(activities),
    },
    heatmap,
    running: {
      furthest: furthest(runs),
      quickest5k: best5k(runs),
      quickest10k: best10k(runs),
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
    runPoints: runs.map(toMapPoint).filter((p): p is MapPoint => p !== null),
    ridePoints: rides.map(toMapPoint).filter((p): p is MapPoint => p !== null),
    hikePoints: hikes.map(toMapPoint).filter((p): p is MapPoint => p !== null),
    cycling: {
      furthest: furthest(rides),
      longestTime: longestTime(rides),
      totalTime: {
        value: formatDurationLong(rideTime),
        sub: `Across ${rides.length} rides this year`,
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
        sub: `Across ${hikes.length} hikes this year`,
      },
    },
    compliance: computeWeeklyCompliance(activities, now),
    analysis: ANALYSIS_BLURB,
  };
}
