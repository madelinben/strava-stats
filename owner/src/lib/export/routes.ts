import { project, type LatLng, type View } from './projection';

/** Every route drawn translucent: paths run more often stack to look brighter. */
export function drawRouteStack(
  ctx: CanvasRenderingContext2D,
  view: View,
  routes: LatLng[][],
  o: { color: string; opacity: number; width: number },
): void {
  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.lineWidth = o.width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = o.opacity;
  for (const pts of routes) {
    ctx.beginPath();
    pts.forEach(([lat, lng], i) => {
      const [x, y] = project(view, lat, lng);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/** Blue (low/slow) → red (high/fast). */
export function rampColor(t: number): string {
  return `hsl(${Math.round(220 * (1 - Math.min(1, Math.max(0, t))))} 85% 52%)`;
}

/** Normalises values to 0–1 using the 5th–95th percentile so outliers (GPS
 * spikes, a single sprint) don't wash the whole gradient to one colour. */
export function normalise(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
  const hi = sorted[Math.floor(sorted.length * 0.95)] ?? 1;
  const span = hi - lo || 1;
  // light moving average so adjacent segments blend instead of flickering
  return values.map((_, i) => {
    const w = values.slice(Math.max(0, i - 2), i + 3);
    const avg = w.reduce((a, b) => a + b, 0) / w.length;
    return Math.min(1, Math.max(0, (avg - lo) / span));
  });
}

/** One route drawn segment-by-segment, coloured by `t` (0–1 per point). */
export function drawGradientRoute(
  ctx: CanvasRenderingContext2D,
  view: View,
  pts: LatLng[],
  t: number[],
  o: { opacity: number; width: number },
): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = o.opacity;
  ctx.lineWidth = o.width;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = project(view, pts[i - 1][0], pts[i - 1][1]);
    const [x1, y1] = project(view, pts[i][0], pts[i][1]);
    ctx.strokeStyle = rampColor((t[i - 1] + t[i]) / 2);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}
