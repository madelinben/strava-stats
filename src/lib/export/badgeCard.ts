import type { Badge } from '../badges';
import { makeCanvas } from './frame';

export interface BadgeCardOptions {
  tone: 'light' | 'dark';
  showNote: boolean;
  showDescription: boolean;
}

export const BADGE_CARD_DEFAULTS: BadgeCardOptions = {
  tone: 'dark',
  showNote: true,
  showDescription: false,
};

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** Badge colours are CSS vars (`var(--run)`); canvas needs the real value. */
function resolveColor(color: string): string {
  const m = color.match(/^var\((--[\w-]+)\)$/);
  if (!m) return color;
  return getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#64748b';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Medal-style sticker for one achievement. Transparent canvas at natural 600×680. */
export function renderBadgeCard(badge: Badge, o: BadgeCardOptions): HTMLCanvasElement {
  const W = 600;
  const H = 680;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d')!;
  const color = badge.unlocked ? resolveColor(badge.color) : '#94a3b8';
  const cx = W / 2;
  const cy = 290;
  const muted = o.tone === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(17,17,17,0.65)';

  // outer ring (colour darkened by a black wash), then the face
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();
  const face = ctx.createRadialGradient(cx - 80, cy - 100, 20, cx, cy, 225);
  face.addColorStop(0, 'rgba(255,255,255,0.28)');
  face.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, 225, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = face;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 200, 0, Math.PI * 2);
  ctx.stroke();

  // label: biggest font that fits in ≤3 lines inside the face
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 96;
  let lines: string[] = [];
  for (; size >= 34; size -= 4) {
    ctx.font = `800 ${size}px ${FONT}`;
    lines = wrap(ctx, badge.label, 330);
    if (lines.length <= 3 && lines.every((l) => ctx.measureText(l).width <= 330)) break;
  }
  const lh = size * 1.1;
  lines.forEach((l, i) => ctx.fillText(l, cx, cy - ((lines.length - 1) * lh) / 2 + i * lh));

  // ribbon with the earned note / lock state
  const note = badge.unlocked ? (badge.earnedNote ?? 'Unlocked') : 'Locked';
  let y = 555;
  if (o.showNote) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(110, y, 380, 64, 32);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(note, cx, y + 33, 350);
    y += 64;
  }
  if (o.showDescription) {
    ctx.fillStyle = muted;
    ctx.font = `600 22px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(badge.description, cx, y + 36, W - 40);
  }
  return canvas;
}
