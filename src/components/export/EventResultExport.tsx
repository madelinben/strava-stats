import { useCallback } from 'react';
import type { TrackedEvent } from '../../types';
import { usePersistedState } from '../../lib/export/usePersistedState';
import { composeOnFrame } from '../../lib/export/frame';
import { EVENT_CARD_DEFAULTS, renderEventCard, type EventCardOptions } from '../../lib/export/eventCard';
import { ExportModal, type CommonExportOptions } from './ExportModal';
import { Seg, Toggle } from './ExportControls';

/** Shareable race-result card (title, chip time, distance, pace). */
export function EventResultExport({ event, onClose }: { event: TrackedEvent; onClose: () => void }) {
  const [opts, setOpts] = usePersistedState<EventCardOptions>('export:event:opts', EVENT_CARD_DEFAULTS);
  const set = <K extends keyof EventCardOptions>(k: K, v: EventCardOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  const render = useCallback(
    (common: CommonExportOptions) => composeOnFrame(renderEventCard(event, opts), { ...common, padding: 40 }),
    [event, opts],
  );

  return (
    <ExportModal
      kind="event"
      title="Download result card"
      filename={`${event.id}-result.png`}
      render={render}
      onClose={onClose}
      options={
        <>
          <Seg
            label="Text colour"
            value={opts.tone}
            options={[
              ['light', 'White'],
              ['dark', 'Black'],
            ]}
            onChange={(v) => set('tone', v)}
          />
          <Toggle label="Date" checked={opts.showDate} onChange={(v) => set('showDate', v)} />
          <Toggle label="Distance" checked={opts.showDistance} onChange={(v) => set('showDistance', v)} />
          <Toggle label="Pace" checked={opts.showPace} onChange={(v) => set('showPace', v)} />
        </>
      }
    />
  );
}
