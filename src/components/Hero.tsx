import type { DashboardData } from '../types';

export function Hero({ data }: { data: DashboardData }) {
  const raceDate = new Date(data.focus.date + 'T00:00:00').toLocaleDateString(
    'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

  return (
    <header className="hero">
      <div className="left">
        <h1>{data.athlete.name}</h1>
        <div className="sub">{data.athlete.location} · Strava activity dashboard</div>
        <div className="quickstats">
          <div>
            <div className="num">{data.summary.activities}</div>
            <div className="lbl">Activities</div>
          </div>
          <div>
            <div className="num">{data.summary.runDistanceKm} km</div>
            <div className="lbl">Run distance</div>
          </div>
          <div>
            <div className="num">{data.summary.runs}</div>
            <div className="lbl">Runs</div>
          </div>
          <div>
            <div className="num">{data.summary.rides}</div>
            <div className="lbl">Rides</div>
          </div>
          <div>
            <div className="num">{data.summary.hikes}</div>
            <div className="lbl">Hikes</div>
          </div>
        </div>
        <div className="focus-badge">
          Training for {data.focus.race} — {raceDate} · Target {data.focus.target}
        </div>
      </div>
      <div className="profile-pic">{data.athlete.initials}</div>
    </header>
  );
}
