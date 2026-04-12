'use client';

import Link from 'next/link';
import type { FlaggedPayoutReviewItem } from '@/lib/admin/flagged-payout-review';
import { ApprovePayoutNowButton } from '@/components/admin/ApprovePayoutNowButton';

function formatMoney(cents: number | null) {
  if (cents == null || cents <= 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

type Props = {
  bookingId: string;
  data: FlaggedPayoutReviewItem;
  onReleased?: () => void | Promise<void>;
};

export function AdminBookingPayoutReviewCard({ bookingId, data, onReleased }: Props) {
  return (
    <section className="rounded-[18px] border border-amber-200/80 bg-amber-50/40 p-5 shadow-card dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">Payout under review</h2>
          <p className="mt-1 text-sm text-muted">
            This booking is held for admin review before funds can move to the pro.
          </p>
        </div>
        <ApprovePayoutNowButton bookingId={bookingId} onReleased={onReleased} />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Hold reason</dt>
          <dd className="mt-0.5">{data.payoutHoldReason ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Completed at</dt>
          <dd className="mt-0.5">{data.completedAt ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Duration (actual / expected min)</dt>
          <dd className="mt-0.5">
            {data.actualDurationMinutes != null ? `${data.actualDurationMinutes}` : '—'}
            {data.minimumExpectedDurationMinutes != null ? ` / ${data.minimumExpectedDurationMinutes}` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Payout (est.)</dt>
          <dd className="mt-0.5 font-medium">{formatMoney(data.payoutAmountCents)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Payments</dt>
          <dd className="mt-0.5">
            Deposit: {data.depositPaid ? 'Yes' : 'No'} · Final: {data.finalPaid ? 'Yes' : 'No'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">After photos</dt>
          <dd className="mt-0.5">{data.afterPhotoCount} valid</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Dispute / refund</dt>
          <dd className="mt-0.5">
            Dispute: {data.disputeOpen ? 'Open' : data.disputeStatus ?? 'none'} · Refund: {data.refundStatus ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Stripe Connect</dt>
          <dd className="mt-0.5">
            {!data.connectDestinationPresent
              ? 'No destination'
              : data.stripeChargesEnabled === true
                ? 'Charges enabled'
                : data.stripeChargesEnabled === false
                  ? 'Charges not enabled'
                  : 'Unknown'}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Lifecycle</dt>
          <dd className="mt-0.5 font-mono text-xs break-all">{data.paymentLifecycleStatus ?? '—'}</dd>
        </div>
      </dl>

      {data.suspiciousCompletion ? (
        <p className="mt-3 text-xs text-amber-900 dark:text-amber-200">
          Suspicious completion: {data.suspiciousCompletionReason ?? 'flagged'}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 border-t border-hairline pt-4 text-sm">
        <Link href="/admin/payments/payout-review" className="font-medium text-accent hover:underline">
          View payout queue
        </Link>
        <Link href={`/admin/bookings/${bookingId}/payments`} className="text-muted hover:text-text">
          Payment audit
        </Link>
      </div>
    </section>
  );
}
