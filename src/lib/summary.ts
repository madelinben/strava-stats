import type { Activity } from "./strava";

export type Bucket = "run" | "ride" | "walk" | "hike" | "other";
export const BUCKETS: Bucket[] = ["run", "ride", "walk", "hike", "other"];

const BUCKET_OF: Record<string, Bucket> = {
  Run: "run",
  TrailRun: "run",
  VirtualRun: "run",
  Ride: "ride",
  GravelRide: "ride",
  MountainBikeRide: "ride",
  EBikeRide: "ride",
  VirtualRide: "ride",
  Walk: "walk",
  Hike: "hike",
};

export const bucketOf = (a: Pick<Activity, "type" | "sport_type">): Bucket =>
  BUCKET_OF[a.sport_type ?? a.type] ?? "other";

export type Totals = { count: number; distanceM: number; movingS: number; elevM: number };
const zero = (): Totals => ({ count: 0, distanceM: 0, movingS: 0, elevM: 0 });
const add = (t: Totals, a: Activity): Totals => ({
  count: t.count + 1,
  distanceM: t.distanceM + a.distance,
  movingS: t.movingS + a.moving_time,
  elevM: t.elevM + a.total_elevation_gain,
});

const day = (a: Activity) => a.start_date_local.slice(0, 10);
const year = (a: Activity) => Number(a.start_date_local.slice(0, 4));

/** Monday (YYYY-MM-DD) of the week containing `date` (YYYY-MM-DD). */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Longest run of consecutive calendar days with at least one activity. */
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let cur = 0;
  sorted.forEach((d, i) => {
    cur = i > 0 && addDays(sorted[i - 1], 1) === d ? cur + 1 : 1;
    best = Math.max(best, cur);
  });
  return best;
}

export type Summary = {
  totals: Totals;
  byBucket: Record<Bucket, Totals>;
  /** date → km that day */
  heat: Record<string, number>;
  /** last 12 weeks ending at `today`, oldest first */
  weekly: { weekStart: string; km: number }[];
  longest: Activity | null;
  biggestClimb: Activity | null;
  streakDays: number;
};

/** `scope` is a calendar year or "all". Pure: pass `today` for deterministic weekly bars. */
export function summarise(all: Activity[], scope: number | "all", today: string): Summary {
  const list = scope === "all" ? all : all.filter((a) => year(a) === scope);
  const byBucket = Object.fromEntries(BUCKETS.map((b) => [b, zero()])) as Record<Bucket, Totals>;
  const heat: Record<string, number> = {};
  let totals = zero();
  for (const a of list) {
    totals = add(totals, a);
    byBucket[bucketOf(a)] = add(byBucket[bucketOf(a)], a);
    heat[day(a)] = (heat[day(a)] ?? 0) + a.distance / 1000;
  }

  const thisWeek = weekStart(today);
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const start = addDays(thisWeek, (i - 11) * 7);
    return { weekStart: start, km: 0 };
  });
  for (const a of all) {
    const w = weekly.find((x) => x.weekStart === weekStart(day(a)));
    if (w) w.km += a.distance / 1000;
  }

  const best = (key: (a: Activity) => number) =>
    list.reduce<Activity | null>((m, a) => (!m || key(a) > key(m) ? a : m), null);
  return {
    totals,
    byBucket,
    heat,
    weekly,
    longest: best((a) => a.distance),
    biggestClimb: best((a) => a.total_elevation_gain),
    streakDays: longestStreak(list.map(day)),
  };
}

export const yearsOf = (all: Activity[]): number[] =>
  [...new Set(all.map(year))].sort((a, b) => b - a);
