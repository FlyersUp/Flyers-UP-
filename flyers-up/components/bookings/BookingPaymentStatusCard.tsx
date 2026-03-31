'use client';

/**
 * Payment status card: total, deposit, remaining, and status/coundowns.
 * CTAs via callbacks (caller wires to checkout/confirm).
 */

import { BookingCountdown } from './BookingCountdown';
import { RemainingDueCountdown } from './RemainingDueCountdown';
import { AutoConfirmCountdown } from './AutoConfirmCountdown';
import { PriceRow } from '@/components/ui/PriceRow';

function formatCents(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export interface BookingPaymentStatusCardProps {
  status: string;
  paymentDueAt?: string | null;
  remainingDueAt?: string | null;
  autoConfirmAt?: string | null;
  paidDepositAt?: string | null;
  paidRemainingAt?: string | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  platformFeeCents?: number | null;
  refundedTotalCents?: number | null;
  /** Pro-only: show trust-first earnings reassurance */
  view?: 'customer' | 'pro';
  onPayDeposit?: () => void;
  onPayRemaining?: () => void;
  onConfirmCompletion?: () => void;
  payDepositSlot?: React.ReactNode;
  payRemainingSlot?: React.ReactNode;
  confirmSlot?: React.ReactNode;
}

export function BookingPaymentStatusCard({
  status,
  paymentDueAt,
  remainingDueAt,
  autoConfirmAt,
  paidDepositAt,
  paidRemainingAt,
  amountDeposit,
  amountRemaining,
  amountTotal,
  refundedTotalCents,
  view = 'customer',
  onPayDeposit,
  onPayRemaining,
  onConfirmCompletion,
  payDepositSlot,
  payRemainingSlot,
  confirmSlot,
}: BookingPaymentStatusCardProps) {
  const total = amountTotal ?? 0;
  const deposit = amountDeposit ?? 0;
  const remaining = amountRemaining ?? 0;
  const refunded = refundedTotalCents ?? 0;
  const proTakeHome = Math.max(0, total - refunded);

  const awaitingDeposit =
    status === 'awaiting_deposit_payment' ||
    status === 'payment_required' ||
    status === 'accepted';
  const depositPaid = !!paidDepositAt || status === 'deposit_paid';
  const awaitingRemaining = status === 'awaiting_remaining_payment';
  const awaitingConfirmation = status === 'awaiting_customer_confirmation';
  const remainingPaid = !!paidRemainingAt || status === 'fully_paid' || status === 'paid';
  const cancelledExpired = status === 'cancelled_expired' || status === 'expired_unpaid';

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-3 text-sm font-medium text-muted">Payment</h3>

      {/* Amount breakdown */}
      {total > 0 && (
        <div className="mb-4 space-y-1">
          <PriceRow label="Total" value={formatCents(total)} emphasize />
          {deposit > 0 && (
            <PriceRow label="Deposit" value={formatCents(deposit)} />
          )}
          {remaining > 0 && (
            <PriceRow label="Remaining" value={formatCents(remaining)} />
          )}
          {view === 'pro' && (
            <div className="mt-2 rounded-xl border border-[hsl(var(--accent-customer)/0.2)] bg-[hsl(var(--accent-customer)/0.06)] p-3">
              <p className="text-sm font-semibold text-[hsl(var(--accent-customer))]">You keep what you earn</p>
              <p className="mt-1 text-xs text-muted">
                You keep 100% of your service price. Customers pay marketplace & protection fees separately.
              </p>
              <p className="mt-1 text-xs font-medium text-primary">No hidden cuts. No surprises.</p>
              {proTakeHome > 0 ? (
                <p className="mt-2 text-sm font-semibold text-primary">Current earnings: {formatCents(proTakeHome)}</p>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div className="text-sm">
        {cancelledExpired && (
          <p className="font-medium text-primary">Deposit expired — booking cancelled</p>
        )}
        {awaitingDeposit && !depositPaid && (
          <>
            <p className="font-medium text-primary">Deposit due</p>
            {paymentDueAt && (
              <p className="mt-1 text-xs text-muted">
                Time remaining: <BookingCountdown status={status} paymentDueAt={paymentDueAt} className="ml-1 text-amber-700 font-medium" />
              </p>
            )}
            {(payDepositSlot || onPayDeposit) && (
              <div className="mt-3">{payDepositSlot ?? <button type="button" onClick={onPayDeposit} className="inline-flex h-10 items-center justify-center rounded-full border border-[hsl(var(--accent-pro)/0.6)] bg-[hsl(var(--accent-pro))] px-4 text-sm font-semibold text-[hsl(var(--accent-contrast))] hover:brightness-95">Pay deposit {deposit > 0 ? formatCents(deposit) : ''}</button>}</div>
            )}
          </>
        )}
        {depositPaid && awaitingRemaining && !remainingPaid && (
          <>
            <p className="font-medium text-primary">Remaining due</p>
            {remainingDueAt && (
              <p className="mt-1 text-xs text-muted">
                Due: <RemainingDueCountdown remainingDueAt={remainingDueAt} className="text-amber-700 font-medium" />
              </p>
            )}
            {(payRemainingSlot || onPayRemaining) && (
              <div className="mt-3">{payRemainingSlot ?? <button type="button" onClick={onPayRemaining} className="inline-flex h-10 items-center justify-center rounded-full border border-[hsl(var(--accent-pro)/0.6)] bg-[hsl(var(--accent-pro))] px-4 text-sm font-semibold text-[hsl(var(--accent-contrast))] hover:brightness-95">Pay remaining {remaining > 0 ? formatCents(remaining) : ''}</button>}</div>
            )}
          </>
        )}
        {depositPaid && !awaitingRemaining && !remainingPaid && remaining > 0 && (
          <p className="text-muted">Remaining {formatCents(remaining)} due after completion</p>
        )}
        {awaitingConfirmation && (
          <>
            <p className="font-medium text-primary">Confirm completion</p>
            {autoConfirmAt && (
              <p className="mt-1 text-xs text-muted">
                <AutoConfirmCountdown autoConfirmAt={autoConfirmAt} />
              </p>
            )}
            {(confirmSlot || onConfirmCompletion) && (
              <div className="mt-3">{confirmSlot ?? <button type="button" onClick={onConfirmCompletion} className="inline-flex h-10 items-center justify-center rounded-full border border-[hsl(var(--accent-pro)/0.6)] bg-[hsl(var(--accent-pro))] px-4 text-sm font-semibold text-[hsl(var(--accent-contrast))] hover:brightness-95">Confirm completion</button>}</div>
            )}
          </>
        )}
        {remainingPaid && !awaitingConfirmation && (
          <p className="font-medium text-primary">Fully paid ✓</p>
        )}
      </div>
    </div>
  );
}
