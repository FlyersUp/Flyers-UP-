'use client';

import Link from 'next/link';
import type { FlaggedPayoutReviewItem } from '@/lib/admin/flagged-payout-review';
import { ApprovePayoutNowButton } from '@/components/admin/ApprovePayoutNowButton';
import { KeepPayoutOnHoldButton } from '@/components/admin/KeepPayoutOnHoldButton';
import { RefundCustomerButton } from '@/components/admin/RefundCustomerButton';
import {
  flaggedPayoutReviewNeedsTransferRetry,
  getAdminPayoutReleaseCtaMode,
  getAdminPayoutReviewScanPill,
  getAdminPayoutTransferFailureHelper,
  isBookingRefundedForAdminPayoutActions,
  payoutReviewLooksLikeStripeTransferIssue,
} from '@/lib/admin/admin-payout-review-ui';

function formatMoney(cents: number | null) {
  if (cents == null || cents <= 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

type Props = {
  bookingId: string;
  data: FlaggedPayoutReviewItem;
  onReleased?: () => void | Promise<void>;
  onHeld?: () => void | Promise<void>;
  onRefunded?: () => void | Promise<void>;
};

function scanBadgeClass(tone: 'amber' | 'red' | 'emerald' | 'neutral'): string {
  switch (tone) {
    case 'amber':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200';
    case 'red':
      return 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200';
    case 'emerald':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200';
    default:
      return 'bg-surface2 text-muted';
  }
}

export function AdminBookingPayoutReviewCard({ bookingId, data, onReleased, onHeld, onRefunded }: Props) {
  const scan = getAdminPayoutReviewScanPill(data);
  const refunded = isBookingRefundedForAdminPayoutActions(data);
  const releaseMode = getAdminPayoutReleaseCtaMode(data);
  const transferRetry = flaggedPayoutReviewNeedsTransferRetry(data);

  return (
    <section className="rounded-[18px] border border-amber-200/80 bg-amber-50/40 p-5 shadow-card dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-text">Payout under review</h2>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${scanBadgeClass(scan.tone)}`}
            >
              {scan.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            This booking is held for admin review before funds can move to the pro.
          </p>
        </div>
        {!refunded ? (
          <div className="flex flex-shrink-0 flex-wrap items-start justify-end gap-2">
            <KeepPayoutOnHoldButton bookingId={bookingId} onHeld={onHeld} />
            <RefundCustomerButton bookingId={bookingId} onRefunded={onRefunded} />
            {releaseMode !== 'hidden' ? (
              <ApprovePayoutNowButton
                bookingId={bookingId}
                mode={releaseMode === 'retry' ? 'retry' : 'approve'}
                onReleased={onReleased}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {transferRetry ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50/90 p-3 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
          <p className="font-semibold">
            {payoutReviewLooksLikeStripeTransferIssue(data)
              ? 'Transfer attempt failed'
              : 'Payout release did not complete'}
          </p>
          <p className="mt-1 text-xs leading-relaxed opacity-95">{getAdminPayoutTransferFailureHelper(data)}</p>
        </div>
      ) : null}

      {data.queueLastReleaseMessage || data.queueLastReleaseErrorPhase ? (
        <div className="mt-3 rounded-xl border border-hairline bg-surface2/60 px-3 py-2 text-xs text-muted">
          <p className="font-semibold text-text">Last release attempt</p>
          {data.queueLastReleaseMessage ? (
            <p className="mt-1 text-sm text-text">{data.queueLastReleaseMessage}</p>
          ) : null}
          {data.queueLastReleaseErrorPhase ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted">
              Phase: {data.queueLastReleaseErrorPhase}
            </p>
          ) : null}
        </div>
      ) : null}

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-text">System flag</dt>
          <dd className="mt-0.5 text-sm text-text">{data.payoutHoldReason ?? '—'}</dd>
          <p className="mt-1 text-[11px] leading-snug text-muted">
            Automated signal from completion, payments, or risk (not written by an admin).
          </p>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-text">Admin note</dt>
          <dd className="mt-0.5 text-sm text-text">{data.queueHoldReason ?? '—'}</dd>
          <p className="mt-1 text-[11px] leading-snug text-muted">
            From your last <span className="font-medium text-text/90">keep on hold</span> — why the payout is still
            blocked for follow-up.
          </p>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-text">Internal note (staff)</dt>
          <dd className="mt-0.5 text-xs text-text">{data.queueInternalNote ?? '—'}</dd>
          <p className="mt-1 text-[11px] leading-snug text-muted">Not shown to customers or pros.</p>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Payout status (DB)</dt>
          <dd className="mt-0.5 font-mono text-xs">{data.payoutStatus ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Queue row status</dt>
          <dd className="mt-0.5 font-mono text-xs">{data.queueStatus ?? '—'}</dd>
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
            {data.bookingPayoutRowStatus ? (
              <span className="mt-1 block text-[11px] text-muted">
                booking_payouts status: {data.bookingPayoutRowStatus}
              </span>
            ) : null}
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
