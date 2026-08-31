import type { ActivityLite, MapPoint, MapRegion, Sport, SportRoute, TrackedEvent } from '../types';
import { formatDurationLong } from './format';

/** Bucket ids a multi-sport event's legs can land in — used to gather a
 * virtual bucket's (e.g. Triathlon) points/routes from wherever its matched
 * legs actually live. */
const LEG_BUCKET_IDS = ['run', 'ride', 'hike', 'walk', 'rowing'];

export function pointsForIds(
  pointsByBucket: Record<string, MapPoint[]>,
  ids: Set<number>,
): MapPoint[] {
  return LEG_BUCKET_IDS.flatMap((b) => (pointsByBucket[b] ?? []).filter((p) => ids.has(p.id)));
}

export function routesForIds(
  routesByBucket: Record<string, SportRoute[]>,
  ids: Set<number>,
): SportRoute[] {
  return LEG_BUCKET_IDS.flatMap((b) => (routesByBucket[b] ?? []).filter((r) => ids.has(r.id)));
}

/** Filter points/routes down to one selected region — `null` (no region
 * selected) passes everything through unfiltered. */
export function filterByRegion<T extends { id: number }>(
  items: T[],
  region: MapRegion | null,
): T[] {
  if (!region) return items;
  const ids = new Set(region.activityIds);
  return items.filter((item) => ids.has(item.id));
}

export interface SportBucket {
  id: string;
  label: string;
  color: string;
  match: (type: Sport) => boolean;
}

/** Sports with a dedicated tab. Order here doesn't matter — tabs are sorted by
 * activity count at render time. Add a row here when a new Strava sport_type
 * should get its own colour instead of falling into "Other". */
export const SPORT_BUCKETS: SportBucket[] = [
  {
    id: 'run',
    label: 'Running',
    color: 'var(--run)',
    match: (t) => t === 'Run' || t === 'TrailRun' || t === 'VirtualRun',
  },
  {
    id: 'ride',
    label: 'Cycling',
    color: 'var(--ride)',
    match: (t) => t === 'Ride' || t === 'VirtualRide' || t === 'EBikeRide' || t === 'GravelRide',
  },
  { id: 'hike', label: 'Hiking', color: 'var(--hike)', match: (t) => t === 'Hike' },
  { id: 'walk', label: 'Walking', color: 'var(--walk)', match: (t) => t === 'Walk' },
  { id: 'padel', label: 'Padel', color: 'var(--padel)', match: (t) => t === 'Padel' },
  { id: 'soccer', label: 'Football', color: 'var(--soccer)', match: (t) => t === 'Soccer' },
  { id: 'rowing', label: 'Rowing', color: 'var(--row)', match: (t) => t === 'Rowing' },
  {
    id: 'triathlon',
    label: 'Triathlon',
    color: 'var(--triathlon)',
    // Strava has no native "Triathlon" activity type — this only ever matches
    // a tracked event tagged that way (a multi-sport event logged as several
    // separate Strava activities, e.g. hike + ride + canoe).
    match: (t) => t === 'Triathlon',
  },
];

/** Bucket ids that ever get a location map / route heatmap. Sports like
 * Padel/Soccer have no GPS on Strava (confirmed against real activities —
 * indoor/pitch play with no location fix) so there's nothing to plot. */
export const MAP_BUCKET_IDS = new Set([
  'run',
  'ride',
  'hike',
  'walk',
  'rowing',
  'triathlon',
]);

/** Which top-level tab a sport belongs to (bucket id), falling back to a
 * generic "Other" bucket coloured `--other` for anything not listed above. */
export function bucketForSport(type: Sport): SportBucket {
  const match = SPORT_BUCKETS.find((b) => b.match(type));
  if (match) return match;
  return { id: 'other', label: type, color: 'var(--other)', match: () => false };
}

export interface OrderedTab {
  id: string;
  label: string;
  color: string;
  count: number;
}

/** Tabs for whichever sports have logged activity, busiest first — plus a tab
 * (with 0 count, sorted last) for any sport a tracked event points at even if
 * nothing's been logged for it yet, e.g. a "Triathlon" milestone tagged before
 * any matching Strava activity exists. */
export function tabsFromActivityLog(log: ActivityLite[], events: TrackedEvent[] = []): OrderedTab[] {
  const counts = new Map<string, OrderedTab>();
  for (const a of log) {
    const bucket = bucketForSport(a.type);
    const existing = counts.get(bucket.id);
    if (existing) existing.count += 1;
    else counts.set(bucket.id, { id: bucket.id, label: bucket.label, color: bucket.color, count: 1 });
  }
  for (const e of events) {
    const bucket = bucketForSport(e.activityType);
    if (!counts.has(bucket.id)) {
      counts.set(bucket.id, { id: bucket.id, label: bucket.label, color: bucket.color, count: 0 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export interface SportAggregate {
  count: number;
  totalDistanceKm: number;
  totalTime: string;
  activities: ActivityLite[];
}

function toAggregate(activities: ActivityLite[]): SportAggregate {
  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date));
  const totalDistanceKm = Number(
    sorted.reduce((s, a) => s + a.distanceKm, 0).toFixed(2),
  );
  const totalSeconds = sorted.reduce((s, a) => s + a.movingTimeSec, 0);
  return {
    count: sorted.length,
    totalDistanceKm,
    totalTime: formatDurationLong(totalSeconds),
    activities: sorted,
  };
}

/** Simple aggregate stats for sports without a dedicated stats section
 * (running/cycling/hiking keep their richer built dashboard sections). */
export function aggregateSport(log: ActivityLite[], bucketId: string): SportAggregate {
  return toAggregate(log.filter((a) => bucketForSport(a.type).id === bucketId));
}

/** Aggregate stats for an explicit set of activity ids — used for buckets with
 * no native Strava activity type (e.g. Triathlon), where membership comes from
 * matching tracked events to same-day activities instead of a type match. */
export function aggregateByIds(log: ActivityLite[], ids: Set<number>): SportAggregate {
  return toAggregate(log.filter((a) => ids.has(a.id)));
}
