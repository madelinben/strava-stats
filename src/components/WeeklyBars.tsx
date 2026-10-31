import { shortDate } from "../lib/format";
import type { Summary } from "../lib/summary";

export function WeeklyBars({ weekly }: { weekly: Summary["weekly"] }) {
  const max = Math.max(1, ...weekly.map((w) => w.km));
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Weekly distance, last 12 weeks
      </h3>
      <div
        className="flex h-28 items-end gap-1.5"
        role="img"
        aria-label="Weekly distance bar chart"
      >
        {weekly.map((w) => (
          <div
            key={w.weekStart}
            className="flex flex-1 flex-col items-center justify-end gap-1"
            title={`${shortDate(w.weekStart)}: ${w.km.toFixed(1)} km`}
          >
            <span className="text-[10px] font-bold tabular-nums text-slate-500">
              {w.km >= 1 ? Math.round(w.km) : ""}
            </span>
            <div
              className="w-full rounded-t bg-orange-500"
              style={{ height: `${Math.max(2, (w.km / max) * 80)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
