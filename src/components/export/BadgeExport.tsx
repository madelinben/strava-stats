import { useCallback } from 'react';
import type { Badge } from '../../lib/badges';
import { usePersistedState } from '../../lib/export/usePersistedState';
import { composeOnFrame } from '../../lib/export/frame';
import { BADGE_CARD_DEFAULTS, renderBadgeCard, type BadgeCardOptions } from '../../lib/export/badgeCard';
import { ExportModal, type CommonExportOptions } from './ExportModal';
import { Seg, Toggle } from './ExportControls';

/** Shareable medal sticker for one achievement badge. */
export function BadgeExport({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const [opts, setOpts] = usePersistedState<BadgeCardOptions>('export:badge:opts', BADGE_CARD_DEFAULTS);
  const set = <K extends keyof BadgeCardOptions>(k: K, v: BadgeCardOptions[K]) =>
    setOpts((o) => ({ ...o, [k]: v }));

  const render = useCallback(
    (common: CommonExportOptions) => composeOnFrame(renderBadgeCard(badge, opts), { ...common, padding: 40 }),
    [badge, opts],
  );

  return (
    <ExportModal
      kind="badge"
      title="Download badge sticker"
      filename={`badge-${badge.id}.png`}
      render={render}
      onClose={onClose}
      options={
        <>
          <Toggle label="Earned date / count ribbon" checked={opts.showNote} onChange={(v) => set('showNote', v)} />
          <Toggle label="Description" checked={opts.showDescription} onChange={(v) => set('showDescription', v)} />
          <Seg
            label="Description colour"
            value={opts.tone}
            options={[
              ['light', 'White'],
              ['dark', 'Black'],
            ]}
            onChange={(v) => set('tone', v)}
          />
        </>
      }
    />
  );
}
