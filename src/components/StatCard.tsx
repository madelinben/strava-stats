export function StatCard({
  label,
  value,
  pace,
  sub,
}: {
  label: string;
  value: string;
  /** Optional average pace shown under the headline time. */
  pace?: string;
  sub: string;
}) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {pace ? <div className="stat-pace">{pace}</div> : null}
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
