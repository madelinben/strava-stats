import { decodePolyline } from '../polyline';
import { distanceKm } from '../geo';
import type { LatLng } from './projection';

/** Per-activity GPS stream written by `scripts/sync.ts` (downsampled). */
export interface RouteStream {
  pts: LatLng[];
  /** m/s along the route */
  speed: number[];
  /** metres above sea level along the route */
  alt: number[];
}

interface RawStream {
  p: string;
  v: number[];
  a: number[];
}

/** null = no stream file (not synced yet / no GPS) → caller falls back to the summary polyline. */
export async function loadStream(id: number): Promise<RouteStream | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/streams/${id}.json`);
    if (!res.ok) return null;
    const raw = (await res.json()) as RawStream;
    const pts = decodePolyline(raw.p);
    if (pts.length < 2) return null;
    return { pts, speed: raw.v.map((v) => v / 10), alt: raw.a };
  } catch {
    return null;
  }
}

/** Drops the first/last `km` of the route (privacy: hides home/start location). */
export function trimEnds(stream: RouteStream, km: number): RouteStream {
  const { pts } = stream;
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(
      cum[i - 1] +
        distanceKm({ lat: pts[i - 1][0], lng: pts[i - 1][1] }, { lat: pts[i][0], lng: pts[i][1] }),
    );
  }
  const total = cum[cum.length - 1];
  if (total < km * 4) return stream; // too short to trim meaningfully
  const keep = cum.map((d) => d >= km && d <= total - km);
  const pick = <T,>(arr: T[]) => arr.filter((_, i) => keep[i]);
  return { pts: pick(pts), speed: pick(stream.speed), alt: pick(stream.alt) };
}

/** Trim a plain polyline the same way (no stream available). */
export function trimPoints(pts: LatLng[], km: number): LatLng[] {
  return trimEnds({ pts, speed: pts.map(() => 0), alt: pts.map(() => 0) }, km).pts;
}

/** Total ascent in metres, lightly smoothed so GPS altitude noise doesn't inflate it. */
export function elevationGain(alt: number[]): number {
  const sm = alt.map((_, i) => {
    const w = alt.slice(Math.max(0, i - 2), i + 3);
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  let gain = 0;
  for (let i = 1; i < sm.length; i++) gain += Math.max(0, sm[i] - sm[i - 1]);
  return Math.round(gain);
}
