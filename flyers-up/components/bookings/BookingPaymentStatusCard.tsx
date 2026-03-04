'use client';

/**
 * Payment status card: total, deposit, remaining, deposit/remaining status, countdowns.
 * Pro view: platform fee, net to pro.
 * CTAs via callbacks (caller wires to checkout/confirm).
 */

import { BookingCountdown } from './BookingCountdown';
import { RemainingDueCountdown } from './RemainingDueCountdown';
import { AutoConfirmCountdown } from './AutoConfirmCountdown';

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
  /** Pro-only: show platform fee and net to pro */
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
  platformFeeCents,
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
  const platformFee = platformFeeCents ?? 0;
  const refunded = refundedTotalCents ?? 0;
  const netToPro = Math.max(0, total - platformFee - refunded);

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
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-medium text-[#6A6A6A] mb-3">Payment</h3>

      {/* Amount breakdown */}
      {total > 0 && (
        <div className="space-y-1 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-[#6A6A6A]">Total</span>
            <span className="text-[#111111] font-medium">{formatCents(total)}</span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between">
              <span className="text-[#6A6A6A]">Deposit</span>
              <span className="text-[#111111]">{formatCents(deposit)}</span>
            </div>
          )}
          {remaining > 0 && (
            <div className="flex justify-between">
              <span className="text-[#6A6A6A]">Remaining</span>
              <span className="text-[#111111]">{formatCents(remaining)}</span>
            </div>
          )}
          {view === 'pro' && platformFee > 0 && (
            <div className="flex justify-between text-[#6A6A6A]">
              <span>Platform fee</span>
              <span>{formatCents(platformFee)}</span>
            </div>
          )}
          {view === 'pro' && netToPro > 0 && (
            <div className="flex justify-between font-medium text-[#111111] pt-1 border-t border-black/10">
              <span>Net to you</span>
              <span>{formatCents(netToPro)}</span>
            </div>
          )}
        </div>
      )}

      {/* Status */}
      <div className="text-sm">
        {cancelledExpired && (
          <p className="font-medium text-[#111111]">Deposit expired — booking cancelled</p>
        )}
        {awaitingDeposit && !depositPaid && (
          <>
            <p className="font-medium text-[#111111]">Deposit due</p>
            {paymentDueAt && (
              <p className="text-xs text-[#6A6A6A] mt-1">
                Time remaining: <BookingCountdown status={status} paymentDueAt={paymentDueAt} className="ml-1 text-amber-700 font-medium" />
              </p>
            )}
            {(payDepositSlot || onPayDeposit) && (
              <div className="mt-3">{payDepositSlot ?? <button type="button" onClick={onPayDeposit} className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95">Pay deposit {deposit > 0 ? formatCents(deposit) : ''}</button>}</div>
            )}
          </>
        )}
        {depositPaid && awaitingRemaining && !remainingPaid && (
          <>
            <p className="font-medium text-[#111111]">Remaining due</p>
            {remainingDueAt && (
              <p className="text-xs text-[#6A6A6A] mt-1">
                Due: <RemainingDueCountdown remainingDueAt={remainingDueAt} className="text-amber-700 font-medium" />
              </p>
            )}
            {(payRemainingSlot || onPayRemaining) && (
              <div className="mt-3">{payRemainingSlot ?? <button type="button" onClick={onPayRemaining} className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95">Pay remaining {remaining > 0 ? formatCents(remaining) : ''}</button>}</div>
            )}
          </>
        )}
        {depositPaid && !awaitingRemaining && !remainingPaid && remaining > 0 && (
          <p className="text-[#6A6A6A]">Remaining {formatCents(remaining)} due after completion</p>
        )}
        {awaitingConfirmation && (
          <>
            <p className="font-medium text-[#111111]">Confirm completion</p>
            {autoConfirmAt && (
              <p className="text-xs text-[#6A6A6A] mt-1">
                <AutoConfirmCountdown autoConfirmAt={autoConfirmAt} />
              </p>
            )}
            {(confirmSlot || onConfirmCompletion) && (
              <div className="mt-3">{confirmSlot ?? <button type="button" onClick={onConfirmCompletion} className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95">Confirm completion</button>}</div>
            )}
          </>
        )}
        {remainingPaid && !awaitingConfirmation && (
          <p className="font-medium text-[#111111]">Fully paid ✓</p>
        )}
      </div>
    </div>
  );
}
