import { rampColor } from './routes';

export interface StatItem {
  label: string;
  value: string;
}

export interface StatsOverlayOptions {
  position: 'top' | 'bottom';
  tone: 'light' | 'dark';
  /** Translucent pill behind the text so it stays legible on any map. */
  pill: boolean;
  /** Slow→fast / low→high gradient key under the stats. */
  legend?: [string, string];
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** Height reserved for the overlay so routes can be fitted around it. */
export function overlayHeight(title: string | null, stats: StatItem[], legend: boolean): number {
  if (!title && !stats.length) return 0;
  return 24 + (title ? 44 : 0) + (stats.length ? 64 : 0) + (legend ? 26 : 0) + 24;
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

/** Title + big-number stat row (+ optional gradient legend), centred, at top or bottom of the frame. */
export function drawStatsOverlay(
  ctx: CanvasRenderingContext2D,
  frame: [number, number],
  title: string | null,
  stats: StatItem[],
  o: StatsOverlayOptions,
): void {
  const [w, h] = frame;
  const total = overlayHeight(title, stats, !!o.legend);
  if (!total) return;
  const top = o.position === 'top' ? 16 : h - total - 16;
  const fg = o.tone === 'light' ? '#ffffff' : '#111111';
  const muted = o.tone === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(17,17,17,0.65)';

  ctx.save();
  if (o.pill) {
    ctx.fillStyle = o.tone === 'light' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.roundRect(16, top, w - 32, total, 20);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  let y = top + 24;
  if (title) {
    ctx.fillStyle = fg;
    ctx.font = `700 26px ${FONT}`;
    y += 26;
    ctx.fillText(fit(ctx, title, w - 80), w / 2, y);
    y += 18;
  }
  if (stats.length) {
    const colW = (w - 64) / stats.length;
    stats.forEach((s, i) => {
      const cx = 32 + colW * i + colW / 2;
      ctx.fillStyle = fg;
      ctx.font = `700 26px ${FONT}`;
      ctx.fillText(fit(ctx, s.value, colW - 8), cx, y + 26);
      ctx.fillStyle = muted;
      ctx.font = `600 12px ${FONT}`;
      ctx.fillText(s.label.toUpperCase(), cx, y + 46);
    });
    y += 64;
  }
  if (o.legend) {
    const bw = Math.min(200, w - 160);
    const x0 = (w - bw) / 2;
    for (let i = 0; i < bw; i++) {
      ctx.fillStyle = rampColor(i / (bw - 1));
      ctx.fillRect(x0 + i, y + 6, 1.5, 6);
    }
    ctx.fillStyle = muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(o.legend[0], x0 - 8, y + 13);
    ctx.textAlign = 'left';
    ctx.fillText(o.legend[1], x0 + bw + 8, y + 13);
  }
  ctx.restore();
}
