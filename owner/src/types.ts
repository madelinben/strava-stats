export type Sport =
  | 'Run'
  | 'Ride'
  | 'Walk'
  | 'Hike'
  | 'Rowing'
  | 'Soccer'
  | string;

export interface HeatDay {
  date: string;
  sport: Sport;
}

export interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  name: string;
  date: string;
}

/** One activity's route, encoded — decoded client-side only when the Route
 * Heatmap panel is actually viewed (keeps dashboard.json smaller). */
export interface SportRoute {
  id: number;
  date: string;
  /** Google/Strava-encoded polyline, precision 5. */
  polyline: string;
}

/** A geographic cluster of activities within one sport bucket — e.g. "Chester"
 * vs. a one-off trip to "South Downs". Selecting one filters a map/heatmap
 * down to just its activityIds. `label` is reverse-geocoded at sync time. */
export interface MapRegion {
  id: string;
  label: string;
  center: { lat: number; lng: number };
  bounds: { south: number; west: number; north: number; east: number };
  activityIds: number[];
  count: number;
}

export interface StatHighlight {
  value: string;
  sub: string;
}

/** Slim per-activity record used to correlate tracked events with Strava activities. */
export interface ActivityLite {
  id: number;
  name: string;
  type: Sport;
  date: string;
  distanceKm: number;
  movingTime: string;
  movingTimeSec: number;
  pace: string;
}

/** User-tracked upcoming/past event (races, park runs, etc.) — stored client-side. */
export interface TrackedEvent {
  id: string;
  title: string;
  distanceKm: number;
  activityType: Sport;
  date: string;
  link?: string;
  /** Starred as a goal race/target — future input for an adaptive training plan. */
  isMilestone?: boolean;
  /** Public event/og image — shown as the card background (blurred for upcoming, greyed for past). */
  imageUrl?: string;
  /** Free text: charity/donation info, deliverable breakdown, etc. */
  description?: string;
  /** Goal finish time for a milestone, e.g. "2:15:00" or "24:30" — feeds the adaptive training plan's pace targets. */
  targetTime?: string;
  /** Official chip time from the race's own timing system — takes priority over
   * the Strava-derived time, which is GPS moving time only (excludes stops,
   * transitions, waiting for teammates, etc). */
  officialTime?: string;
  /** Link to the official results lookup (e.g. resultsbase.net, SportIdent). */
  officialResultsUrl?: string;
}

/** Best effort at a standard race distance — time highlighted, pace secondary. */
export interface DistanceEffort {
  id: string;
  label: string;
  /** Finish time, e.g. 24:57 or 1:57:10 */
  value: string;
  /** Average pace, e.g. 4:57 /km */
  pace: string;
  sub: string;
}

export interface GroupStats {
  id: string;
  name: string;
  schedule: string;
  runs: number;
  totalDistanceKm: number;
  avgDistanceKm: number;
  avgPacePerKm: string;
  fastestPacePerKm: string;
  totalElevationM: number;
  lastRun: string | null;
}

export type ComplianceStatus = 'met' | 'partial' | 'missed' | 'pending';

export interface ComplianceRule {
  id: string;
  label: string;
  expected: string;
  actual: string;
  status: ComplianceStatus;
}

export interface WeeklyCompliance {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  phaseName: string;
  rules: ComplianceRule[];
}

export interface TrainingPhase {
  id: string;
  name: string;
  weeks: string;
  dates: string;
  color: string;
  rows: { type: 'easy' | 'interval' | 'long' | 'rest'; details: string }[];
}

export interface LongRunMilestone {
  week: number | 'race';
  date: string;
  distance: string;
}

/** Everything that's scoped to a single calendar year of activity. */
export interface YearBundle {
  summary: {
    activities: number;
    runDistanceKm: number;
    runs: number;
    rides: number;
    hikes: number;
    dateRange: string;
  };
  heatmap: HeatDay[];
  activityLog: ActivityLite[];
  running: {
    furthest: StatHighlight;
    distancePbs: DistanceEffort[];
    totalTime: StatHighlight;
    shoeWear: {
      loggedKm: number;
      lifeKm: number;
      percent: number;
    };
  };
  groups: GroupStats[];
  /** Starting locations, keyed by sport-bucket id (see lib/sports.ts) — only
   * sports with a map (MAP_BUCKET_IDS) get an entry; sports with no Strava
   * GPS (Padel/Soccer) never populate one. */
  pointsByBucket: Record<string, MapPoint[]>;
  /** Full GPS routes, keyed by sport-bucket id — only sports with a map
   * (run/ride/hike/walk/rowing) get entries; feeds the Route Heatmap panel. */
  routesByBucket: Record<string, SportRoute[]>;
  /** Geo-clustered regions per sport bucket, busiest first — feeds the region
   * carousel under each map/heatmap. */
  regionsByBucket: Record<string, MapRegion[]>;
  cycling: {
    furthest: StatHighlight;
    longestTime: StatHighlight;
    totalTime: StatHighlight;
    totalDistance: StatHighlight;
  };
  hiking: {
    highestElevation: StatHighlight;
    favouriteLocation: StatHighlight;
    furthest: StatHighlight;
    totalTime: StatHighlight;
    totalDistance: StatHighlight;
  };
}

export interface DashboardData {
  generatedAt: string;
  athlete: {
    name: string;
    location: string;
    initials: string;
  };
  /** Not year-scoped — always "this calendar week", regardless of the browsed year. */
  compliance: WeeklyCompliance;
  analysis: string;
  /** Keyed by calendar year, e.g. "2026". */
  years: Record<string, YearBundle>;
  /** Ascending, from the athlete's first-ever logged activity through the current year. */
  availableYears: number[];
  currentYear: number;
}

/** Minimal Strava activity summary fields we use from the list endpoint. */
export interface StravaActivitySummary {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  start_latlng: [number, number] | null;
  average_speed: number;
  max_speed: number;
  workout_type?: number | null;
  map?: { summary_polyline?: string | null };
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

/** One Strava best-effort segment from a detailed activity. */
export interface StravaBestEffort {
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
}

/** Activity + its Strava best_efforts (from GET /activities/{id}). */
export interface ActivityEffortSource {
  id: number;
  name: string;
  start_date_local: string;
  best_efforts: StravaBestEffort[];
}
