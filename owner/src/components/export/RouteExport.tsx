import { useCallback, useMemo } from 'react';
import type { SportRoute } from '../../types';
import { decodePolyline } from '../../lib/polyline';
import { usePersistedState } from '../../lib/export/usePersistedState';
import {
  ROUTE_MAP_DEFAULTS,
  renderRouteMap,
  type RouteMapOptions,
} from '../../lib/export/routeMap';
import { TILE_STYLES, type TileStyle } from '../../lib/export/tiles';
import { drawRouteStack } from '../../lib/export/routes';
import { drawStatsOverlay, overlayHeight, type StatItem } from '../../lib/export/statsOverlay';
import { ExportModal, type CommonExportOptions } from './ExportModal';
import { ColourPicker, Seg, Slider, Toggle } from './ExportControls';

const STYLE_OPTIONS: [TileStyle, string][] = [
  ['none', 'None'],
  ['osm', TILE_STYLES.osm.label],
  ['light', TILE_STYLES.light.label],
  ['dark', TILE_STYLES.dark.label],
];

/** Map-style / colour / opacity controls shared by every route export. */
export function RouteMapControls({
  opts,
  set,
  hideColour,
}: {
  opts: RouteMapOptions;
  set: <K extends keyof RouteMapOptions>(k: K, v: RouteMapOptions[K]) => void;
  hideColour?: boolean;
}) {
  const canHideLabels = opts.mapStyle !== 'none' && TILE_STYLES[opts.mapStyle].canHideLabels;
  return (
    <>
      <Seg label="Map" value={opts.mapStyle} options={STYLE_OPTIONS} onChange={(v) => set('mapStyle', v)} />
      {opts.mapStyle === 'none' ? (
        <p className="export-hint">No map: use the Background setting above (transparent for stickers).</p>
      ) : (
        <Toggle
          label={canHideLabels ? 'Place names & icons' : 'Place names & icons (always on for Standard)'}
          checked={canHideLabels ? opts.labels : true}
          disabled={!canHideLabels}
          onChange={(v) => set('labels', v)}
        />
      )}
      {hideColour ? null : <ColourPicker label="Route colour" value={opts.color} onChange={(v) => set('color', v)} />}
      <Slider
        label="Route opacity"
        value={Math.round(opts.opacity * 100)}
        min={10}
        max={100}
        step={5}
        format={(v) => `${v}%`}
        onChange={(v) => set('opacity', v / 100)}
      />
      <Slider label="Line width" value={opts.width} min={1} max={10} onChange={(v) => set('width', v)} />
    </>
  );
}

interface AreaOptions extends RouteMapOptions {
  title: string;
  showStats: boolean;
  position: 'top' | 'bottom';
  tone: 'light' | 'dark';
  pill: boolean;
}

const AREA_DEFAULTS: AreaOptions = {
  ...ROUTE_MAP_DEFAULTS,
  title: '',
  showStats: true,
  position: 'bottom',
  tone: 'light',
  pill: true,
};

/** Export dialog for the area Route Heatmap (all routes overlaid). */
export function RouteExport({
  routes,
  filename,
  onClose,
}: {
  routes: SportRoute[];
  filename: string;
  onClose: () => void;
}) {
  const [opts, setOpts] = usePersistedState<AreaOptions>('export:routes:opts', AREA_DEFAULTS);
  const set = <K extends keyof AreaOptions>(k: K, v: AreaOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  const decoded = useMemo(
    () => routes.map((r) => decodePolyline(r.polyline)).filter((p) => p.length > 1),
    [routes],
  );

  const render = useCallback(
    (common: CommonExportOptions) => {
      const since = routes.reduce((min, r) => (r.date < min ? r.date : min), routes[0]?.date ?? '');
      const stats: StatItem[] = opts.showStats
        ? [
            { label: 'Routes', value: String(decoded.length) },
            ...(since
              ? [{ label: 'Since', value: new Date(`${since}T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) }]
              : []),
          ]
        : [];
      const title = opts.title.trim() || null;
      const reserved = overlayHeight(title, stats, false);
      return renderRouteMap(
        decoded,
        opts,
        common,
        (ctx, view, frame) => {
          drawRouteStack(ctx, view, decoded, opts);
          drawStatsOverlay(ctx, frame, title, stats, opts);
        },
        {
          top: opts.position === 'top' && reserved ? reserved + 16 : 0,
          bottom: opts.position === 'bottom' && reserved ? reserved + 16 : 0,
        },
      );
    },
    [decoded, routes, opts],
  );

  return (
    <ExportModal
      kind="routes"
      title="Download route heatmap"
      filename={filename}
      render={render}
      onClose={onClose}
      options={
        <>
          <RouteMapControls opts={opts} set={(k, v) => setOpts((o) => ({ ...o, [k]: v }))} />
          <label className="export-field">
            <span className="export-label">Title</span>
            <input
              type="text"
              className="export-text"
              value={opts.title}
              maxLength={40}
              placeholder="Optional heading"
              onChange={(e) => set('title', e.target.value)}
            />
          </label>
          <Toggle label="Route count & start date" checked={opts.showStats} onChange={(v) => set('showStats', v)} />
          <Seg
            label="Text position"
            value={opts.position}
            options={[
              ['top', 'Top'],
              ['bottom', 'Bottom'],
            ]}
            onChange={(v) => set('position', v)}
          />
          <Seg
            label="Text colour"
            value={opts.tone}
            options={[
              ['light', 'White'],
              ['dark', 'Black'],
            ]}
            onChange={(v) => set('tone', v)}
          />
          <Toggle label="Backing pill for legibility" checked={opts.pill} onChange={(v) => set('pill', v)} />
        </>
      }
    />
  );
}
