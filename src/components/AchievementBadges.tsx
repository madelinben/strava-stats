import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ActivityLite, MapPoint, TrackedEvent } from '../types';
import { computeBadges } from '../lib/badges';
import { matchParkrunVisits, type ParkrunsData } from '../lib/parkrun';

async function fetchParkruns(): Promise<ParkrunsData> {
  const url = `${import.meta.env.BASE_URL}data/parkruns.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load parkrun list (${res.status})`);
  return res.json() as Promise<ParkrunsData>;
}

function BadgeIcon({ label, color, unlocked }: { label: string; color: string; unlocked: boolean }) {
  return (
    <div
      className={`badge-icon${unlocked ? '' : ' is-locked'}`}
      style={{ '--badge-color': color } as React.CSSProperties}
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function AchievementBadges({
  activityLog,
  events,
  runPoints,
}: {
  activityLog: ActivityLite[];
  events: TrackedEvent[];
  runPoints: MapPoint[];
}) {
  const { data } = useQuery({ queryKey: ['parkruns'], queryFn: fetchParkruns });

  const parkrun = useMemo(() => {
    if (!data) return null;
    return { events: data.events, visits: matchParkrunVisits(runPoints, data.events) };
  }, [data, runPoints]);

  const badges = useMemo(
    () => computeBadges(activityLog, events, parkrun),
    [activityLog, events, parkrun],
  );

  return (
    <section id="achievements">
      <h2>Achievements</h2>
      <div className="badges-carousel">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`badge-card${badge.unlocked ? ' is-unlocked' : ''}`}
            title={badge.description}
          >
            <BadgeIcon label={badge.label} color={badge.color} unlocked={badge.unlocked} />
            <div className="badge-label">{badge.label}</div>
            <div className="badge-note">{badge.unlocked ? (badge.earnedNote ?? 'Unlocked') : badge.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
