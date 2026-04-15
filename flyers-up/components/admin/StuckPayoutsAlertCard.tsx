import Link from 'next/link';
import type { StuckPayoutBooking } from '@/lib/bookings/stuck-payout-detector';

/**
 * Admin home banner when {@link findStuckPayoutBookings} finds transfer-eligible rows still unreleased.
 */
export function StuckPayoutsAlertCard({ items }: { items: StuckPayoutBooking[] }) {
  if (items.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-text shadow-sm dark:border-amber-900/40 dark:bg-amber-950/30"
      aria-label="Stuck payouts alert"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            Possible stuck payouts ({items.length})
          </h2>
          <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-200/90">
            Final balance is settled and automatic release looks eligible, but Stripe transfer has not completed
            within the monitoring window. Check cron selection, Connect errors, or recent deploys.
          </p>
        </div>
        <Link
          href="/admin/errors"
          className="shrink-0 text-xs font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200"
        >
          Error logs →
        </Link>
      </div>
      <ul className="mt-3 space-y-2 text-xs">
        {items.map((s) => (
          <li key={s.bookingId} className="rounded-lg border border-amber-200/80 bg-white/60 p-2 dark:border-amber-900/50 dark:bg-black/20">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link
                href={`/admin/bookings/${s.bookingId}`}
                title={s.bookingId}
                className="font-mono text-xs font-medium text-accent hover:underline"
              >
                {s.bookingId.slice(0, 8)}…
              </Link>
              <span className="text-muted">status</span>
              <code className="rounded bg-surface2 px-1 py-0.5">{s.status}</code>
              <span className="text-muted">lifecycle</span>
              <code className="rounded bg-surface2 px-1 py-0.5">{s.paymentLifecycleStatus ?? '—'}</code>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted">{s.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
