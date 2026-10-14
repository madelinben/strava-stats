import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackedEvent } from '../types';

/** Events are hardcoded in public/data/events.json (git-tracked, no secrets —
 * title/date/distance/type/link only). Dev-only writes go through the local
 * /api/dev/events endpoint (see vite.config.ts); production just reads the file. */
async function loadEvents(): Promise<TrackedEvent[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/events.json`);
  if (!res.ok) return [];
  return res.json() as Promise<TrackedEvent[]>;
}

async function persistEvents(events: TrackedEvent[]): Promise<void> {
  if (!import.meta.env.DEV) return;
  await fetch('/api/dev/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(events),
  });
}

export function useEvents() {
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    loadEvents().then(setEvents);
  }, []);

  const commit = useCallback((next: TrackedEvent[]) => {
    setEvents(next);
    void persistEvents(next);
  }, []);

  const addEvent = useCallback(
    (event: Omit<TrackedEvent, 'id'>) => {
      commit([...eventsRef.current, { ...event, id: crypto.randomUUID() }]);
    },
    [commit],
  );

  const removeEvent = useCallback(
    (id: string) => {
      commit(eventsRef.current.filter((e) => e.id !== id));
    },
    [commit],
  );

  const toggleMilestone = useCallback(
    (id: string) => {
      commit(
        eventsRef.current.map((e) =>
          e.id === id ? { ...e, isMilestone: !e.isMilestone } : e,
        ),
      );
    },
    [commit],
  );

  return { events, addEvent, removeEvent, toggleMilestone };
}
