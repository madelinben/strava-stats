import { fitView, type LatLng } from './projection';
import { drawRouteStack } from './routes';
import { drawTiles, TILE_STYLES, type TileStyle } from './tiles';
import { BG_COLORS, clampScale, makeCanvas, PRESETS, type Background, type Preset } from './frame';

export interface RouteMapOptions {
  mapStyle: TileStyle;
  /** Place names + icons; only has effect for styles with a label-free variant. */
  labels: boolean;
  color: string;
  /** 0.1–1: 1 = fully solid routes. */
  opacity: number;
  width: number;
}

export const ROUTE_MAP_DEFAULTS: RouteMapOptions = {
  mapStyle: 'none',
  labels: true,
  color: '#fc5200',
  opacity: 0.4,
  width: 3,
};

/** Frame used when the preset is "fit" — maps have no natural content size. */
const DEFAULT_FRAME: [number, number] = [1200, 900];

export function frameSize(preset: Preset): [number, number] {
  return PRESETS[preset].size ?? DEFAULT_FRAME;
}

/** Renders a route map into a canvas at `frame`×scale. `paint` lets the
 * caller add layers (gradient route, stats overlay) after the base map. */
export async function renderRouteMap(
  routes: LatLng[][],
  o: RouteMapOptions,
  common: { preset: Preset; bg: Background; scale: number },
  paint?: (ctx: CanvasRenderingContext2D, view: ReturnType<typeof fitView>, frame: [number, number]) => void,
  insets?: { top: number; bottom: number },
): Promise<HTMLCanvasElement> {
  const frame = frameSize(common.preset);
  const [w, h] = frame;
  const scale = clampScale(w, h, common.scale);
  const canvas = makeCanvas(w * scale, h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  const view = fitView(routes.flat(), w, h, 48, insets);

  if (o.mapStyle === 'none') {
    if (common.bg !== 'transparent') {
      ctx.fillStyle = BG_COLORS[common.bg];
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    await drawTiles(ctx, view, o.mapStyle, o.labels);
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = o.mapStyle === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    ctx.fillText(TILE_STYLES[o.mapStyle].attribution, w - 8, h - 6);
    ctx.textAlign = 'left';
  }

  if (paint) paint(ctx, view, frame);
  else drawRouteStack(ctx, view, routes, o);
  return canvas;
}
