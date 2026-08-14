import { useEffect, useMemo, useRef, useState } from 'react';
import type { HeatDay } from '../types';

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
};
const EMPTY_COLOR = '#d1d5db';

interface Cell {
  date: string;
  count: number;
  dominant: string | null;
}

function buildWeeks(days: HeatDay[], today: Date): Cell[][] {
  const dateMap: Record<string, string[]> = {};
  for (const d of days) {
    if (!dateMap[d.date]) dateMap[d.date] = [];
    dateMap[d.date].push(d.sport);
  }

  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const startDate = new Date(oneYearAgo);
  const dow = startDate.getDay();
  const daysSinceMonday = (dow + 6) % 7;
  startDate.setDate(startDate.getDate() - daysSinceMonday);

  const weeks: Cell[][] = [];
  const cur = new Date(startDate);
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

export function Heatmap({ days }: { days: HeatDay[] }) {
  const weeks = useMemo(() => buildWeeks(days, new Date()), [days]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    left: number;
    top: number;
    html: string;
  } | null>(null);

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
  const baseY = 12;
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const svgWidth = weeks.length * (cellSize + gap) + 50;
  const svgHeight = 7 * (cellSize + gap) + 30;

  const legendItems: [string, string][] = [
    ['Run', SPORT_COLORS.Run],
    ['Ride', SPORT_COLORS.Ride],
    ['Walk', SPORT_COLORS.Walk],
    ['Hike', SPORT_COLORS.Hike],
    ['Rowing', SPORT_COLORS.Rowing],
    ['Football', SPORT_COLORS.Soccer],
    ['No activity', EMPTY_COLOR],
  ];

  return (
    <>
      <div className="heatmap-wrap">
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
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
              const color = day.dominant
                ? (SPORT_COLORS[day.dominant] ?? '#64748b')
                : EMPTY_COLOR;
              const opacity =
                day.count === 0 ? 1 : day.count === 1 ? 0.6 : day.count === 2 ? 0.85 : 1;
              const x = 34 + wi * (cellSize + gap);
              const y = baseY + di * (cellSize + gap);
              return (
                <rect
                  key={`${day.date}-${di}`}
                  className="heat-cell"
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={color}
                  opacity={opacity}
                  style={{ cursor: day.count > 0 ? 'pointer' : 'default' }}
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
    </>
  );
}
