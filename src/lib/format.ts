export function formatDurationLong(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Same as formatDurationLong but keeps seconds — used where precision matters
 * more than brevity (e.g. a single completed activity's exact time). */
export function formatDurationWithSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h === 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/** "2:15:00" or "24:30" → whole seconds, or null if unparseable. */
export function parseClockToSeconds(clock: string): number | null {
  const parts = clock.trim().split(':').map(Number);
  if (parts.length < 2 || parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

/** seconds → "m:ss" pace label (e.g. per-km pace). */
export function formatPace(secondsPerUnit: number): string {
  const mins = Math.floor(secondsPerUnit / 60);
  const secs = Math.round(secondsPerUnit % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
