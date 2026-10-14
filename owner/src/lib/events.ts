import type { ActivityLite, MapRegion, Sport, TrackedEvent } from '../types';
import { bucketForSport } from './sports';

/** CSS color for a sport, matching the heatmap legend and sport tabs. */
export function sportColorVar(type: Sport): string {
  return bucketForSport(type).color;
}

export interface MatchedActivities {
  activities: ActivityLite[];
  totalDistanceKm: number;
  totalTimeSec: number;
  /** Only set when there's exactly one matched activity — combining pace across
   * different sports (e.g. a triathlon's hike/cycle/canoe legs) isn't meaningful. */
  pace?: string;
  /** Strava activity to link to — the first matched leg. */
  primaryId: number;
}

/**
 * Match a tracked event to its logged Strava activity/activities.
 * Same date + same type first; if nothing shares the event's type, falls back
 * to *every* activity logged that day (multi-activity events — a triathlon
 * logged as separate hike/ride/canoe activities — get summed rather than one
 * arbitrary leg standing in for the whole event).
 */
export function matchActivities(
  event: TrackedEvent,
  log: ActivityLite[],
): MatchedActivities | undefined {
  const sameDate = log.filter((a) => a.date === event.date);
  let matched = sameDate.filter((a) => a.type === event.activityType);
  if (matched.length === 0) {
    matched =
      sameDate.length > 0
        ? sameDate
        : log.filter(
            (a) =>
              a.type === event.activityType &&
              a.name.toLowerCase().includes(event.title.toLowerCase()),
          );
  }
  if (matched.length === 0) return undefined;

  return {
    activities: matched,
    totalDistanceKm: Number(matched.reduce((s, a) => s + a.distanceKm, 0).toFixed(2)),
    totalTimeSec: matched.reduce((s, a) => s + a.movingTimeSec, 0),
    pace: matched.length === 1 ? matched[0].pace : undefined,
    primaryId: matched[0].id,
  };
}

/** Every Strava activity id that's a matched leg of a tracked event whose own
 * bucket is `bucketId` — e.g. every hike/ride/canoe logged for a Triathlon
 * milestone. Powers the virtual tab for sports with no native Strava activity
 * type (Strava has no "Triathlon" activity type). */
export function matchedActivityIds(
  bucketId: string,
  events: TrackedEvent[],
  log: ActivityLite[],
): Set<number> {
  const ids = new Set<number>();
  for (const event of events) {
    if (bucketForSport(event.activityType).id !== bucketId) continue;
    const matched = matchActivities(event, log);
    matched?.activities.forEach((a) => ids.add(a.id));
  }
  return ids;
}

/**
 * "Regions" for a virtual bucket (Triathlon) with no server-computed
 * geo-clustering — one per tracked event, labelled with the event's own
 * title rather than reverse-geocoded (no reason to call an external
 * geocoder from every visitor's browser for data we already have a name
 * for). `center`/`bounds` are unused — region filtering works by
 * activityIds, and the map re-fits to whatever points/routes remain.
 */
export function eventRegions(
  bucketId: string,
  events: TrackedEvent[],
  log: ActivityLite[],
): MapRegion[] {
  const regions: MapRegion[] = [];
  for (const event of events) {
    if (bucketForSport(event.activityType).id !== bucketId) continue;
    const matched = matchActivities(event, log);
    if (!matched) continue;
    regions.push({
      id: event.id,
      label: event.title,
      center: { lat: 0, lng: 0 },
      bounds: { south: 0, west: 0, north: 0, east: 0 },
      activityIds: matched.activities.map((a) => a.id),
      count: matched.activities.length,
    });
  }
  return regions;
}

export interface SortedEvents {
  upcoming: TrackedEvent[];
  past: TrackedEvent[];
}

/** Upcoming events soonest-first, past events pushed to the end, most recent first. */
export function sortEvents(events: TrackedEvent[], today = new Date()): SortedEvents {
  const todayIso = today.toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => e.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = events
    .filter((e) => e.date < todayIso)
    .sort((a, b) => b.date.localeCompare(a.date));
  return { upcoming, past };
}
