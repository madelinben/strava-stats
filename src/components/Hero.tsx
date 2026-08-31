import type { GeneratedPlan } from '../lib/trainingPlan';
import type { DashboardData, YearBundle } from '../types';

export function Hero({
  athlete,
  plan,
  summary,
}: {
  athlete: DashboardData['athlete'];
  plan: GeneratedPlan | null;
  summary: YearBundle['summary'];
}) {
  const raceDate = plan
    ? new Date(plan.raceDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <header className="hero">
      <div className="left">
        <h1>{athlete.name}</h1>
        <div className="sub">{athlete.location} · Strava activity dashboard</div>
        <div className="quickstats">
          <div>
            <div className="num">{summary.activities}</div>
            <div className="lbl">Activities</div>
          </div>
          <div>
            <div className="num">{summary.runDistanceKm} km</div>
            <div className="lbl">Run distance</div>
          </div>
          <div>
            <div className="num">{summary.runs}</div>
            <div className="lbl">Runs</div>
          </div>
          <div>
            <div className="num">{summary.rides}</div>
            <div className="lbl">Rides</div>
          </div>
          <div>
            <div className="num">{summary.hikes}</div>
            <div className="lbl">Hikes</div>
          </div>
        </div>
        <div className="focus-badge">
          {plan
            ? `Training for ${plan.raceName} — ${raceDate}${plan.raceTarget ? ` · Target ${plan.raceTarget}` : ''}`
            : 'No upcoming milestone set — star an event to build a training plan'}
        </div>
      </div>
      <div className="profile-pic">{athlete.initials}</div>
    </header>
  );
}
