import { useCallback, useEffect, useState } from 'react';
import type { ActivityLite } from '../../types';
import { decodePolyline } from '../../lib/polyline';
import { usePersistedState } from '../../lib/export/usePersistedState';
import { ROUTE_MAP_DEFAULTS, renderRouteMap, type RouteMapOptions } from '../../lib/export/routeMap';
import { drawGradientRoute, drawRouteStack, normalise } from '../../lib/export/routes';
import { elevationGain, loadStream, trimEnds, trimPoints, type RouteStream } from '../../lib/export/stream';
import { drawStatsOverlay, overlayHeight, type StatItem } from '../../lib/export/statsOverlay';
import { ExportModal, type CommonExportOptions } from './ExportModal';
import { Seg, Toggle } from './ExportControls';
import { RouteMapControls } from './RouteExport';

type ColourBy = 'solid' | 'speed' | 'elevation';

interface SingleRouteOptions extends RouteMapOptions {
  colourBy: ColourBy;
  /** Hide the first/last 200 m so a shared graphic doesn't reveal where you live. */
  trim: boolean;
  showTitle: boolean;
  showDate: boolean;
  showDistance: boolean;
  showTime: boolean;
  showPace: boolean;
  showElevation: boolean;
  position: 'top' | 'bottom';
  tone: 'light' | 'dark';
  pill: boolean;
}

const DEFAULTS: SingleRouteOptions = {
  ...ROUTE_MAP_DEFAULTS,
  color: '#fc5200',
  opacity: 1,
  width: 6,
  colourBy: 'speed',
  trim: true,
  showTitle: true,
  showDate: true,
  showDistance: true,
  showTime: true,
  showPace: true,
  showElevation: true,
  position: 'bottom',
  tone: 'light',
  pill: true,
};

const TRIM_KM = 0.2;

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Export dialog for one activity's route: gradient by speed/elevation, stats overlay. */
export function SingleRouteExport({
  activity,
  polyline,
  extraStats = [],
  onClose,
}: {
  activity: ActivityLite;
  polyline: string;
  /** e.g. an official chip time, appended after the Strava-derived stats. */
  extraStats?: StatItem[];
  onClose: () => void;
}) {
  const [opts, setOpts] = usePersistedState<SingleRouteOptions>('export:route:opts', DEFAULTS);
  const set = <K extends keyof SingleRouteOptions>(k: K, v: SingleRouteOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  const [stream, setStream] = useState<RouteStream | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    loadStream(activity.id).then((s) => live && setStream(s));
    return () => {
      live = false;
    };
  }, [activity.id]);

  const hasStream = !!stream;
  const colourBy: ColourBy = hasStream ? opts.colourBy : 'solid';

  const render = useCallback(
    (common: CommonExportOptions) => {
      const base: RouteStream = stream ?? {
        pts: decodePolyline(polyline),
        speed: [],
        alt: [],
      };
      const data = opts.trim
        ? stream
          ? trimEnds(stream, TRIM_KM)
          : { ...base, pts: trimPoints(base.pts, TRIM_KM) }
        : base;
      if (data.pts.length < 2) throw new Error('Not enough GPS points to draw this route');

      const stats: StatItem[] = [];
      if (opts.showDate) stats.push({ label: 'Date', value: formatDate(activity.date) });
      if (opts.showDistance) stats.push({ label: 'Distance', value: `${activity.distanceKm} km` });
      if (opts.showTime) stats.push({ label: 'Time', value: activity.movingTime });
      if (opts.showPace && activity.pace) stats.push({ label: 'Pace', value: `${activity.pace} /km` });
      if (opts.showElevation && stream) {
        stats.push({ label: 'Elevation', value: `${elevationGain(stream.alt)} m` });
      }
      stats.push(...extraStats);
      const title = opts.showTitle ? activity.name : null;

      const hasLegend = colourBy !== 'solid';
      const reserved = overlayHeight(title, stats, hasLegend);
      const insets = {
        top: opts.position === 'top' ? reserved + 16 : 0,
        bottom: opts.position === 'bottom' ? reserved + 16 : 0,
      };

      return renderRouteMap(
        [data.pts],
        opts,
        common,
        (ctx, view, frame) => {
          if (colourBy === 'solid') {
            drawRouteStack(ctx, view, [data.pts], opts);
          } else {
            const t = normalise(colourBy === 'speed' ? data.speed : data.alt);
            drawGradientRoute(ctx, view, data.pts, t, opts);
          }
          drawStatsOverlay(ctx, frame, title, stats, {
            position: opts.position,
            tone: opts.tone,
            pill: opts.pill,
            legend: hasLegend
              ? colourBy === 'speed'
                ? ['Slower', 'Faster']
                : ['Lower', 'Higher']
              : undefined,
          });
        },
        insets,
      );
    },
    [activity, polyline, stream, opts, colourBy, extraStats],
  );

  if (stream === undefined) {
    return (
      <div className="export-modal" role="dialog" aria-modal="true" aria-label="Loading route">
        <header className="export-head">
          <h3>Loading route…</h3>
          <button type="button" className="export-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
      </div>
    );
  }

  return (
    <ExportModal
      kind="route"
      title="Download route"
      filename={`route-${activity.date}-${activity.id}.png`}
      render={render}
      onClose={onClose}
      options={
        <>
          <Seg
            label="Colour route by"
            value={colourBy}
            options={[
              ['solid', 'Solid'],
              ['speed', 'Speed'],
              ['elevation', 'Elevation'],
            ]}
            onChange={(v) => set('colourBy', v)}
          />
          {!hasStream ? (
            <p className="export-hint">
              Speed/elevation data hasn't synced for this activity yet — run the sync to enable it.
            </p>
          ) : null}
          <RouteMapControls opts={opts} set={(k, v) => setOpts((o) => ({ ...o, [k]: v }))} hideColour={colourBy !== 'solid'} />
          <Toggle label="Hide first & last 200 m (privacy)" checked={opts.trim} onChange={(v) => set('trim', v)} />

          <div className="export-field">
            <span className="export-label">Stats</span>
            <Toggle label="Title" checked={opts.showTitle} onChange={(v) => set('showTitle', v)} />
            <Toggle label="Date" checked={opts.showDate} onChange={(v) => set('showDate', v)} />
            <Toggle label="Distance" checked={opts.showDistance} onChange={(v) => set('showDistance', v)} />
            <Toggle label="Time" checked={opts.showTime} onChange={(v) => set('showTime', v)} />
            <Toggle label="Pace" checked={opts.showPace} onChange={(v) => set('showPace', v)} />
            <Toggle
              label="Elevation"
              checked={opts.showElevation && hasStream}
              disabled={!hasStream}
              onChange={(v) => set('showElevation', v)}
            />
          </div>
          <Seg
            label="Stats position"
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
