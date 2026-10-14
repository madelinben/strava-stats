import type { SportAggregate } from '../lib/sports';
import { StatCard } from './StatCard';

export function SportPanel({ label, aggregate }: { label: string; aggregate: SportAggregate }) {
  return (
    <section>
      <h2>{label} stats</h2>
      <div className="grid grid-3" style={{ marginBottom: 14 }}>
        <StatCard label="Activities logged" value={String(aggregate.count)} sub="" />
        <StatCard label="Total distance" value={`${aggregate.totalDistanceKm} km`} sub="" />
        <StatCard label="Total time" value={aggregate.totalTime} sub="" />
      </div>

      {aggregate.activities.length > 0 ? (
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Logged activities</h3>
          <table className="plan">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Distance</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {aggregate.activities.map((a) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>{a.name}</td>
                  <td>{a.distanceKm} km</td>
                  <td>{a.movingTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
