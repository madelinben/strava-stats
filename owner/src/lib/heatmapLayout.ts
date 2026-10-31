import type { HeatDay } from '../types';

export const SPORT_COLORS: Record<string, string> = {
  Run: '#10b981',
  TrailRun: '#10b981',
  VirtualRun: '#10b981',
  Ride: '#3b82f6',
  VirtualRide: '#3b82f6',
  Walk: '#f97316',
  Hike: '#a855f7',
  Rowing: '#06b6d4',
  Soccer: '#eab308',
  Padel: '#ec4899',
};
export const EMPTY_LIGHT = '#e3e5e9';
export const EMPTY_DARK = '#cdd1d8';

export interface Cell {
  date: string;
  count: number;
  dominant: string | null;
}

/** Monday on/before Jan 1 of `year` — the grid always starts on a full week. */
export function gridStartDate(year: number): Date {
  const startDate = new Date(year, 0, 1);
  const dow = startDate.getDay();
  const daysSinceMonday = (dow + 6) % 7;
  startDate.setDate(startDate.getDate() - daysSinceMonday);
  return startDate;
}

export function buildWeeks(days: HeatDay[], year: number): Cell[][] {
  const dateMap: Record<string, string[]> = {};
  for (const d of days) {
    if (!dateMap[d.date]) dateMap[d.date] = [];
    dateMap[d.date].push(d.sport);
  }

  const weeks: Cell[][] = [];
  const cur = new Date(gridStartDate(year));
  for (let w = 0; w < 53; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const acts = dateMap[dateStr] || [];
      let dominant: string | null = null;
      if (acts.length) {
        const counts: Record<string, number> = {};
        for (const s of acts) counts[s] = (counts[s] || 0) + 1;
        dominant = Object.keys(counts).reduce((a, b) =>
          counts[a] > counts[b] ? a : b,
        );
      }
      week.push({ date: dateStr, count: acts.length, dominant });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export interface MonthLabel {
  name: string;
  startWeek: number;
  spanWeeks: number;
}

/** One label per calendar month, spanning from the week column containing
 * that month's 1st through the week column containing its last day. */
export function buildMonthLabels(year: number): MonthLabel[] {
  const start = gridStartDate(year);
  const weekOf = (d: Date) =>
    Math.floor((d.getTime() - start.getTime()) / (7 * 86400000));

  const labels: MonthLabel[] = [];
  for (let m = 0; m < 12; m++) {
    const first = new Date(year, m, 1);
    const last = new Date(year, m + 1, 0);
    const startWeek = weekOf(first);
    const endWeek = weekOf(last);
    labels.push({
      name: first.toLocaleDateString('en-GB', { month: 'short' }),
      startWeek,
      spanWeeks: endWeek - startWeek + 1,
    });
  }
  return labels;
}

/** Legend rows: display label + the sport key whose colour represents it. */
export const SPORT_LEGEND: [string, string][] = [
  ['Run', 'Run'],
  ['Ride', 'Ride'],
  ['Walk', 'Walk'],
  ['Hike', 'Hike'],
  ['Rowing', 'Rowing'],
  ['Football', 'Soccer'],
  ['Padel', 'Padel'],
];

/** Heatmap cell opacity by activity count (1 → softer, 3+ → solid). */
export function cellOpacity(count: number): number {
  return count === 0 ? 1 : count === 1 ? 0.6 : count === 2 ? 0.85 : 1;
}
