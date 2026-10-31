import { Sticker } from "lucide-react";
import { hours, km, pace, shortDate } from "../lib/format";
import { HANDOFF_KEY, type Handoff } from "../lib/handoff";
import { decodePolyline } from "../lib/polyline";
import type { Activity } from "../lib/strava";

function Thumb({ encoded }: { encoded: string }) {
  const pts = decodePolyline(encoded);
  if (pts.length < 2) return <span className="size-14 shrink-0 rounded-lg bg-slate-100" />;
  const k = Math.cos((pts[0][0] * Math.PI) / 180);
  const xy = pts.map(([lat, lon]): [number, number] => [lon * k, -lat]);
  const [xs, ys] = [xy.map((p) => p[0]), xy.map((p) => p[1])];
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1e-9;
  const d = xy
    .map(
      ([x, y], i) =>
        `${i ? "L" : "M"}${(2 + ((x - minX) / span) * 56).toFixed(1)},${(2 + ((y - minY) / span) * 56).toFixed(1)}`
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 60 60"
      className="size-14 shrink-0 rounded-lg bg-slate-50"
      role="img"
      aria-label="Route outline"
    >
      <path
        d={d}
        fill="none"
        stroke="#ea580c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function toHandoff(a: Activity): Handoff {
  return {
    title: a.name.slice(0, 32),
    distanceM: a.distance,
    durationS: a.moving_time,
    elevGainM: a.total_elevation_gain,
    points: decodePolyline(a.map?.summary_polyline ?? "").map(([lat, lon]) => ({
      lat,
      lon,
      ele: null,
      time: null,
    })),
  };
}

export function ActivityList({
  activities,
  onSticker,
}: {
  activities: Activity[];
  onSticker: () => void;
}) {
  function sticker(a: Activity) {
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(toHandoff(a)));
    } catch {}
    onSticker();
  }

  return (
    <ul className="flex flex-col gap-2">
      {activities.map((a) => (
        <li
          key={a.id}
          className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200"
        >
          <Thumb encoded={a.map?.summary_polyline ?? ""} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-slate-900">{a.name}</div>
            <div className="text-xs text-slate-500">
              {shortDate(a.start_date_local)} · {km(a.distance)} · {hours(a.moving_time)} ·{" "}
              {pace(a.average_speed)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => sticker(a)}
            aria-label={`Make a sticker from ${a.name}`}
            className="flex min-h-11 items-center gap-1 rounded-xl bg-orange-50 px-3 text-sm font-bold text-orange-700 transition active:scale-[0.97]"
          >
            <Sticker size={16} /> Sticker
          </button>
        </li>
      ))}
    </ul>
  );
}
