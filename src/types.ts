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
  lat: number;
  lng: number;
  name: string;
  date: string;
}

export interface StatHighlight {
  value: string;
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

export interface DashboardData {
  generatedAt: string;
  athlete: {
    name: string;
    location: string;
    initials: string;
  };
  focus: {
    race: string;
    date: string;
    target: string;
  };
  summary: {
    activities: number;
    runDistanceKm: number;
    runs: number;
    rides: number;
    hikes: number;
    dateRange: string;
  };
  heatmap: HeatDay[];
  running: {
    furthest: StatHighlight;
    quickest5k: StatHighlight;
    quickest10k: StatHighlight;
    totalTime: StatHighlight;
    shoeWear: {
      loggedKm: number;
      lifeKm: number;
      percent: number;
    };
  };
  groups: GroupStats[];
  runPoints: MapPoint[];
  ridePoints: MapPoint[];
  hikePoints: MapPoint[];
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
  };
  compliance: WeeklyCompliance;
  analysis: string;
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
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}
