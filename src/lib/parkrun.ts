import { distanceKm, type LatLng } from './geo';
export { distanceKm } from './geo';
export type { LatLng } from './geo';

export interface ParkrunEvent {
  name: string;
  slug: string;
  letter: string;
  lat: number;
  lng: number;
  location: string;
  country: string;
  url: string;
}

export interface ParkrunsData {
  updatedAt: string;
  region: string;
  source: string;
  notes?: string;
  events: ParkrunEvent[];
}

export interface ParkrunVisit {
  activityName: string;
  date: string;
  event: ParkrunEvent;
  matchKm: number;
}

/** Green / red / yellow for Alphabeteer letter buttons. */
export type LetterStatus = 'done' | 'todo' | 'abroad';

/** Chester city centre — free offline fallback when geolocation is denied. */
export const DEFAULT_LOCATION: LatLng = {
  lat: 53.1934,
  lng: -2.891,
};

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Max distance from Strava start pin to count as that parkrun event. */
export const PARKRUN_MATCH_KM = 1.5;

const PARKRUN_TITLE = /parkrun/i;

export function nearestForLetter(
  events: ParkrunEvent[],
  letter: string,
  origin: LatLng,
  limit = 3,
): Array<ParkrunEvent & { distanceKm: number }> {
  const upper = letter.toUpperCase();
  return events
    .filter((e) => e.letter === upper)
    .map((e) => ({ ...e, distanceKm: distanceKm(origin, e) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function formatDistance(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`;
  if (km < 100) return `${Math.round(km)} km`;
  return `${Math.round(km).toLocaleString('en-GB')} km`;
}

function isDomestic(event: ParkrunEvent): boolean {
  return event.country === 'UK' || event.country === 'IE';
}

/**
 * Match Strava activities titled with "Parkrun" to events.
 * Titles are often "Parkrun 19" with no event name — use start lat/lng.
 * Also accept titles that contain the event short name (e.g. "Chester parkrun").
 */
export function matchParkrunVisits(
  activities: Array<{ name: string; date: string; lat: number; lng: number }>,
  events: ParkrunEvent[],
  maxKm = PARKRUN_MATCH_KM,
): ParkrunVisit[] {
  const parkrunRuns = activities.filter((a) => PARKRUN_TITLE.test(a.name));
  const visits: ParkrunVisit[] = [];

  for (const run of parkrunRuns) {
    const nameLower = run.name.toLowerCase();

    const named = events.find((e) => {
      const short = e.name.toLowerCase();
      return (
        nameLower.includes(short) ||
        nameLower.includes(e.slug.replace(/-/g, ' '))
      );
    });
    if (named) {
      visits.push({
        activityName: run.name,
        date: run.date,
        event: named,
        matchKm: distanceKm(run, named),
      });
      continue;
    }

    let best: ParkrunEvent | null = null;
    let bestKm = Infinity;
    for (const e of events) {
      const km = distanceKm(run, e);
      if (km < bestKm) {
        bestKm = km;
        best = e;
      }
    }
    if (best && bestKm <= maxKm) {
      visits.push({
        activityName: run.name,
        date: run.date,
        event: best,
        matchKm: bestKm,
      });
    }
  }

  return visits;
}

export function letterStatuses(
  events: ParkrunEvent[],
  visits: ParkrunVisit[],
): Record<string, LetterStatus> {
  const done = new Set(visits.map((v) => v.event.letter));
  const byLetter = new Map<string, ParkrunEvent[]>();
  for (const e of events) {
    const list = byLetter.get(e.letter) ?? [];
    list.push(e);
    byLetter.set(e.letter, list);
  }

  const statuses: Record<string, LetterStatus> = {};
  for (const letter of LETTERS) {
    if (done.has(letter)) {
      statuses[letter] = 'done';
      continue;
    }
    const list = byLetter.get(letter) ?? [];
    if (list.length === 0 || !list.some(isDomestic)) {
      statuses[letter] = 'abroad';
    } else {
      statuses[letter] = 'todo';
    }
  }
  return statuses;
}

export function visitsForLetter(
  visits: ParkrunVisit[],
  letter: string,
): ParkrunVisit[] {
  const upper = letter.toUpperCase();
  const seen = new Set<string>();
  const out: ParkrunVisit[] = [];
  // Alphabeteer credits first occurrence: oldest first, keep earliest visit per event.
  const sorted = [...visits].sort((a, b) => a.date.localeCompare(b.date));
  for (const v of sorted) {
    if (v.event.letter !== upper) continue;
    if (seen.has(v.event.slug)) continue;
    seen.add(v.event.slug);
    out.push(v);
  }
  return out;
}
