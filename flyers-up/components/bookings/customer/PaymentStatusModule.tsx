'use client';

/**
 * Legacy customer payment strip (deposit / final / countdown).
 * Prefer `BookingPaymentStatusCard` with `paymentInput` from
 * `customerRemainingPaymentUiInputFromBookingSlice` so review deadlines and money state match
 * the booking detail + job-complete flows.
 *
 * Guardrail: do not introduce new call sites that assemble
 * `CustomerRemainingPaymentUiInput` (or this module’s prop bag) by hand; see
 * `lib/bookings/customer-remaining-payment-ui.ts` module doc and `eslint.config.mjs`.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useHydrated } from '@/hooks/useHydrated';
import { formatBookingDateTimeInZone } from '@/lib/datetime';
import { bookingFinalCheckoutPath } from '@/lib/bookings/booking-routes';
import { PaymentCountdown } from '@/components/bookings/customer/PaymentCountdown';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function CountdownDisplay({ paymentDueAt }: { paymentDueAt: string }) {
  const [remaining, setRemaining] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const due = new Date(paymentDueAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, due - now);
      if (diff <= 0) {
        setRemaining('Expired');
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [paymentDueAt]);

  return <span className="text-amber-700">{remaining}</span>;
}

export interface PaymentStatusModuleProps {
  bookingId: string;
  status: string;
  paymentStatus?: string;
  finalPaymentStatus?: string | null;
  paymentDueAt?: string | null;
  /** When set, shows “Auto-charging in …” during review window before balance is due. */
  customerReviewDeadlineAt?: string | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  paidAt?: string | null;
  fullyPaidAt?: string | null;
}

const checkoutBase = (id: string) => `/customer/bookings/${id}/deposit`;

export function PaymentStatusModule({
  bookingId,
  status,
  paymentStatus = 'UNPAID',
  finalPaymentStatus,
  paymentDueAt,
  customerReviewDeadlineAt,
  amountDeposit,
  amountRemaining,
  amountTotal,
  paidAt,
  fullyPaidAt,
}: PaymentStatusModuleProps) {
  const hydrated = useHydrated();
  const isPaid = paymentStatus === 'PAID';
  const isFullyPaid = finalPaymentStatus === 'PAID' || status === 'fully_paid' || status === 'paid';
  const finalFailed = String(finalPaymentStatus ?? '').toUpperCase() === 'FAILED' && !isFullyPaid;
  const isExpired = status === 'expired_unpaid';
  const isPaymentRequired =
    status === 'payment_required' ||
    status === 'accepted' ||
    status === 'accepted_pending_payment' ||
    status === 'awaiting_deposit_payment';
  const isDepositPaid = status === 'deposit_paid' || (isPaid && !isFullyPaid);
  // Only show "Pay remaining" after pro has completed (backend enforces same)
  const isReadyForFinal =
    ['completed_pending_payment', 'awaiting_payment', 'awaiting_remaining_payment'].includes(status) &&
    isPaid &&
    !isFullyPaid;

  if (isExpired) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="text-sm font-medium text-[#6A6A6A] mb-2">Payment &amp; status</h3>
        <p className="text-sm font-medium text-[#111111]">Expired — not paid</p>
        <p className="text-xs text-[#6A6A6A] mt-1">The payment window has passed.</p>
        <Link
          href="/customer/bookings"
          className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium text-black bg-[#FFC067] hover:brightness-95 mt-3"
        >
          Request again
        </Link>
      </div>
    );
  }

  if (isPaymentRequired && !isPaid && paymentDueAt) {
    const due = new Date(paymentDueAt).getTime();
    const expired = hydrated && Date.now() >= due;
    if (expired) {
      return (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
          <h3 className="text-sm font-medium text-[#6A6A6A] mb-2">Payment &amp; status</h3>
          <p className="text-sm font-medium text-[#111111]">Payment window expired</p>
          <Link
            href={`/customer/bookings/${bookingId}`}
            className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-medium text-black bg-[#FFC067] hover:brightness-95 mt-3"
          >
            Return to booking
          </Link>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="text-sm font-medium text-[#6A6A6A] mb-2">Payment &amp; status</h3>
        <p className="text-sm font-medium text-[#111111]">Pay deposit to lock your time</p>
        <p className="text-xs text-[#6A6A6A] mt-1">
          Time remaining: <CountdownDisplay paymentDueAt={paymentDueAt} />
        </p>
        <Link
          href={`${checkoutBase(bookingId)}`}
          className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 mt-3"
        >
          Pay deposit {amountDeposit != null ? formatCents(amountDeposit) : ''}
        </Link>
      </div>
    );
  }

  if (isDepositPaid) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="text-sm font-medium text-[#6A6A6A] mb-2">Payment &amp; status</h3>
        <p className="text-sm font-medium text-[#111111]">Deposit paid ✓</p>
        <p className="text-xs text-[#6A6A6A] mt-1">
          {amountRemaining != null && amountRemaining > 0
            ? `Remaining ${formatCents(amountRemaining)} due after job completion`
            : 'Remainder due after completion'}
        </p>
        {paidAt && (
          <p className="text-xs text-[#6A6A6A] mt-1">
            Paid at {formatBookingDateTimeInZone(new Date(paidAt).toISOString())}
          </p>
        )}
      </div>
    );
  }

  if (finalFailed) {
    return (
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
        <h3 className="text-sm font-medium text-[#6A6A6A] dark:text-amber-200/90 mb-2">Payment &amp; status</h3>
        <p className="text-sm font-medium text-[#111111] dark:text-amber-50">Remaining payment failed</p>
        <p className="text-xs text-[#6A6A6A] dark:text-amber-100/80 mt-1">
          Update your card or try again. Your balance is still due.
        </p>
        <Link
          href={bookingFinalCheckoutPath(bookingId)}
          className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 mt-3"
        >
          Retry payment {amountRemaining != null ? formatCents(amountRemaining) : ''}
        </Link>
      </div>
    );
  }

  if (isReadyForFinal) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="text-sm font-medium text-[#6A6A6A] mb-2">Payment &amp; status</h3>
        <p className="text-sm font-medium text-[#111111]">Job completed — balance due</p>
        {customerReviewDeadlineAt ? (
          <div className="mt-2">
            <PaymentCountdown deadlineIso={customerReviewDeadlineAt} />
          </div>
        ) : (
          <p className="text-xs text-[#6A6A6A] mt-1">
            Pay the rest of your booking. Your deposit is already applied.
          </p>
        )}
        <Link
          href={bookingFinalCheckoutPath(bookingId)}
          className="inline-flex items-center justify-center h-10 px-4 rounded-full text-sm font-semibold text-black bg-[#FFC067] hover:brightness-95 mt-3"
        >
          Pay balance {amountRemaining != null ? formatCents(amountRemaining) : ''}
        </Link>
      </div>
    );
  }

  if (isFullyPaid) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
        <h3 className="text-sm font-medium text-[#6A6A6A] mb-2">Payment &amp; status</h3>
        <p className="text-sm font-medium text-[#111111]">Paid ✓</p>
        {fullyPaidAt && (
          <p className="text-xs text-[#6A6A6A] mt-1">
            Paid at {formatBookingDateTimeInZone(new Date(fullyPaidAt).toISOString())}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" style={{ backgroundColor: '#FFFFFF' }}>
      <h3 className="text-sm font-medium text-[#6A6A6A] mb-2">Payment &amp; status</h3>
      <p className="text-sm text-[#3A3A3A]">
        {paymentStatus === 'PAID' ? 'Paid' : paymentStatus === 'UNPAID' ? 'Unpaid' : paymentStatus}
      </p>
    </div>
  );
}
