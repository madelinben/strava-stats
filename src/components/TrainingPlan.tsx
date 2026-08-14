import {
  LONG_RUN_MILESTONES,
  RACE_NAME,
  TRAINING_PHASES,
} from '../data/trainingPlan';
import type { DashboardData } from '../types';

const TAG_CLASS = {
  easy: 'tag-easy',
  interval: 'tag-interval',
  long: 'tag-long',
  rest: 'tag-rest',
} as const;

const TAG_LABEL = {
  easy: 'Easy',
  interval: 'Speed',
  long: 'Long run',
  rest: 'Rest',
} as const;

export function TrainingPlan({
  analysis,
  focus,
}: {
  analysis: string;
  focus: DashboardData['focus'];
}) {
  const raceDate = new Date(focus.date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Split "How your data..." for bold lead-in
  const strongPrefix = 'How your data shaped this plan:';
  const body = analysis.startsWith(strongPrefix)
    ? analysis.slice(strongPrefix.length).trim()
    : analysis;

  return (
    <section id="running-plan">
      <h2>
        Running plan — {RACE_NAME}, {raceDate}
      </h2>

      <div className="analysis-box">
        <strong>{strongPrefix}</strong> {body}
      </div>

      {TRAINING_PHASES.map((phase) => (
        <div className="phase-block" key={phase.id}>
          <h3>
            <span className="phase-dot" style={{ background: phase.color }} />
            {phase.name} ({phase.weeks}, {phase.dates})
          </h3>
          <table className="plan">
            <thead>
              <tr>
                <th>Type</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {phase.rows.map((row) => (
                <tr key={`${phase.id}-${row.type}`}>
                  <td>
                    <span className={`tag ${TAG_CLASS[row.type]}`}>
                      {TAG_LABEL[row.type]}
                    </span>
                  </td>
                  <td>{row.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Long run distance progression</h3>
        <table className="plan">
          <thead>
            <tr>
              <th>Week</th>
              <th>Date (w/c)</th>
              <th>Long run</th>
            </tr>
          </thead>
          <tbody>
            {LONG_RUN_MILESTONES.map((m) => (
              <tr key={`${m.week}-${m.date}`}>
                <td>{m.week === 'race' ? 'Race day' : m.week}</td>
                <td>{m.date}</td>
                <td>
                  {m.week === 'race' ? <strong>{m.distance}</strong> : m.distance}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
