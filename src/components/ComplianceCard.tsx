import type { ComplianceStatus, WeeklyCompliance } from '../types';

function statusClass(status: ComplianceStatus): string {
  switch (status) {
    case 'met':
      return 'status-met';
    case 'partial':
      return 'status-partial';
    case 'missed':
      return 'status-missed';
    case 'pending':
      return 'status-pending';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function ComplianceCard({ compliance }: { compliance: WeeklyCompliance }) {
  return (
    <div className="card">
      <h3 style={{ marginBottom: 6 }}>
        Week {compliance.weekNumber > 0 ? compliance.weekNumber : '—'} ·{' '}
        {compliance.phaseName}
      </h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 14 }}>
        {compliance.weekStart} → {compliance.weekEnd} · checked against the scripted
        Liverpool Half plan (no AI)
      </p>
      <table className="plan">
        <thead>
          <tr>
            <th>Check</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {compliance.rules.map((rule) => (
            <tr key={rule.id}>
              <td>{rule.label}</td>
              <td>{rule.expected}</td>
              <td>{rule.actual}</td>
              <td>
                <span className={`status-pill ${statusClass(rule.status)}`}>
                  {rule.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
