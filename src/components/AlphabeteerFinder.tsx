import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MapPoint } from '../types';
import {
  DEFAULT_LOCATION,
  LETTERS,
  distanceKm,
  formatDistance,
  letterStatuses,
  matchParkrunVisits,
  nearestForLetter,
  visitsForLetter,
  type LatLng,
  type LetterStatus,
  type ParkrunsData,
} from '../lib/parkrun';

async function fetchParkruns(): Promise<ParkrunsData> {
  const url = `${import.meta.env.BASE_URL}data/parkruns.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load parkrun list (${res.status})`);
  return res.json() as Promise<ParkrunsData>;
}

type LocationSource = 'default' | 'browser';

function statusClass(status: LetterStatus): string {
  switch (status) {
    case 'done':
      return 'letter-done';
    case 'todo':
      return 'letter-todo';
    case 'abroad':
      return 'letter-abroad';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function AlphabeteerFinder({ runPoints }: { runPoints: MapPoint[] }) {
  const [letter, setLetter] = useState('C');
  const [origin, setOrigin] = useState<LatLng>(DEFAULT_LOCATION);
  const [locationSource, setLocationSource] = useState<LocationSource>('default');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: ['parkruns'],
    queryFn: fetchParkruns,
  });

  const visits = useMemo(() => {
    if (!data) return [];
    return matchParkrunVisits(runPoints, data.events);
  }, [data, runPoints]);

  const statuses = useMemo(() => {
    if (!data) return {} as Record<string, LetterStatus>;
    return letterStatuses(data.events, visits);
  }, [data, visits]);

  const doneCount = useMemo(
    () => Object.values(statuses).filter((s) => s === 'done').length,
    [statuses],
  );

  const nearest = useMemo(() => {
    if (!data) return [];
    return nearestForLetter(data.events, letter, origin, 3);
  }, [data, letter, origin]);

  const completedHere = useMemo(
    () => visitsForLetter(visits, letter),
    [visits, letter],
  );

  // ponytail: linear scan of ~1k events, fine on every click
  const nearestNew = useMemo(() => {
    if (!data) return null;
    let best: { letter: string; km: number } | null = null;
    for (const e of data.events) {
      if (statuses[e.letter] === 'done') continue;
      const km = distanceKm(origin, e);
      if (!best || km < best.km) best = { letter: e.letter, km };
    }
    return best;
  }, [data, statuses, origin]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationSource('browser');
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — still using Chester fallback.'
            : 'Could not read location — still using Chester fallback.',
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className="card alphabeteer">
      <div className="alphabeteer-header">
        <div>
          <h3 style={{ marginBottom: 4 }}>Parkrun Alphabeteer finder</h3>
          <p className="muted" style={{ margin: 0 }}>
            A–Z challenge progress from Strava runs with &quot;Parkrun&quot; in the
            title (matched to courses by start location — titles like &quot;Parkrun
            19&quot; still work). Tap a letter for the nearest remaining options.
            {data ? ` · ${data.region}` : ''}
          </p>
        </div>
        <div className="alphabeteer-actions">
          <button
            type="button"
            className="btn-location"
            onClick={useMyLocation}
            disabled={locating}
          >
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => nearestNew && setLetter(nearestNew.letter)}
            disabled={!nearestNew}
            title="Select the letter of the closest parkrun you haven't done a letter for yet"
          >
            Nearest new letter
          </button>
        </div>
      </div>

      <p className="alphabeteer-origin">
        {locationSource === 'browser' ? 'Your location' : 'Fallback · Chester'} ·{' '}
        {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
        {' · '}
        <strong>{doneCount}/26</strong> letters done
        {locationError ? (
          <>
            <br />
            <span className="alphabeteer-warn">{locationError}</span>
          </>
        ) : null}
      </p>

      <div className="letter-legend">
        <span>
          <i className="legend-swatch letter-done" /> Done
        </span>
        <span>
          <i className="legend-swatch letter-todo" /> Not yet
        </span>
        <span>
          <i className="legend-swatch letter-abroad" /> Abroad / unavailable
        </span>
      </div>

      <div className="letter-grid" role="group" aria-label="Alphabet letters">
        {LETTERS.map((l) => {
          const status = statuses[l] ?? 'todo';
          return (
            <button
              key={l}
              type="button"
              className={`letter-btn ${statusClass(status)}${letter === l ? ' is-active' : ''}`}
              onClick={() => setLetter(l)}
              aria-pressed={letter === l}
              title={
                status === 'done'
                  ? `${l} done`
                  : status === 'abroad'
                    ? `${l} — no UK/Ireland event (or none at all)`
                    : `${l} — not done yet`
              }
            >
              {l}
            </button>
          );
        })}
      </div>

      <div className="alphabeteer-results">
        <h3 className="alphabeteer-letter-heading">
          Letter <span>{letter}</span>
          {statuses[letter] === 'done' ? (
            <span className="status-pill status-met" style={{ marginLeft: 8 }}>
              done
            </span>
          ) : null}
        </h3>

        {completedHere.length > 0 ? (
          <div className="alphabeteer-done-box">
            <strong>Completed:</strong>{' '}
            {completedHere
              .map((v) => `${v.event.name} (${v.date})`)
              .join(' · ')}
          </div>
        ) : null}

        {isPending ? <p className="muted">Loading parkrun list…</p> : null}
        {isError ? (
          <p className="alphabeteer-warn">Could not load parkrun locations.</p>
        ) : null}

        {!isPending && !isError && nearest.length === 0 ? (
          <p className="muted">
            No parkrun events currently start with <strong>{letter}</strong>
            {letter === 'X'
              ? ' — X is the classic Alphabeteer gap worldwide right now.'
              : '.'}
          </p>
        ) : null}

        {nearest.length > 0 ? (
          <>
            <p className="muted" style={{ marginBottom: 8 }}>
              Nearest options from your location
            </p>
            <ul className="alphabeteer-list">
              {nearest.map((event, i) => (
                <li key={event.slug}>
                  <div className="alphabeteer-rank">{i + 1}</div>
                  <div className="alphabeteer-meta">
                    <a href={event.url} target="_blank" rel="noreferrer">
                      {event.name}
                    </a>
                    <div className="muted">
                      {event.location || event.country}
                      {event.country === 'INT' ? ' · abroad' : ` · ${event.country}`}
                    </div>
                  </div>
                  <div className="alphabeteer-dist">
                    {formatDistance(event.distanceKm)}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
