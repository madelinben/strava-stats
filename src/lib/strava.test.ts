import assert from "node:assert/strict";
import { test } from "node:test";
import { hours, pace } from "./format.ts";
import { decodePolyline } from "./polyline.ts";
import { type Activity, authorizeUrl, ensureFresh, type Session } from "./strava.ts";
import { bucketOf, longestStreak, summarise, weekStart, yearsOf } from "./summary.ts";

const act = (id: number, date: string, o: Partial<Activity> = {}): Activity => ({
  id,
  name: `a${id}`,
  type: "Run",
  distance: 5000,
  moving_time: 1800,
  elapsed_time: 1900,
  total_elevation_gain: 20,
  start_date_local: `${date}T08:00:00Z`,
  average_speed: 2.7,
  ...o,
});

test("bucketOf maps sport types, unknown becomes other", () => {
  assert.equal(bucketOf({ type: "Run", sport_type: "TrailRun" }), "run");
  assert.equal(bucketOf({ type: "Ride" }), "ride");
  assert.equal(bucketOf({ type: "Yoga" }), "other");
});

test("weekStart is the Monday of that week", () => {
  assert.equal(weekStart("2026-10-14"), "2026-10-12"); // Wednesday
  assert.equal(weekStart("2026-10-18"), "2026-10-12"); // Sunday
});

test("longestStreak counts consecutive days, ignoring duplicates", () => {
  assert.equal(
    longestStreak(["2026-01-01", "2026-01-02", "2026-01-02", "2026-01-03", "2026-01-10"]),
    3
  );
  assert.equal(longestStreak([]), 0);
});

test("summarise: year scope, buckets, longest, climb, weekly bars", () => {
  const all = [
    act(1, "2025-12-31", { distance: 40_000 }),
    act(2, "2026-10-12", { distance: 10_000, total_elevation_gain: 300 }),
    act(3, "2026-10-13", { type: "Ride", distance: 30_000, total_elevation_gain: 100 }),
  ];
  const s = summarise(all, 2026, "2026-10-14");
  assert.equal(s.totals.count, 2);
  assert.equal(s.byBucket.run.count, 1);
  assert.equal(s.byBucket.ride.distanceM, 30_000);
  assert.equal(s.longest?.id, 3);
  assert.equal(s.biggestClimb?.id, 2);
  assert.equal(s.streakDays, 2);
  assert.equal(s.weekly.length, 12);
  assert.equal(s.weekly[11].km, 40); // this week: 10 + 30 km
  assert.equal(summarise(all, "all", "2026-10-14").totals.count, 3);
  assert.deepEqual(yearsOf(all), [2026, 2025]);
});

test("decodePolyline reads Google's reference example", () => {
  assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ]);
});

test("format helpers", () => {
  assert.equal(pace(1000 / 330), "5:30 /km");
  assert.equal(hours(3725), "1h 02m");
});

test("authorizeUrl carries scope, redirect and state", () => {
  const u = new URL(authorizeUrl("123", "https://x.test/tools/strava", "st"));
  assert.equal(u.searchParams.get("client_id"), "123");
  assert.equal(u.searchParams.get("state"), "st");
  assert.match(u.searchParams.get("scope") ?? "", /activity:read_all/);
});

test("ensureFresh returns a still-valid session untouched (no network)", async () => {
  const s: Session = {
    clientId: "1",
    clientSecret: "s",
    accessToken: "a",
    refreshToken: "r",
    expiresAt: 10_000,
    athleteName: "A",
  };
  assert.equal(await ensureFresh(s, 1000), s);
});
