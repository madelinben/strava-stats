/** Shared output framing: size presets, background fill, and fitting a
 * rendered graphic into a preset frame. Kinds render natural-size content on a
 * transparent canvas; `composeOnFrame` handles preset + background. */

export type Preset = 'fit' | 'square' | 'story';
export type Background = 'transparent' | 'light' | 'dark';

export const PRESETS: Record<Preset, { label: string; size: [number, number] | null }> = {
  fit: { label: 'Fit to content', size: null },
  square: { label: 'Square 1080×1080', size: [1080, 1080] },
  story: { label: 'Story 1080×1920', size: [1080, 1920] },
};

export const BG_COLORS: Record<Exclude<Background, 'transparent'>, string> = {
  light: '#ffffff',
  dark: '#14140f',
};

/** Mobile Safari fails canvases beyond ~16M px; stay well under it. */
const MAX_PIXELS = 16_000_000;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function clampScale(w: number, h: number, scale: number): number {
  const max = Math.sqrt(MAX_PIXELS / (w * h));
  return Math.min(scale, max);
}

/** Fit `content` (any size) centred inside the preset frame (or its own size
 * for 'fit') with padding, over the chosen background. Output is `scale`x. */
export function composeOnFrame(
  content: HTMLCanvasElement,
  opts: { preset: Preset; bg: Background; scale: number; padding?: number },
): HTMLCanvasElement {
  const pad = opts.padding ?? 24;
  const frame = PRESETS[opts.preset].size ?? [content.width + pad * 2, content.height + pad * 2];
  const [fw, fh] = frame;
  const scale = clampScale(fw, fh, opts.scale);
  const out = makeCanvas(fw * scale, fh * scale);
  const ctx = out.getContext('2d')!;
  if (opts.bg !== 'transparent') {
    ctx.fillStyle = BG_COLORS[opts.bg];
    ctx.fillRect(0, 0, out.width, out.height);
  }
  const fit = Math.min((fw - pad * 2) / content.width, (fh - pad * 2) / content.height);
  const dw = content.width * fit * scale;
  const dh = content.height * fit * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(content, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
  return out;
}
