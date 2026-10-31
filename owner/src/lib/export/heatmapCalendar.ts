import type { HeatDay } from '../../types';
import {
  EMPTY_DARK,
  EMPTY_LIGHT,
  SPORT_COLORS,
  SPORT_LEGEND,
  buildMonthLabels,
  buildWeeks,
  cellOpacity,
} from '../heatmapLayout';
import { makeCanvas, type Background } from './frame';

export interface HeatmapExportOptions {
  bg: Background;
  /** Per-sport colours, or one accent colour for everything. */
  sportColours: boolean;
  showLabels: boolean;
  showLegend: boolean;
  showYearLabel: boolean;
  title: string;
  /** Cell corner radius, 0 (square) – 6 (round). */
  radius: number;
}

export const HEATMAP_DEFAULTS: HeatmapExportOptions = {
  bg: 'transparent',
  sportColours: true,
  showLabels: true,
  showLegend: true,
  showYearLabel: true,
  title: '',
  radius: 2,
};

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 34;
const MONTH_ROW = 16;
const YEAR_ROW = 22;
const ACCENT = '#fc5200';

/** Draws one year per block, stacked vertically, on a transparent canvas at
 * natural (1x) size — the caller frames/scales it. */
export function renderHeatmapCalendar(
  years: { year: number; days: HeatDay[] }[],
  o: HeatmapExportOptions,
): HTMLCanvasElement {
  const dark = o.bg === 'dark';
  const text = dark ? '#c9ccd3' : '#6b6a65';
  const empties = dark ? ['#2a2d34', '#33363d'] : [EMPTY_LIGHT, EMPTY_DARK];
  const yearLabelH = o.showYearLabel && years.length > 1 ? YEAR_ROW : 0;
  const titleH = o.title ? 34 : 0;
  const labelsH = o.showLabels ? MONTH_ROW : 0;
  const left = o.showLabels ? LEFT : 0;
  const blockH = yearLabelH + labelsH + 7 * STEP;
  const blockGap = 18;
  const gridW = 53 * STEP;

  const present = new Set<string>();
  for (const y of years) for (const d of y.days) present.add(d.sport);
  const legend = SPORT_LEGEND.filter(([, sport]) =>
    [...present].some((s) => (SPORT_COLORS[s] ?? '') === SPORT_COLORS[sport]),
  );
  const legendH = o.showLegend && o.sportColours && legend.length ? 28 : 0;

  const width = left + gridW;
  const height = titleH + years.length * blockH + (years.length - 1) * blockGap + legendH;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';

  let y0 = 0;
  if (o.title) {
    ctx.fillStyle = dark ? '#ffffff' : '#1c1c1a';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(o.title, 0, 0);
    ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    y0 = titleH;
  }

  for (const { year, days } of years) {
    const weeks = buildWeeks(days, year);
    if (yearLabelH) {
      ctx.fillStyle = dark ? '#ffffff' : '#1c1c1a';
      ctx.font = '700 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(String(year), 0, y0 + YEAR_ROW / 2 - 2);
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
    const gridTop = y0 + yearLabelH + labelsH;

    if (o.showLabels) {
      ctx.fillStyle = text;
      for (const ml of buildMonthLabels(year)) {
        ctx.fillText(ml.name, left + ml.startWeek * STEP, y0 + yearLabelH + MONTH_ROW / 2);
      }
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d, i) => {
        ctx.fillText(d, 0, gridTop + i * STEP + CELL / 2);
      });
    }

    weeks.forEach((week, wi) =>
      week.forEach((day, di) => {
        const month = Number(day.date.slice(5, 7)) - 1;
        const active = day.count > 0;
        ctx.globalAlpha = active ? cellOpacity(day.count) : 1;
        ctx.fillStyle = active
          ? o.sportColours
            ? (SPORT_COLORS[day.dominant ?? ''] ?? '#64748b')
            : ACCENT
          : empties[month % 2];
        ctx.beginPath();
        ctx.roundRect(left + wi * STEP, gridTop + di * STEP, CELL, CELL, o.radius);
        ctx.fill();
      }),
    );
    ctx.globalAlpha = 1;
    y0 += blockH + blockGap;
  }

  if (legendH) {
    let x = left;
    const ly = height - 8;
    ctx.fillStyle = text;
    for (const [label, sport] of legend) {
      ctx.fillStyle = SPORT_COLORS[sport];
      ctx.beginPath();
      ctx.roundRect(x, ly - 5, 11, 11, 2);
      ctx.fill();
      ctx.fillStyle = text;
      ctx.fillText(label, x + 16, ly);
      x += 16 + ctx.measureText(label).width + 14;
    }
  }
  return canvas;
}
