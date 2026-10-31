import { lazy, Suspense, useState } from 'react';
import type { ActivityLite, TrackedEvent } from '../types';
import { matchActivities, sportColorVar } from '../lib/events';
import { ExportRouteButton } from './export/RouteExportProvider';
import { formatDurationWithSeconds, formatPace, parseClockToSeconds } from '../lib/format';

const EventResultExport = lazy(() =>
  import('./export/EventResultExport').then((m) => ({ default: m.EventResultExport })),
);

function formatEventDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Official chip time beats the Strava-derived one — Strava only has moving
 * time (excludes stops/transitions), the race's own timing system doesn't.
 * Pace is only shown for single-sport distance events, not multi-leg ones
 * (e.g. a triathlon's overall time against total km isn't a meaningful pace). */
function officialTimeLine(event: TrackedEvent): string | null {
  if (!event.officialTime) return null;
  const seconds = parseClockToSeconds(event.officialTime);
  const showPace =
    event.activityType !== 'Triathlon' && event.distanceKm > 0 && seconds != null;
  const pace = showPace ? `${formatPace(seconds! / event.distanceKm)} /km` : null;
  return `${event.officialTime} official${pace ? ` · ${pace}` : ''}`;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? '#ffd23d' : 'none'} stroke={filled ? '#ffd23d' : 'currentColor'} strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2.5l2.9 6.3 6.9.7-5.1 4.8 1.4 6.9L12 17.8l-6.1 3.4 1.4-6.9-5.1-4.8 6.9-.7z" />
    </svg>
  );
}

function EventCard({
  event,
  activityLog,
  isPast,
  onRemove,
  onToggleMilestone,
}: {
  event: TrackedEvent;
  activityLog: ActivityLite[];
  isPast: boolean;
  onRemove: () => void;
  onToggleMilestone: () => void;
}) {
  const [cardOpen, setCardOpen] = useState(false);
  const completed = isPast ? matchActivities(event, activityLog) : undefined;
  const stravaUrl = completed ? `https://www.strava.com/activities/${completed.primaryId}` : undefined;

  return (
    <div
      className={`event-photo-card${isPast ? ' is-past' : ''}${stravaUrl ? ' is-clickable' : ''}${event.imageUrl ? ' has-image' : ''}`}
      style={{ '--card-color': sportColorVar(event.activityType) } as React.CSSProperties}
      onClick={stravaUrl ? () => window.open(stravaUrl, '_blank', 'noreferrer') : undefined}
      title={stravaUrl ? 'View on Strava' : undefined}
    >
      {event.imageUrl ? (
        <div className="event-photo-bg" style={{ backgroundImage: `url(${event.imageUrl})` }} />
      ) : null}
      {import.meta.env.DEV ? (
        <button
          type="button"
          className="event-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove event"
        >
          ×
        </button>
      ) : null}
      <button
        type="button"
        className={`event-star${import.meta.env.DEV ? '' : ' is-static'}`}
        onClick={
          import.meta.env.DEV
            ? (e) => {
                e.stopPropagation();
                onToggleMilestone();
              }
            : undefined
        }
        disabled={!import.meta.env.DEV}
        title={event.isMilestone ? 'Milestone goal' : 'Mark as milestone goal'}
      >
        <StarIcon filled={!!event.isMilestone} />
      </button>

      <div className="event-overlay">
        <div className="event-type-badge">{event.activityType}</div>
        <div className="event-title">{event.title}</div>
        <div className="event-date">{formatEventDate(event.date)}</div>

        {completed || event.officialTime ? (
          <div className="event-completed">
            <span className="status-pill status-met">completed</span>
            <div className="event-overlay-sub">
              {officialTimeLine(event) ?? (
                <>
                  {completed!.totalDistanceKm} km · {formatDurationWithSeconds(completed!.totalTimeSec)}
                  {completed!.pace ? ` · ${completed!.pace} /km` : ''}
                  {completed!.activities.length > 1 ? ` · ${completed!.activities.length} activities` : ''}
                </>
              )}
            </div>
          </div>
        ) : isPast ? (
          <div className="event-overlay-sub">
            {event.distanceKm} km planned · no matching activity found
          </div>
        ) : (
          <div className="event-overlay-sub">{event.distanceKm} km planned</div>
        )}

        {event.description ? (
          <div className="event-overlay-sub event-description">{event.description}</div>
        ) : null}

        {isPast && event.officialTime ? (
          <span className="export-trigger-on-card-wrap">
            <button
              type="button"
              className="export-trigger export-trigger-sm"
              onClick={(e) => {
                e.stopPropagation();
                setCardOpen(true);
              }}
            >
              Result card
            </button>
          </span>
        ) : null}
        {completed && completed.activities.length === 1 ? (
          <span className="export-trigger-on-card-wrap">
            <ExportRouteButton
              activity={completed.activities[0]}
              extraStats={event.officialTime ? [{ label: 'Chip time', value: event.officialTime }] : undefined}
            />
          </span>
        ) : null}

        {event.link ? (
          <a
            href={event.link}
            target="_blank"
            rel="noreferrer"
            className="event-link"
            onClick={(e) => e.stopPropagation()}
          >
            Event site ↗
          </a>
        ) : null}
        {event.officialResultsUrl ? (
          <a
            href={event.officialResultsUrl}
            target="_blank"
            rel="noreferrer"
            className="event-link"
            onClick={(e) => e.stopPropagation()}
          >
            Official result ↗
          </a>
        ) : null}
      </div>
      {cardOpen ? (
        <Suspense fallback={null}>
          <EventResultExport event={event} onClose={() => setCardOpen(false)} />
        </Suspense>
      ) : null}
    </div>
  );
}

export function UpcomingEventsCarousel({
  events,
  activityLog,
  onRemove,
  onToggleMilestone,
}: {
  events: TrackedEvent[];
  activityLog: ActivityLite[];
  onRemove: (id: string) => void;
  onToggleMilestone: (id: string) => void;
}) {
  return (
    <section id="upcoming-events">
      <h2>Upcoming events</h2>
      <div className="events-carousel">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            activityLog={activityLog}
            isPast={false}
            onRemove={() => onRemove(event.id)}
            onToggleMilestone={() => onToggleMilestone(event.id)}
          />
        ))}

        {events.length === 0 ? <p className="muted">No upcoming events tracked.</p> : null}
      </div>
    </section>
  );
}

export function PastEventsCarousel({
  events,
  activityLog,
  onRemove,
  onToggleMilestone,
  title = 'Past events',
}: {
  events: TrackedEvent[];
  activityLog: ActivityLite[];
  onRemove: (id: string) => void;
  onToggleMilestone: (id: string) => void;
  title?: string;
}) {
  if (events.length === 0) return null;

  return (
    <section>
      <h2>{title}</h2>
      <div className="events-carousel">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            activityLog={activityLog}
            isPast
            onRemove={() => onRemove(event.id)}
            onToggleMilestone={() => onToggleMilestone(event.id)}
          />
        ))}
      </div>
    </section>
  );
}
