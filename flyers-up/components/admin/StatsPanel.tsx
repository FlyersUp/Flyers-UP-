/**
 * Stats panel for Pro/Customer/Revenue sections.
 * Compact stat rows for dashboard overview.
 */

interface StatRow {
  label: string;
  value: string | number;
}

interface StatsPanelProps {
  title: string;
  stats: StatRow[];
}

export function StatsPanel({ title, stats }: StatsPanelProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
      <div className="mt-3 space-y-2">
        {stats.map((s, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted">{s.label}</span>
            <span className="font-medium text-text">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
