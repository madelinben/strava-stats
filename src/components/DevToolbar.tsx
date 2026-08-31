import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TrackedEvent } from '../types';
import { EventModal } from './EventModal';

/** Dev-only floating controls: rerun the sync script, and add an event. */
export function DevToolbar({
  onAddEvent,
}: {
  onAddEvent: (event: Omit<TrackedEvent, 'id'>) => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();

  if (!import.meta.env.DEV) return null;

  async function runSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/dev/sync', { method: 'POST' });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error || 'Sync failed');
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="dev-toolbar">
      <button
        type="button"
        className={`dev-circle-btn${syncing ? ' is-spinning' : ''}`}
        onClick={runSync}
        disabled={syncing}
        title={syncError ?? 'Rerun sync (dev only)'}
        aria-label="Rerun sync"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>

      <button
        type="button"
        className="dev-circle-btn"
        onClick={() => setModalOpen(true)}
        title="Add event (dev only)"
        aria-label="Add event"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {modalOpen ? (
        <EventModal onClose={() => setModalOpen(false)} onSave={onAddEvent} />
      ) : null}
    </div>
  );
}
