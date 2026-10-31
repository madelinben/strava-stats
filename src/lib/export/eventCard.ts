import { SPORT_COLORS } from '../heatmapLayout';
import { formatPace, parseClockToSeconds } from '../format';
import type { TrackedEvent } from '../../types';
import { makeCanvas } from './frame';

export interface EventCardOptions {
  tone: 'light' | 'dark';
  showDistance: boolean;
  showPace: boolean;
  showDate: boolean;
}

export const EVENT_CARD_DEFAULTS: EventCardOptions = {
  tone: 'dark',
  showDistance: true,
  showPace: true,
  showDate: true,
};

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function fit(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

/** Race-result card: title, huge official time, distance/pace row. Transparent
 * canvas at natural 800px width; the caller frames and backs it. */
export function renderEventCard(event: TrackedEvent, o: EventCardOptions): HTMLCanvasElement {
  const W = 800;
  const H = 420;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d')!;
  const fg = o.tone === 'light' ? '#ffffff' : '#111111';
  const muted = o.tone === 'light' ? 'rgba(255,255,255,0.7)' : 'rgba(17,17,17,0.6)';
  const accent = SPORT_COLORS[event.activityType] ?? '#fc5200';
  ctx.textAlign = 'center';

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 40, 20, 80, 8, 4);
  ctx.fill();

  ctx.fillStyle = fg;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(fit(ctx, event.title, W - 60), W / 2, 84);

  if (o.showDate) {
    ctx.fillStyle = muted;
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(
      new Date(`${event.date}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      W / 2,
      118,
    );
  }

  ctx.fillStyle = fg;
  ctx.font = `800 120px ${FONT}`;
  ctx.fillText(event.officialTime ?? '—', W / 2, 250);
  ctx.fillStyle = muted;
  ctx.font = `700 18px ${FONT}`;
  ctx.fillText('OFFICIAL CHIP TIME', W / 2, 284);

  const items: [string, string][] = [];
  if (o.showDistance) items.push(['Distance', `${event.distanceKm} km`]);
  const seconds = event.officialTime ? parseClockToSeconds(event.officialTime) : null;
  if (o.showPace && seconds && event.distanceKm > 0 && event.activityType !== 'Triathlon') {
    items.push(['Pace', `${formatPace(seconds / event.distanceKm)} /km`]);
  }
  const colW = (W - 120) / Math.max(items.length, 1);
  items.forEach(([label, value], i) => {
    const cx = 60 + colW * i + colW / 2;
    ctx.fillStyle = fg;
    ctx.font = `700 34px ${FONT}`;
    ctx.fillText(value, cx, 350);
    ctx.fillStyle = muted;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(label.toUpperCase(), cx, 376);
  });
  return canvas;
}
