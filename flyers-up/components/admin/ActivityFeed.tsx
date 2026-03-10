/**
 * Live Activity Feed for admin dashboard.
 * Shows: recent bookings, pro accepted job, completed job, refund requested.
 * TODO: Wire to real-time or polling data source when available.
 */

export interface ActivityItem {
  id: string;
  type: 'booking' | 'accepted' | 'completed' | 'refund_requested' | 'payment_failed';
  message: string;
  timestamp: string;
  href?: string;
}

interface ActivityFeedProps {
  /** Activity items. If empty, shows placeholder rows with TODO. */
  items: ActivityItem[];
}

const typeLabels: Record<ActivityItem['type'], string> = {
  booking: 'New booking',
  accepted: 'Pro accepted',
  completed: 'Completed',
  refund_requested: 'Refund requested',
  payment_failed: 'Payment failed',
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Live Activity</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <>
            {/* TODO: Replace with real activity feed when backend supports it */}
            <div className="rounded-lg bg-surface2/50 px-3 py-2 text-sm text-muted">
              <span className="font-medium">Recent booking</span>
              <span className="ml-2">—</span>
            </div>
            <div className="rounded-lg bg-surface2/50 px-3 py-2 text-sm text-muted">
              <span className="font-medium">Pro accepted job</span>
              <span className="ml-2">—</span>
            </div>
            <div className="rounded-lg bg-surface2/50 px-3 py-2 text-sm text-muted">
              <span className="font-medium">Completed job</span>
              <span className="ml-2">—</span>
            </div>
            <p className="pt-1 text-xs text-muted">Waiting for live data</p>
          </>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg bg-surface2/50 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{typeLabels[item.type]}</span>
                <span className="ml-2 text-muted">{item.message}</span>
              </span>
              <span className="text-xs text-muted">{item.timestamp}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
