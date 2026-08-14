import type { LongRunMilestone, TrainingPhase } from '../types';

/** Liverpool Half Marathon plan — 14 March 2027, target 2:15:00. */
export const PLAN_START = '2026-08-17';
export const RACE_DATE = '2027-03-14';
export const RACE_NAME = 'Liverpool Half Marathon';
export const RACE_TARGET = '2:15:00';
export const RACE_PACE_PER_KM = '6:24';
export const SHOE_LIFE_KM = 800;

export const ANALYSIS_BLURB =
  "How your data shaped this plan: Over the last six months your 5k pace has improved from roughly 5:38/km (Parkrun average) down to a 24:57 PB at 4:57/km, and your one 10k race (Tatton, 57:10) sits at 5:40/km — both point to an easy-pace baseline around 6:10–6:30/km and a current half-marathon equivalent of roughly 2:05–2:10 if you raced today. Your longest run to date is 15.17 km, so the plan below builds gradually from that, rather than assuming endurance you haven't logged yet. Your Strava heart-rate zones (Z2 127–157 bpm, Z3 158–173 bpm) are used directly for the easy and tempo targets. Because your actual fitness is already a little ahead of a 2:15 finish, the plan keeps 2:15 as the safety-net goal but structures speed work to leave room for a faster day if training goes well.";

export const TRAINING_PHASES: TrainingPhase[] = [
  {
    id: 'base',
    name: 'Phase 1 — Base',
    weeks: 'weeks 1–8',
    dates: '17 Aug – 11 Oct',
    color: 'var(--run)',
    rows: [
      {
        type: 'easy',
        details:
          '2–3 runs/week, 5–7 km at 6:15–6:40/km, HR capped at 157 bpm (Z2). This replaces/extends your usual CHSTR and RCIC efforts — same club runs, just keep the pace conversational.',
      },
      {
        type: 'interval',
        details:
          '1x/week from week 3: 6–8 × 400m at 4:40–4:55/km (your current 5k pace) with 90s jog recovery. Keep total interval volume under 4 km.',
      },
      {
        type: 'long',
        details:
          'Weekly, building from 8 km to 14 km, pace 6:20–6:45/km (slower than easy days). Parkrun can count as the fast finish of a long run on some weeks.',
      },
      {
        type: 'rest',
        details: '2 full rest or cross-training days weekly.',
      },
    ],
  },
  {
    id: 'build',
    name: 'Phase 2 — Build',
    weeks: 'weeks 9–18',
    dates: '12 Oct – 20 Dec',
    color: 'var(--ride)',
    rows: [
      {
        type: 'easy',
        details: '2 runs/week, 6–8 km at 6:00–6:25/km, HR 127–157 bpm.',
      },
      {
        type: 'interval',
        details:
          'Alternate weekly: (a) 5 × 1 km at 4:55–5:05/km with 2 min jog recovery, or (b) tempo run of 20–30 min at 5:10–5:25/km (your current 10k pace minus a little, HR 158–173 bpm Z3).',
      },
      {
        type: 'long',
        details:
          'Progresses 14 km → 18 km, pace 6:10–6:35/km. Include the last 2 km of two long runs at target half-marathon pace (6:24/km) to practise race rhythm.',
      },
      {
        type: 'rest',
        details:
          '1–2 rest days; light cross-training on the other non-running days is fine.',
      },
    ],
  },
  {
    id: 'peak',
    name: 'Phase 3 — Peak',
    weeks: 'weeks 19–26',
    dates: '21 Dec – 14 Feb',
    color: 'var(--hike)',
    rows: [
      {
        type: 'easy',
        details: '2 runs/week, 6–8 km at 6:00–6:25/km.',
      },
      {
        type: 'interval',
        details:
          'Race-specific: 3 × 2 km at 5:00–5:15/km with 3 min jog, or 8 × 400m at 4:30–4:45/km for late-race sharpness.',
      },
      {
        type: 'long',
        details:
          'Peaks at 19–20 km (week 24), pace 6:05–6:30/km, with the final 5 km of your two biggest long runs at 6:15–6:24/km goal pace.',
      },
      {
        type: 'rest',
        details:
          '1–2 rest days, prioritise sleep and recovery as weekly volume peaks (~35–40 km/week).',
      },
    ],
  },
  {
    id: 'taper',
    name: 'Phase 4 — Taper',
    weeks: 'weeks 27–30',
    dates: '15 Feb – 14 Mar',
    color: 'var(--walk)',
    rows: [
      {
        type: 'easy',
        details:
          'Volume drops ~25% per week; keep 2 short easy runs at 6:10–6:30/km to stay loose.',
      },
      {
        type: 'interval',
        details:
          'Short and sharp only: 4–6 × 400m at goal race pace or slightly faster, full recovery. Stop 5 days out.',
      },
      {
        type: 'long',
        details:
          '13 km (week 28) → 8 km (week 29) → rest week → race day, 21.1 km at 6:24/km target (2:15:00).',
      },
      {
        type: 'rest',
        details: '3 rest days in race week, including 2 full days before Liverpool.',
      },
    ],
  },
];

export const LONG_RUN_MILESTONES: LongRunMilestone[] = [
  { week: 1, date: '17 Aug', distance: '8 km' },
  { week: 4, date: '7 Sep', distance: '10 km' },
  { week: 8, date: '5 Oct', distance: '14 km' },
  { week: 12, date: '2 Nov', distance: '15 km' },
  { week: 16, date: '30 Nov', distance: '17 km' },
  { week: 20, date: '28 Dec', distance: '18 km' },
  { week: 24, date: '25 Jan', distance: '20 km (peak)' },
  { week: 27, date: '15 Feb', distance: '15 km' },
  { week: 28, date: '22 Feb', distance: '13 km' },
  { week: 29, date: '1 Mar', distance: '8 km' },
  { week: 30, date: '8 Mar', distance: 'Race week — rest' },
  {
    week: 'race',
    date: '14 Mar 2027',
    distance: '21.1 km — goal 2:15:00 (6:24/km)',
  },
];

/** Numeric long-run km targets by plan week (for compliance). */
export const LONG_RUN_KM_BY_WEEK: Record<number, number> = {
  1: 8,
  2: 8,
  3: 9,
  4: 10,
  5: 11,
  6: 12,
  7: 13,
  8: 14,
  9: 14,
  10: 14.5,
  11: 15,
  12: 15,
  13: 15.5,
  14: 16,
  15: 16.5,
  16: 17,
  17: 17,
  18: 17.5,
  19: 18,
  20: 18,
  21: 18.5,
  22: 19,
  23: 19.5,
  24: 20,
  25: 18,
  26: 16,
  27: 15,
  28: 13,
  29: 8,
  30: 0,
};

export interface PhaseWeekRules {
  phaseId: string;
  phaseName: string;
  easyRunsMin: number;
  easyRunsMax: number;
  speedRequired: boolean;
  restDaysMin: number;
}

export function rulesForWeek(weekNumber: number): PhaseWeekRules {
  if (weekNumber >= 1 && weekNumber <= 8) {
    return {
      phaseId: 'base',
      phaseName: 'Phase 1 — Base',
      easyRunsMin: 2,
      easyRunsMax: 3,
      speedRequired: weekNumber >= 3,
      restDaysMin: 2,
    };
  }
  if (weekNumber >= 9 && weekNumber <= 18) {
    return {
      phaseId: 'build',
      phaseName: 'Phase 2 — Build',
      easyRunsMin: 2,
      easyRunsMax: 2,
      speedRequired: true,
      restDaysMin: 1,
    };
  }
  if (weekNumber >= 19 && weekNumber <= 26) {
    return {
      phaseId: 'peak',
      phaseName: 'Phase 3 — Peak',
      easyRunsMin: 2,
      easyRunsMax: 2,
      speedRequired: true,
      restDaysMin: 1,
    };
  }
  if (weekNumber >= 27 && weekNumber <= 30) {
    return {
      phaseId: 'taper',
      phaseName: 'Phase 4 — Taper',
      easyRunsMin: weekNumber === 30 ? 0 : 2,
      easyRunsMax: weekNumber === 30 ? 0 : 2,
      speedRequired: weekNumber < 30,
      restDaysMin: weekNumber === 30 ? 3 : 2,
    };
  }
  return {
    phaseId: 'off',
    phaseName: 'Outside plan',
    easyRunsMin: 0,
    easyRunsMax: 0,
    speedRequired: false,
    restDaysMin: 0,
  };
}

/** Monday of plan week 1. */
export function planWeekNumber(date: Date): number {
  const start = parseLocalDate(PLAN_START);
  const d = startOfMonday(date);
  const ms = d.getTime() - start.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function parseLocalDate(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function startOfMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const daysSinceMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return d;
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
