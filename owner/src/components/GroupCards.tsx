import type { GroupStats } from '../types';

export function GroupCards({ groups }: { groups: GroupStats[] }) {
  return (
    <div className="grid grid-3">
      {groups.map((g) => (
        <div className="card group-card" key={g.id}>
          <h3>
            {g.name}{' '}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
              · {g.schedule}
            </span>
          </h3>
          <table className="plan" style={{ marginTop: 8 }}>
            <tbody>
              <tr>
                <td>Runs logged</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{g.runs}</td>
              </tr>
              <tr>
                <td>Total distance</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {g.totalDistanceKm.toFixed(2)} km
                </td>
              </tr>
              <tr>
                <td>Avg distance</td>
                <td style={{ textAlign: 'right' }}>{g.avgDistanceKm.toFixed(2)} km</td>
              </tr>
              <tr>
                <td>Avg pace</td>
                <td style={{ textAlign: 'right' }}>{g.avgPacePerKm} /km</td>
              </tr>
              <tr>
                <td>Fastest pace</td>
                <td style={{ textAlign: 'right', color: 'var(--run)', fontWeight: 600 }}>
                  {g.fastestPacePerKm} /km
                </td>
              </tr>
              <tr>
                <td>Total elevation</td>
                <td style={{ textAlign: 'right' }}>{g.totalElevationM} m</td>
              </tr>
              <tr>
                <td>Last run</td>
                <td style={{ textAlign: 'right' }}>{g.lastRun ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
