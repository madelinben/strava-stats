import { useState, type RefObject } from 'react';

/** Rasterizes `targetRef`'s DOM (map tiles + overlaid routes) to a PNG and
 * triggers a browser download. OSM tiles send CORS headers, so this needs no
 * server-side rendering — just crossOrigin on the tile <img>s (set on
 * RouteHeatmap's TileLayer) so the canvas doesn't get tainted. */
export function DownloadMapButton({
  targetRef,
  filename,
}: {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDownload() {
    if (!targetRef.current || busy) return;
    setBusy(true);
    try {
      // Lazy-loaded — 200kB+ minified, no reason to ship it on every page load
      // when only a download click ever needs it.
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(targetRef.current, {
        useCORS: true,
        backgroundColor: '#e3e5e9',
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = filename;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="map-download-btn"
      onClick={handleDownload}
      disabled={busy}
      aria-label="Download heatmap image"
      title="Download heatmap image"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    </button>
  );
}
