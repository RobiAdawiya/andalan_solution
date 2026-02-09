export default function StatCard({ label, count }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <div className="stat-count">{count}</div>
    </div>
  );
}