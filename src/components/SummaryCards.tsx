import { Flame, Mountain, Route } from "lucide-react";
import { hours, km, shortDate } from "../lib/format";
import type { Summary } from "../lib/summary";
import { BUCKETS } from "../lib/summary";

const STAT = "rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200";

export function SummaryCards({ s }: { s: Summary }) {
  const cards = [
    { label: "Activities", value: String(s.totals.count) },
    { label: "Distance", value: km(s.totals.distanceM) },
    { label: "Moving time", value: hours(s.totals.movingS) },
    { label: "Elevation", value: `${Math.round(s.totals.elevM).toLocaleString()} m` },
  ];
  const highlights = [
    {
      Icon: Route,
      label: "Longest",
      value: s.longest
        ? `${km(s.longest.distance)} · ${shortDate(s.longest.start_date_local)}`
        : "—",
    },
    {
      Icon: Mountain,
      label: "Biggest climb",
      value: s.biggestClimb
        ? `${Math.round(s.biggestClimb.total_elevation_gain)} m · ${shortDate(s.biggestClimb.start_date_local)}`
        : "—",
    },
    {
      Icon: Flame,
      label: "Longest streak",
      value: `${s.streakDays} day${s.streakDays === 1 ? "" : "s"}`,
    },
  ];
  const sports = BUCKETS.filter((b) => s.byBucket[b].count > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className={STAT}>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {c.label}
            </div>
            <div className="text-xl font-black tabular-nums text-slate-900">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {highlights.map(({ Icon, label, value }) => (
          <div key={label} className={`${STAT} flex items-center gap-3`}>
            <Icon size={20} className="shrink-0 text-orange-600" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </div>
              <div className="text-sm font-bold text-slate-900">{value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {sports.map((b) => (
          <span
            key={b}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700"
          >
            {b} · {s.byBucket[b].count} · {km(s.byBucket[b].distanceM)}
          </span>
        ))}
      </div>
    </div>
  );
}
