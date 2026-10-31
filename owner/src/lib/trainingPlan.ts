import type { LongRunMilestone, TrackedEvent, TrainingPhase } from '../types';
import { formatIsoDate, parseLocalDate, startOfMonday, weekNumberSince } from './dates';
import { formatPace, parseClockToSeconds } from './format';

/** Standard training-cycle length by race distance — a longer build-up for a
 * longer race, shorter for a 5k/10k. Tunable defaults, not user-configurable. */
function totalWeeksForDistance(km: number): number {
  if (km <= 5) return 10;
  if (km <= 10) return 12;
  if (km <= 21.1) return 16;
  return 20;
}

export interface PhaseRules {
  easyRunsMin: number;
  easyRunsMax: number;
  speedRequired: boolean;
  restDaysMin: number;
}

export interface PhaseBoundary extends PhaseRules {
  id: 'base' | 'build' | 'peak' | 'taper';
  name: string;
  startWeek: number;
  endWeek: number;
  color: string;
}

export interface GeneratedPlan {
  raceName: string;
  raceDate: string;
  /** "" when the milestone has no targetTime set. */
  raceTarget: string;
  /** "—" when no target time / distance to derive pace from. */
  racePacePerKm: string;
  raceDistanceKm: number;
  totalWeeks: number;
  planStartIso: string;
  phases: TrainingPhase[];
  phaseBoundaries: PhaseBoundary[];
  longRunMilestones: LongRunMilestone[];
  longRunKmByWeek: Record<number, number>;
}

/** Nearest future milestone Run event — the plan's target race. */
export function pickMilestone(events: TrackedEvent[], now: Date): TrackedEvent | undefined {
  const todayIso = formatIsoDate(now);
  return events
    .filter((e) => e.isMilestone && e.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

const PHASE_COLORS: Record<PhaseBoundary['id'], string> = {
  base: 'var(--run)',
  build: 'var(--ride)',
  peak: 'var(--hike)',
  taper: 'var(--walk)',
};

const PHASE_NAMES: Record<PhaseBoundary['id'], string> = {
  base: 'Phase 1 — Base',
  build: 'Phase 2 — Build',
  peak: 'Phase 3 — Peak',
  taper: 'Phase 4 — Taper',
};

function buildPhaseBoundaries(totalWeeks: number): PhaseBoundary[] {
  const taperWeeks = Math.max(3, Math.round(totalWeeks * 0.13));
  const baseWeeks = Math.max(2, Math.round(totalWeeks * 0.27));
  const buildWeeks = Math.max(2, Math.round(totalWeeks * 0.33));
  const peakWeeks = Math.max(1, totalWeeks - taperWeeks - baseWeeks - buildWeeks);

  let cursor = 1;
  const spans: { id: PhaseBoundary['id']; weeks: number }[] = [
    { id: 'base', weeks: baseWeeks },
    { id: 'build', weeks: buildWeeks },
    { id: 'peak', weeks: peakWeeks },
    { id: 'taper', weeks: taperWeeks },
  ];

  return spans.map(({ id, weeks }) => {
    const startWeek = cursor;
    const endWeek = cursor + weeks - 1;
    cursor = endWeek + 1;
    const rules: PhaseRules =
      id === 'base'
        ? { easyRunsMin: 2, easyRunsMax: 3, speedRequired: false, restDaysMin: 2 }
        : id === 'build'
          ? { easyRunsMin: 2, easyRunsMax: 2, speedRequired: true, restDaysMin: 1 }
          : id === 'peak'
            ? { easyRunsMin: 2, easyRunsMax: 2, speedRequired: true, restDaysMin: 1 }
            : { easyRunsMin: 2, easyRunsMax: 2, speedRequired: true, restDaysMin: 2 };
    return { id, name: PHASE_NAMES[id], startWeek, endWeek, color: PHASE_COLORS[id], ...rules };
  });
}

function buildLongRunProgression(
  totalWeeks: number,
  boundaries: PhaseBoundary[],
  startLongRunKm: number,
  raceDistanceKm: number,
): Record<number, number> {
  const taper = boundaries.find((b) => b.id === 'taper')!;
  const peakWeek = taper.startWeek - 1;
  // Aim just under race distance for anything half-marathon or shorter (you
  // race a bit further than your longest training run); a fraction of it for
  // longer races so the peak long run stays sane.
  const targetPeakKm =
    raceDistanceKm <= 21.1 ? raceDistanceKm * 0.95 : raceDistanceKm * 0.7;
  const peakKm = Math.max(startLongRunKm, targetPeakKm);

  const byWeek: Record<number, number> = {};
  for (let week = 1; week <= peakWeek; week++) {
    const t = peakWeek > 1 ? (week - 1) / (peakWeek - 1) : 1;
    byWeek[week] = Number((startLongRunKm + (peakKm - startLongRunKm) * t).toFixed(1));
  }
  // Taper: step back down, last week is rest before the race.
  const taperLen = totalWeeks - peakWeek;
  for (let i = 0; i < taperLen; i++) {
    const week = peakWeek + 1 + i;
    const fractionRemaining = 1 - (i + 1) / taperLen;
    byWeek[week] = i === taperLen - 1 ? 0 : Number((peakKm * Math.max(0.3, fractionRemaining)).toFixed(1));
  }
  return byWeek;
}

function longRunMilestoneTable(
  byWeek: Record<number, number>,
  planStartIso: string,
  totalWeeks: number,
  raceDate: string,
  raceDistanceKm: number,
  raceTarget: string,
): LongRunMilestone[] {
  const start = parseLocalDate(planStartIso);
  const sampleWeeks = [1, ...[4, 8, 12, 16, 20, 24].filter((w) => w > 1 && w < totalWeeks), totalWeeks].filter(
    (w, i, arr) => w >= 1 && w <= totalWeeks && arr.indexOf(w) === i,
  );
  const rows: LongRunMilestone[] = sampleWeeks.map((week) => {
    const d = new Date(start);
    d.setDate(d.getDate() + (week - 1) * 7);
    return {
      week,
      date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      distance: `${byWeek[week] ?? 0} km`,
    };
  });
  rows.push({
    week: 'race',
    date: new Date(parseLocalDate(raceDate)).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    distance: `${raceDistanceKm} km${raceTarget ? ` — goal ${raceTarget}` : ''}`,
  });
  return rows;
}

const PHASE_ROW_TEXT: Record<
  PhaseBoundary['id'],
  { easy: string; interval: string; long: string; rest: string }
> = {
  base: {
    easy: 'easy conversational runs to build the aerobic base',
    interval: 'short intervals once a week from week 3 onward — keep total interval volume low',
    long: 'building steadily week on week',
    rest: 'full rest or cross-training days',
  },
  build: {
    easy: 'easy runs, HR kept low',
    interval: 'tempo or interval sessions — alternate week to week',
    long: 'progressing, with race-pace finishes on some weeks',
    rest: 'rest day(s); light cross-training is fine otherwise',
  },
  peak: {
    easy: 'easy runs to stay fresh between the harder sessions',
    interval: 'race-specific speed work for late-race sharpness',
    long: 'peaking — biggest long runs of the block, some race-pace finishes',
    rest: 'rest day(s); prioritise sleep and recovery as volume peaks',
  },
  taper: {
    easy: 'short and easy to stay loose',
    interval: 'short and sharp only — stop 5 days out',
    long: 'stepping back down to fresh legs on race day',
    rest: 'extra rest in race week, including 2 full days before the race',
  },
};

function buildPhaseRows(boundary: PhaseBoundary): TrainingPhase['rows'] {
  const text = PHASE_ROW_TEXT[boundary.id];
  return [
    {
      type: 'easy',
      details: `${boundary.easyRunsMin}–${boundary.easyRunsMax} runs/week, ${text.easy}.`,
    },
    { type: 'interval', details: text.interval.charAt(0).toUpperCase() + text.interval.slice(1) + '.' },
    { type: 'long', details: `Weekly long run, ${text.long}.` },
    { type: 'rest', details: `${boundary.restDaysMin}+ ${text.rest}.` },
  ];
}

/** Build the full adaptive plan from the soonest future milestone. `longestRunKm`
 * is the athlete's current longest logged run — the plan's long-run progression
 * starts from real fitness rather than assuming endurance they haven't logged. */
export function buildTrainingPlan(
  milestone: TrackedEvent | undefined,
  longestRunKm: number,
  now: Date,
): GeneratedPlan | null {
  if (!milestone) return null;

  const raceDistanceKm = milestone.distanceKm > 0 ? milestone.distanceKm : 10;
  const raceMonday = startOfMonday(parseLocalDate(milestone.date));
  const nowMonday = startOfMonday(now);
  // If the race is further out than the standard cycle for its distance, start
  // the plan this week instead of leaving a gap with no guidance — the whole
  // cycle just gets longer (more Base phase), rather than sitting idle.
  const weeksUntilRace = Math.max(
    1,
    Math.round((raceMonday.getTime() - nowMonday.getTime()) / (7 * 86400000)) + 1,
  );
  const totalWeeks = Math.max(totalWeeksForDistance(raceDistanceKm), weeksUntilRace);
  const planStart = new Date(raceMonday);
  planStart.setDate(planStart.getDate() - (totalWeeks - 1) * 7);
  const planStartIso = formatIsoDate(planStart);

  const targetSeconds = milestone.targetTime ? parseClockToSeconds(milestone.targetTime) : null;
  const racePacePerKm =
    targetSeconds && raceDistanceKm > 0 ? `${formatPace(targetSeconds / raceDistanceKm)} /km` : '—';

  const boundaries = buildPhaseBoundaries(totalWeeks);
  const startLongRunKm = Math.max(5, longestRunKm);
  const longRunKmByWeek = buildLongRunProgression(totalWeeks, boundaries, startLongRunKm, raceDistanceKm);

  const phases: TrainingPhase[] = boundaries.map((b) => ({
    id: b.id,
    name: b.name,
    weeks: `weeks ${b.startWeek}–${b.endWeek}`,
    dates: `${new Date(planStart.getTime() + (b.startWeek - 1) * 7 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(planStart.getTime() + b.endWeek * 7 * 86400000 - 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    color: b.color,
    rows: buildPhaseRows(b),
  }));

  return {
    raceName: milestone.title,
    raceDate: milestone.date,
    raceTarget: milestone.targetTime ?? '',
    racePacePerKm,
    raceDistanceKm,
    totalWeeks,
    planStartIso,
    phases,
    phaseBoundaries: boundaries,
    longRunMilestones: longRunMilestoneTable(
      longRunKmByWeek,
      planStartIso,
      totalWeeks,
      milestone.date,
      raceDistanceKm,
      milestone.targetTime ?? '',
    ),
    longRunKmByWeek,
  };
}

export function currentWeekNumber(plan: GeneratedPlan, now: Date): number {
  return weekNumberSince(plan.planStartIso, now);
}

export function rulesForWeek(plan: GeneratedPlan, weekNumber: number): PhaseRules & { phaseName: string } {
  const boundary = plan.phaseBoundaries.find((b) => weekNumber >= b.startWeek && weekNumber <= b.endWeek);
  if (!boundary) {
    return { phaseName: 'Outside plan', easyRunsMin: 0, easyRunsMax: 0, speedRequired: false, restDaysMin: 0 };
  }
  return {
    phaseName: boundary.name,
    easyRunsMin: boundary.id === 'taper' && weekNumber === plan.totalWeeks ? 0 : boundary.easyRunsMin,
    easyRunsMax: boundary.id === 'taper' && weekNumber === plan.totalWeeks ? 0 : boundary.easyRunsMax,
    speedRequired: boundary.speedRequired && weekNumber !== plan.totalWeeks,
    restDaysMin: weekNumber === plan.totalWeeks ? 3 : boundary.restDaysMin,
  };
}
