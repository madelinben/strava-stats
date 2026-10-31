import { LogOut, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useActivities } from "../hooks/useActivities";
import type { Session } from "../lib/strava";
import { summarise, yearsOf } from "../lib/summary";
import { ActivityList } from "./ActivityList";
import { Heatmap } from "./Heatmap";
import { SummaryCards } from "./SummaryCards";
import { WeeklyBars } from "./WeeklyBars";

interface DashboardProps {
  session: Session;
  onSession: (s: Session) => void;
  onDisconnect: () => void;
  onSticker: () => void;
}

export function Dashboard({ session, onSession, onDisconnect, onSticker }: DashboardProps) {
  const { data, error, isFetching, refetch } = useActivities(session, onSession);
  const [scope, setScope] = useState<number | "all" | null>(null);

  const years = useMemo(() => yearsOf(data ?? []), [data]);
  const active = scope ?? years[0] ?? "all";
  const today = new Date().toISOString().slice(0, 10);
  const summary = useMemo(() => summarise(data ?? [], active, today), [data, active, today]);
  const heatYear = active === "all" ? (years[0] ?? new Date().getFullYear()) : active;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-xl font-black text-slate-900">{session.athleteName}</h2>
        <select
          aria-label="Year"
          value={active}
          onChange={(e) => setScope(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="min-h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
          <option value="all">All time</option>
        </select>
        <button
          type="button"
          onClick={() => refetch()}
          aria-label="Refresh from Strava"
          className="grid size-11 place-items-center rounded-xl bg-slate-100 active:scale-[0.97]"
        >
          <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-rose-600 active:scale-[0.97]"
        >
          <LogOut size={16} /> Disconnect
        </button>
      </header>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error.message}</p>}
      {isFetching && !data && (
        <p className="text-sm text-slate-500">Loading your activities from Strava…</p>
      )}

      {data && (
        <>
          <SummaryCards s={summary} />
          <Heatmap heat={summary.heat} year={heatYear} />
          <WeeklyBars weekly={summary.weekly} />
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recent activities
            </h3>
            <ActivityList activities={data.slice(0, 12)} onSticker={onSticker} />
          </section>
        </>
      )}
    </div>
  );
}
