/**
 * Platform Alerts card for admin dashboard.
 * Shows: jobs waiting too long, failed payments, refund/dispute count, flagged pros/users.
 */

export interface AlertItem {
  id: string;
  label: string;
  count: number;
  severity: 'info' | 'warning' | 'critical';
  href?: string;
}

interface AlertListProps {
  /** Alerts to display. If empty, shows placeholder. */
  alerts: AlertItem[];
}

const severityStyles = {
  info: 'bg-surface2 text-muted',
  warning: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  critical: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300',
};

export function AlertList({ alerts }: AlertListProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Platform Alerts</h3>
      <div className="mt-3 space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted">No alerts right now.</p>
        ) : (
          alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${severityStyles[a.severity]}`}
            >
              <span>{a.label}</span>
              <span className="font-medium">{a.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
