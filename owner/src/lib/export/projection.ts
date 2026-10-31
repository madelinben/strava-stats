export type LatLng = [number, number];

/** A map viewport: `zoom` may be fractional; (cx, cy) is the centre in world
 * pixels at that zoom (256px tiles, Web Mercator). */
export interface View {
  zoom: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

function world(lat: number, lng: number, zoom: number): [number, number] {
  const size = 256 * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [
    ((lng + 180) / 360) * size,
    (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  ];
}

/** Zoom/centre that fits all points inside w×h with `pad` px margin. */
export function fitView(
  points: LatLng[],
  w: number,
  h: number,
  pad: number,
  /** Space reserved for overlays (e.g. a stats strip) — route centres in what's left. */
  insets: { top: number; bottom: number } = { top: 0, bottom: 0 },
): View {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [lat, lng] of points) {
    const [x, y] = world(lat, lng, 0);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const k = Math.min((w - pad * 2) / spanX, (h - insets.top - insets.bottom - pad * 2) / spanY);
  const zoom = Math.min(17, Math.max(1, Math.log2(k)));
  const f = 2 ** zoom;
  return { zoom, cx: ((minX + maxX) / 2) * f, cy: ((minY + maxY) / 2) * f + (insets.bottom - insets.top) / 2, w, h };
}

export function project(view: View, lat: number, lng: number): [number, number] {
  const [x, y] = world(lat, lng, view.zoom);
  return [x - view.cx + view.w / 2, y - view.cy + view.h / 2];
}
