import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityLite, HeatDay } from '../types';
import { bucketForSport } from '../lib/sports';
import { sportIcon } from '../lib/sportIcons';

const SPORT_COLORS: Record<string, string> = {
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
const EMPTY_LIGHT = '#e3e5e9';
const EMPTY_DARK = '#cdd1d8';

interface Cell {
  date: string;
  count: number;
  dominant: string | null;
}

/** Monday on/before Jan 1 of `year` — the grid always starts on a full week. */
function gridStartDate(year: number): Date {
  const startDate = new Date(year, 0, 1);
  const dow = startDate.getDay();
  const daysSinceMonday = (dow + 6) % 7;
  startDate.setDate(startDate.getDate() - daysSinceMonday);
  return startDate;
}

function buildWeeks(days: HeatDay[], year: number): Cell[][] {
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

interface MonthLabel {
  name: string;
  startWeek: number;
  spanWeeks: number;
}

/** One label per calendar month, spanning from the week column containing
 * that month's 1st through the week column containing its last day. */
function buildMonthLabels(year: number): MonthLabel[] {
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

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Today's date, but only as a default selection when browsing today's own
 * calendar year and there's actually something logged for it. */
function defaultSelectedDate(year: number, activityLog: ActivityLite[]): string | null {
  const today = todayIso();
  if (Number(today.slice(0, 4)) !== year) return null;
  return activityLog.some((a) => a.date === today) ? today : null;
}

function formatEventDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function DayActivityRow({ activity }: { activity: ActivityLite }) {
  const bucket = bucketForSport(activity.type);
  const swatchColor = bucket.id === 'other' ? '#000' : bucket.color;
  const Icon = sportIcon(bucket.id);
  return (
    <div
      className="day-activity-row"
      onClick={() => window.open(`https://www.strava.com/activities/${activity.id}`, '_blank', 'noreferrer')}
    >
      <div className="day-activity-swatch" style={{ background: swatchColor }}>
        <Icon size={18} color="#fff" />
      </div>
      <div className="day-activity-info">
        <div className="day-activity-title">{activity.name}</div>
        <div className="day-activity-stats">
          {activity.distanceKm} km · {activity.movingTime} · {activity.pace} /km
        </div>
      </div>
    </div>
  );
}

export function Heatmap({
  days,
  year,
  activityLog,
}: {
  days: HeatDay[];
  year: number;
  activityLog: ActivityLite[];
}) {
  const weeks = useMemo(() => buildWeeks(days, year), [days, year]);
  const monthLabels = useMemo(() => buildMonthLabels(year), [year]);
  const [selectedDate, setSelectedDate] = useState<string | null>(() =>
    defaultSelectedDate(year, activityLog),
  );
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    left: number;
    top: number;
    html: string;
  } | null>(null);

  useEffect(() => {
    setSelectedDate(defaultSelectedDate(year, activityLog));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    if (!tooltip) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.style.left = `${tooltip.left}px`;
    el.style.top = `${tooltip.top}px`;
    el.innerHTML = tooltip.html;
  }, [tooltip]);

  const cellSize = 12;
  const gap = 3;
  const monthRowHeight = 16;
  const baseY = 12 + monthRowHeight;
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const svgWidth = weeks.length * (cellSize + gap) + 50;
  const svgHeight = 7 * (cellSize + gap) + 30 + monthRowHeight;

  const legendItems: [string, string][] = [
    ['Run', SPORT_COLORS.Run],
    ['Ride', SPORT_COLORS.Ride],
    ['Walk', SPORT_COLORS.Walk],
    ['Hike', SPORT_COLORS.Hike],
    ['Rowing', SPORT_COLORS.Rowing],
    ['Football', SPORT_COLORS.Soccer],
    ['Padel', SPORT_COLORS.Padel],
    ['No activity', EMPTY_LIGHT],
  ];

  const selectedActivities = selectedDate
    ? activityLog.filter((a) => a.date === selectedDate)
    : [];

  return (
    <>
      <div className="heatmap-wrap">
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {monthLabels.map((ml) => (
            <text
              key={ml.name}
              x={34 + ml.startWeek * (cellSize + gap)}
              y={12}
              fontSize={10}
              fontWeight={600}
              fill="#6b6a65"
            >
              {ml.name}
            </text>
          ))}
          {dayLabels.map((lbl, i) => {
            const cy = baseY + i * (cellSize + gap) + cellSize / 2;
            return (
              <text
                key={lbl}
                x={0}
                y={cy}
                fontSize={10}
                fill="#6b6a65"
                dominantBaseline="central"
              >
                {lbl}
              </text>
            );
          })}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              const dayMonth = Number(day.date.slice(5, 7)) - 1;
              const emptyColor = dayMonth % 2 === 0 ? EMPTY_LIGHT : EMPTY_DARK;
              const color = day.dominant ? (SPORT_COLORS[day.dominant] ?? '#64748b') : emptyColor;
              const opacity =
                day.count === 0 ? 1 : day.count === 1 ? 0.6 : day.count === 2 ? 0.85 : 1;
              const x = 34 + wi * (cellSize + gap);
              const y = baseY + di * (cellSize + gap);
              return (
                <rect
                  key={`${day.date}-${di}`}
                  className={`heat-cell${selectedDate === day.date ? ' is-selected' : ''}`}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={color}
                  opacity={opacity}
                  stroke={selectedDate === day.date ? '#111' : 'none'}
                  strokeWidth={selectedDate === day.date ? 1.5 : 0}
                  style={{ cursor: day.count > 0 ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (day.count === 0) return;
                    setSelectedDate((prev) => (prev === day.date ? null : day.date));
                  }}
                  onMouseEnter={(e) => {
                    if (day.count === 0) return;
                    const dateObj = new Date(day.date + 'T00:00:00');
                    const dateStr = dateObj.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const rect = (e.target as SVGRectElement).getBoundingClientRect();
                    setTooltip({
                      left: rect.left - 40,
                      top: rect.top - 46,
                      html: `<strong>${dateStr}</strong><br>${day.count} activit${day.count === 1 ? 'y' : 'ies'}`,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            }),
          )}
        </svg>
        <div id="heatTooltip" ref={tooltipRef} />
      </div>
      <div className="legend-row">
        {legendItems.map(([label, color]) => (
          <div className="legend-item" key={label}>
            <div className="legend-swatch" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {selectedDate ? (
        <div className="day-activities-dropdown">
          <h4>{formatEventDate(selectedDate)}</h4>
          {selectedActivities.map((a) => (
            <DayActivityRow key={a.id} activity={a} />
          ))}
        </div>
      ) : null}
    </>
  );
}
