/**
 * Demand vs Supply table for admin dashboard.
 * Shows categories/occupations with Requests, Pros, Coverage status.
 * TODO: Wire to backend aggregation query when available.
 */

export type CoverageStatus = 'low' | 'balanced' | 'high';

export interface DemandSupplyRow {
  id: string;
  category: string;
  requests: number;
  pros: number;
  coverage: CoverageStatus;
}

interface DemandSupplyTableProps {
  /** Rows to display. If empty, shows placeholder with TODO. */
  rows: DemandSupplyRow[];
}

const coverageStyles: Record<CoverageStatus, string> = {
  low: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  balanced: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  high: 'bg-surface2 text-muted',
};

const coverageLabels: Record<CoverageStatus, string> = {
  low: 'Low',
  balanced: 'Balanced',
  high: 'High',
};

export function DemandSupplyTable({ rows }: DemandSupplyTableProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Demand vs Supply</h3>
      <div className="mt-3 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-muted">
            {/* TODO: Add backend query for category-level requests + pros aggregation */}
            No category data yet. Wire to occupations or service_categories aggregation.
          </p>
        ) : (
          <table className="w-full min-w-[280px] text-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="pb-2 pr-4 text-left font-medium text-text">Category</th>
                <th className="pb-2 pr-4 text-right font-medium text-text">Requests</th>
                <th className="pb-2 pr-4 text-right font-medium text-text">Pros</th>
                <th className="pb-2 text-right font-medium text-text">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0">
                  <td className="py-2 pr-4 text-text">{r.category}</td>
                  <td className="py-2 pr-4 text-right text-text">{r.requests}</td>
                  <td className="py-2 pr-4 text-right text-text">{r.pros}</td>
                  <td className="py-2 text-right">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${coverageStyles[r.coverage]}`}
                    >
                      {coverageLabels[r.coverage]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
