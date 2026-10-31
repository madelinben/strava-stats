import type { View } from './projection';

export type TileStyle = 'none' | 'osm' | 'light' | 'dark';

interface StyleDef {
  label: string;
  /** Tile URLs to stack for one tile — base first, optional label layer after. */
  urls: (z: number, x: number, y: number, labels: boolean) => string[];
  /** Whether a label-free variant exists (OSM standard tiles bake labels in). */
  canHideLabels: boolean;
  /** Highest zoom the server has real tiles for (beyond it: blank "not available" tiles). */
  maxZoom: number;
  attribution: string;
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
/** Esri gray canvases ship the base map and a separate label ("Reference") layer, so labels can be dropped. */
const esri = (base: string) => (z: number, x: number, y: number, labels: boolean) => [
  `${ESRI}/${base}_Base/MapServer/tile/${z}/${y}/${x}`,
  ...(labels ? [`${ESRI}/${base}_Reference/MapServer/tile/${z}/${y}/${x}`] : []),
];

export const TILE_STYLES: Record<Exclude<TileStyle, 'none'>, StyleDef> = {
  osm: {
    label: 'Standard',
    urls: (z, x, y) => [`https://tile.openstreetmap.org/${z}/${x}/${y}.png`],
    canHideLabels: false,
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  },
  light: {
    label: 'Light',
    urls: esri('World_Light_Gray'),
    canHideLabels: true,
    maxZoom: 16,
    attribution: 'Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors',
  },
  dark: {
    label: 'Dark',
    urls: esri('World_Dark_Gray'),
    canHideLabels: true,
    maxZoom: 16,
    attribution: 'Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors',
  },
};

const cache = new Map<string, Promise<HTMLImageElement | null>>();

function loadTile(url: string): Promise<HTMLImageElement | null> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // keeps the export canvas untainted
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    cache.set(url, p);
  }
  return p;
}

/** Paints the tiles covering `view`. Missing tiles are skipped silently. */
export async function drawTiles(
  ctx: CanvasRenderingContext2D,
  view: View,
  style: Exclude<TileStyle, 'none'>,
  labels: boolean,
): Promise<void> {
  const def = TILE_STYLES[style];
  const zt = Math.min(def.maxZoom, Math.max(0, Math.round(view.zoom)));
  const size = 256 * 2 ** (view.zoom - zt); // on-canvas tile size
  const left = view.cx - view.w / 2;
  const top = view.cy - view.h / 2;
  const n = 2 ** zt;
  const jobs: Promise<void>[] = [];
  for (let ty = Math.floor(top / size); ty <= Math.floor((top + view.h) / size); ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(left / size); tx <= Math.floor((left + view.w) / size); tx++) {
      const wrapped = ((tx % n) + n) % n;
      const dx = tx * size - left;
      const dy = ty * size - top;
      jobs.push(
        Promise.all(def.urls(zt, wrapped, ty, labels).map(loadTile)).then((imgs) => {
          // draw in order so the label layer lands on top of the base
          for (const img of imgs) if (img) ctx.drawImage(img, dx, dy, size + 0.5, size + 0.5);
        }),
      );
    }
  }
  await Promise.all(jobs);
}
