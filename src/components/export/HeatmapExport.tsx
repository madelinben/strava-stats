import { useCallback } from 'react';
import type { HeatDay } from '../../types';
import { usePersistedState } from '../../lib/export/usePersistedState';
import { composeOnFrame } from '../../lib/export/frame';
import {
  HEATMAP_DEFAULTS,
  renderHeatmapCalendar,
  type HeatmapExportOptions,
} from '../../lib/export/heatmapCalendar';
import { ExportModal } from './ExportModal';
import { Toggle } from './ExportControls';

/** Export dialog for the activity calendar. `years` is one entry for a single
 * year, or every year (oldest first) for all-time, stacked vertically. */
export function HeatmapExport({
  years,
  label,
  onClose,
}: {
  years: { year: number; days: HeatDay[] }[];
  label: string;
  onClose: () => void;
}) {
  const [opts, setOpts] = usePersistedState<HeatmapExportOptions>(
    'export:heatmap:opts',
    HEATMAP_DEFAULTS,
  );
  const set = <K extends keyof HeatmapExportOptions>(k: K, v: HeatmapExportOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  const render = useCallback(
    (common: { preset: 'fit' | 'square' | 'story'; bg: 'transparent' | 'light' | 'dark'; scale: number }) => {
      const content = renderHeatmapCalendar(years, { ...opts, bg: common.bg });
      return composeOnFrame(content, common);
    },
    [years, opts],
  );

  return (
    <ExportModal
      kind="heatmap"
      title="Download activity heatmap"
      filename={`activity-heatmap-${label}.png`}
      render={render}
      onClose={onClose}
      options={
        <>
          <div className="export-field">
            <span className="export-label">Colours</span>
            <div className="export-seg" role="group" aria-label="Colours">
              <button
                type="button"
                className={opts.sportColours ? 'is-active' : ''}
                onClick={() => set('sportColours', true)}
              >
                By sport
              </button>
              <button
                type="button"
                className={!opts.sportColours ? 'is-active' : ''}
                onClick={() => set('sportColours', false)}
              >
                Single colour
              </button>
            </div>
          </div>

          <div className="export-field">
            <span className="export-label">Show</span>
            <Toggle label="Month & day labels" checked={opts.showLabels} onChange={(v) => set('showLabels', v)} />
            <Toggle label="Sport legend" checked={opts.showLegend} onChange={(v) => set('showLegend', v)} />
            {years.length > 1 ? (
              <Toggle label="Year labels" checked={opts.showYearLabel} onChange={(v) => set('showYearLabel', v)} />
            ) : null}
          </div>

          <label className="export-field">
            <span className="export-label">Cell shape</span>
            <input
              type="range"
              min={0}
              max={6}
              value={opts.radius}
              onChange={(e) => set('radius', Number(e.target.value))}
              aria-label="Cell corner radius"
            />
          </label>

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
        </>
      }
    />
  );
}
