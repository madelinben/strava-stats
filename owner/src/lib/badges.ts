import type { ActivityLite, TrackedEvent } from '../types';
import { matchActivities } from './events';
import { letterStatuses, type ParkrunEvent, type ParkrunVisit } from './parkrun';
import { bucketForSport } from './sports';

export interface Badge {
  id: string;
  label: string;
  description: string;
  color: string;
  unlocked: boolean;
  /** Shown on an unlocked badge, e.g. "28 Jun 2026" or "247 activities". */
  earnedNote?: string;
}

const ACTIVITY_TIERS = [50, 100, 250, 500, 1000];
const RUN_DISTANCE_TIERS_KM = [100, 500, 1000, 2000];
/** parkrun's own "N Club" milestones — total parkruns completed, any location. */
const PARKRUN_RUN_TIERS = [10, 25, 50, 100, 250];
/** Unofficial "tourist" challenge — different parkrun locations visited. */
const PARKRUN_TOURIST_TIERS = [5, 10, 25, 50];

function formatEventDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** All badges, computed from full (all-year) activity history — a badge stays
 * unlocked forever once its underlying fact exists in the synced history. */
export function computeBadges(
  activityLog: ActivityLite[],
  events: TrackedEvent[],
  parkrun: { events: ParkrunEvent[]; visits: ParkrunVisit[] } | null,
): Badge[] {
  const badges: Badge[] = [];

  const totalActivities = activityLog.length;
  for (const tier of ACTIVITY_TIERS) {
    badges.push({
      id: `activities-${tier}`,
      label: `${tier} activities`,
      description: `Log ${tier} activities`,
      color: 'var(--run)',
      unlocked: totalActivities >= tier,
      earnedNote: totalActivities >= tier ? `${totalActivities} logged` : undefined,
    });
  }

  const runDistanceKm = activityLog
    .filter((a) => bucketForSport(a.type).id === 'run')
    .reduce((s, a) => s + a.distanceKm, 0);
  for (const tier of RUN_DISTANCE_TIERS_KM) {
    badges.push({
      id: `run-distance-${tier}`,
      label: `${tier} km run`,
      description: `Run a total of ${tier} km`,
      color: 'var(--run)',
      unlocked: runDistanceKm >= tier,
      earnedNote: runDistanceKm >= tier ? `${Math.round(runDistanceKm)} km total` : undefined,
    });
  }

  const sportsLogged = new Set(activityLog.map((a) => bucketForSport(a.type).id));
  const varietyTiers = [3, 5, 7];
  for (const tier of varietyTiers) {
    badges.push({
      id: `variety-${tier}`,
      label: `${tier} sports`,
      description: `Log activity in ${tier} different sports`,
      color: 'var(--padel)',
      unlocked: sportsLogged.size >= tier,
      earnedNote: sportsLogged.size >= tier ? `${sportsLogged.size} sports logged` : undefined,
    });
  }

  for (const event of events.filter((e) => e.isMilestone)) {
    const completed = matchActivities(event, activityLog);
    badges.push({
      id: `milestone-${event.id}`,
      label: event.title,
      description: `Complete ${event.title}`,
      color: 'var(--hike)',
      unlocked: !!completed,
      earnedNote: completed ? formatEventDate(event.date) : undefined,
    });
  }

  const alphabeteerComplete = parkrun
    ? Object.values(letterStatuses(parkrun.events, parkrun.visits)).every((s) => s !== 'todo')
    : false;
  badges.push({
    id: 'alphabeteer',
    label: 'Parkrun Alphabeteer',
    description: 'Run a parkrun starting with every letter A–Z',
    color: 'var(--walk)',
    unlocked: alphabeteerComplete,
  });

  const parkrunCount = parkrun?.visits.length ?? 0;
  for (const tier of PARKRUN_RUN_TIERS) {
    badges.push({
      id: `parkrun-runs-${tier}`,
      label: `${tier} parkruns`,
      description: `Complete ${tier} parkruns (any location)`,
      color: 'var(--walk)',
      unlocked: parkrunCount >= tier,
      earnedNote: parkrunCount >= tier ? `${parkrunCount} completed` : undefined,
    });
  }

  const parkrunLocations = parkrun ? new Set(parkrun.visits.map((v) => v.event.slug)).size : 0;
  for (const tier of PARKRUN_TOURIST_TIERS) {
    badges.push({
      id: `parkrun-tourist-${tier}`,
      label: `${tier} parkrun locations`,
      description: `Run ${tier} different parkrun locations`,
      color: 'var(--walk)',
      unlocked: parkrunLocations >= tier,
      earnedNote: parkrunLocations >= tier ? `${parkrunLocations} locations` : undefined,
    });
  }

  return badges;
}
