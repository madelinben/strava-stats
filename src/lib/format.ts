export const km = (m: number) => `${(m / 1000).toFixed(m >= 100_000 ? 0 : 1)} km`;

export function hours(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** m/s → min/km, e.g. "5:30 /km" */
export function pace(speedMs: number): string {
  if (speedMs <= 0) return "—";
  const perKm = 1000 / speedMs;
  return `${Math.floor(perKm / 60)}:${String(Math.round(perKm % 60)).padStart(2, "0")} /km`;
}

export const shortDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
