import type { ComplianceStatus, WeeklyCompliance } from '../types';

/** Tick for met, cross for missed, dash for partial/pending (not yet decided). */
function StatusIcon({ status }: { status: ComplianceStatus }) {
  if (status === 'met') return <span className="status-icon status-icon-met">✓</span>;
  if (status === 'missed') return <span className="status-icon status-icon-missed">✕</span>;
  return <span className="status-icon status-icon-neutral">–</span>;
}

export function ComplianceCard({ compliance }: { compliance: WeeklyCompliance }) {
  return (
    <div className="card">
      <h3 style={{ marginBottom: 6 }}>
        Week {compliance.weekNumber > 0 ? compliance.weekNumber : '—'} ·{' '}
        {compliance.phaseName}
      </h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 14 }}>
        {compliance.weekStart} → {compliance.weekEnd} · checked against your training
        plan (no AI) · recalculated on every sync
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
                <StatusIcon status={rule.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
