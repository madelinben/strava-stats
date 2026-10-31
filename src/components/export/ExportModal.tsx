import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PRESETS, type Background, type Preset } from '../../lib/export/frame';
import {
  canCopyImage,
  canShareImage,
  canvasToBlob,
  copyBlob,
  downloadBlob,
  shareBlob,
} from '../../lib/export/output';
import { usePersistedState } from '../../lib/export/usePersistedState';

export interface CommonExportOptions {
  preset: Preset;
  bg: Background;
  scale: 1 | 2 | 3;
}

const COMMON_DEFAULTS: CommonExportOptions = { preset: 'fit', bg: 'transparent', scale: 2 };

const BGS: [Background, string][] = [
  ['transparent', 'Transparent'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

/** Full-screen export dialog: live preview, options, and a sticky full-width
 * Download button. Kind-specific controls come in as `options`; `render`
 * produces the final canvas for the current common options at a given scale. */
export function ExportModal({
  kind,
  title,
  filename,
  options,
  render,
  onClose,
}: {
  kind: string;
  title: string;
  filename: string;
  options: ReactNode;
  /** Must be referentially stable (useCallback) — a new identity re-renders the preview. */
  render: (common: CommonExportOptions) => Promise<HTMLCanvasElement> | HTMLCanvasElement;
  onClose: () => void;
}) {
  const [common, setCommon] = usePersistedState<CommonExportOptions>(
    `export:${kind}:common`,
    COMMON_DEFAULTS,
  );
  const previewRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview at 1x so option tweaks stay snappy; export re-renders at chosen scale.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const canvas = await render({ ...common, scale: 1 });
        const el = previewRef.current;
        if (cancelled || !el) return;
        el.width = canvas.width;
        el.height = canvas.height;
        el.getContext('2d')!.drawImage(canvas, 0, 0);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Preview failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [render, common]);

  // Close on Esc, lock page scroll, keep Tab inside the dialog.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('.export-close')?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const f = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input, select, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const run = useCallback(
    async (action: (blob: Blob) => Promise<void>, done: string) => {
      setBusy(true);
      setNotice(null);
      try {
        const blob = await canvasToBlob(await render(common));
        await action(blob);
        setNotice(done);
      } catch (e) {
        // Share sheet dismissed by the user is not an error worth showing.
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setError(e instanceof Error ? e.message : 'Export failed');
        }
      } finally {
        setBusy(false);
      }
    },
    [render, common],
  );

  const set = <K extends keyof CommonExportOptions>(k: K, v: CommonExportOptions[K]) =>
    setCommon((c) => ({ ...c, [k]: v }));

  // Portalled to <body>: an ancestor with `filter`/`transform` (e.g. past event
  // cards) would otherwise become the fixed-position container and tint it.
  // stopPropagation keeps clicks from reaching React ancestors (card click handlers).
  return createPortal(
    <div
      className="export-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      ref={dialogRef}
      onClick={(e) => e.stopPropagation()}
    >
      <header className="export-head">
        <h3>{title}</h3>
        <button type="button" className="export-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="export-body">
        <div className="export-preview">
          <canvas ref={previewRef} />
        </div>

        <div className="export-options">
          {error ? <p className="export-error">{error}</p> : null}

          <div className="export-field">
            <span className="export-label">Background</span>
            <div className="export-seg" role="group" aria-label="Background">
              {BGS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={common.bg === id ? 'is-active' : ''}
                  onClick={() => set('bg', id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="export-field">
            <span className="export-label">Size</span>
            <div className="export-seg" role="group" aria-label="Size">
              {(Object.keys(PRESETS) as Preset[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={common.preset === id ? 'is-active' : ''}
                  onClick={() => set('preset', id)}
                >
                  {PRESETS[id].label}
                </button>
              ))}
            </div>
          </div>

          <div className="export-field">
            <span className="export-label">Quality</span>
            <div className="export-seg" role="group" aria-label="Quality">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={common.scale === s ? 'is-active' : ''}
                  onClick={() => set('scale', s)}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {options}
        </div>
      </div>

      <footer className="export-actions">
        <button
          type="button"
          className="export-download"
          disabled={busy}
          onClick={() => run(async (b) => downloadBlob(b, filename), 'Downloaded')}
        >
          {busy ? 'Rendering…' : 'Download PNG'}
        </button>
        {canCopyImage() ? (
          <button
            type="button"
            className="export-secondary"
            disabled={busy}
            onClick={() => run(copyBlob, 'Copied to clipboard')}
          >
            Copy
          </button>
        ) : null}
        {canShareImage() ? (
          <button
            type="button"
            className="export-secondary"
            disabled={busy}
            onClick={() => run((b) => shareBlob(b, filename), 'Shared')}
          >
            Share
          </button>
        ) : null}
        {notice ? (
          <span className="export-notice" role="status">
            {notice}
          </span>
        ) : null}
      </footer>
    </div>,
    document.body,
  );
}
