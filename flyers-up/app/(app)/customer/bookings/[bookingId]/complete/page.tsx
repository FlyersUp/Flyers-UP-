'use client';

/**
 * Job Completed + Pay Remaining
 *
 * DESIGN DOCUMENT
 * ===============
 *
 * 1. USER INTENT + FRICTION ANALYSIS
 * - Intent: Customer has tracked a completed job; they need to pay the remaining balance with confidence.
 * - Friction: "Did the pro really finish?" "Is the amount correct?" "What if something's wrong?"
 * - Mitigation: Completion evidence (photos, notes), Stripe-style payment clarity, protection copy, report-before-pay option.
 *
 * 2. REFERENCE PATTERNS
 * - Stripe: Billing clarity, line-item hierarchy, no mental math.
 * - Airbnb: Booking recap warmth, trust cues.
 * - Uber: State clarity (completed, payment due).
 * - Apple: Polish, restraint, generous whitespace.
 *
 * 3. PAGE STRUCTURE
 * - Completion header → Booking recap → Completion evidence → Payment summary → Protection → Actions
 *
 * 4. COMPONENT BREAKDOWN
 * - JobCompletePage (orchestrator)
 * - CompletionHeader, BookingRecapCard, CompletionEvidenceSection, PaymentSummaryCard,
 *   ProtectionSection, ActionBar
 *
 * 5. RESPONSIVE
 * - Mobile-first; cards stack; sticky primary CTA on mobile; desktop max-w-lg centered.
 *
 * 6. STATES
 * - loading, completed/payment_due, payment_processing (redirect to checkout), payment_success,
 *   issue_reported, error
 *
 * 7. ACCESSIBILITY
 * - Semantic sections, aria-labels, focus management, no color-only status.
 */

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { isCustomerMoneyFullySettled } from '@/lib/bookings/customer-payment-settled';
import { shouldShowCustomerPayRemainingCta } from '@/lib/bookings/customer-booking-actions';

type PageState =
  | 'loading'
  | 'completed'
  | 'payment_success'
  | 'needs_completion_confirm'
  | 'error'
  | 'not_eligible';

interface BookingData {
  id: string;
  status: string;
  paymentStatus?: string;
  finalPaymentStatus?: string | null;
  paidDepositAt?: string | null;
  paidRemainingAt?: string | null;
  fullyPaidAt?: string | null;
  amountDeposit?: number | null;
  amountRemaining?: number | null;
  amountTotal?: number | null;
  platformFeeCents?: number | null;
  serviceName?: string;
  proName?: string;
  proPhotoUrl?: string | null;
  serviceDate?: string;
  serviceTime?: string;
  address?: string | null;
  notes?: string | null;
  completedAt?: string | null;
  proId?: string | null;
  completion?: {
    id: string;
    afterPhotoUrls: string[];
    completionNote?: string | null;
    completedAt: string;
  } | null;
  photos_snapshot?: Array<{ category?: string; url: string }> | null;
  job_details_snapshot?: Record<string, unknown> | null;
  customerConfirmed?: boolean;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(serviceDate?: string, serviceTime?: string): string {
  if (!serviceDate) return '—';
  try {
    const d = new Date(serviceDate);
    if (Number.isNaN(d.getTime())) return serviceDate;
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return serviceTime ? `${dateStr} at ${serviceTime}` : dateStr;
  } catch {
    return serviceDate;
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function JobCompletePage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const router = useRouter();
  const { bookingId } = use(params);
  const [state, setState] = useState<PageState>('loading');
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);

  const fetchBooking = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setState('error');
        setErrorMessage(json.error ?? 'Could not load booking');
        return;
      }
      const b = json.booking as BookingData;
      setBooking(b);

      const remainingDueCents = Math.max(0, Math.round(Number(b.amountRemaining ?? 0)));
      const moneySettled = isCustomerMoneyFullySettled({
        finalPaymentStatus: b.finalPaymentStatus,
        paidRemainingAt: b.paidRemainingAt,
        fullyPaidAt: b.fullyPaidAt,
        amountRemaining: b.amountRemaining,
      });
      const customerConfirmed = b.customerConfirmed === true;

      const needsCompletionConfirm =
        b.status === 'awaiting_customer_confirmation' &&
        !customerConfirmed &&
        moneySettled &&
        remainingDueCents === 0;

      if (needsCompletionConfirm) {
        setState('needs_completion_confirm');
        return;
      }

      const isFullyPaid =
        b.status === 'fully_paid' ||
        b.status === 'paid' ||
        moneySettled;
      if (isFullyPaid) {
        setState('payment_success');
        return;
      }

      const canPayRemaining =
        shouldShowCustomerPayRemainingCta({
          status: b.status,
          remainingDueCents,
          finalPaymentStatus: b.finalPaymentStatus,
          paidRemainingAt: b.paidRemainingAt,
          fullyPaidAt: b.fullyPaidAt,
          amountRemaining: b.amountRemaining,
        }) && (b.paymentStatus === 'PAID' || (b.amountDeposit ?? 0) === 0);

      if (!canPayRemaining) {
        setState('not_eligible');
        return;
      }

      setState('completed');
    } catch {
      setState('error');
      setErrorMessage('Could not load booking');
    }
  }, [bookingId]);

  useEffect(() => {
    void fetchBooking();
  }, [fetchBooking]);

  const remaining = booking?.amountRemaining ?? 0;
  const checkoutHref = `/bookings/${bookingId}/checkout?phase=final`;
  const conversationHref = `/customer/chat/${bookingId}`;

  return (
    <AppLayout mode="customer" data-role="customer">
      <div className="min-h-screen bg-[hsl(var(--bg))]">
        <div className="max-w-lg mx-auto px-4 md:px-6 py-8 pb-36">
          <Link
            href={`/customer/bookings/${bookingId}`}
            className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] hover:text-[#111111] dark:hover:text-[#F5F7FA] mb-6 inline-block transition-colors"
          >
            ← Back to booking
          </Link>

          {/* LOADING */}
          {state === 'loading' && (
            <div className="space-y-4 animate-pulse" role="status" aria-label="Loading">
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-28" />
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-40" />
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-48" />
              <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 h-32" />
            </div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <section
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm"
              role="alert"
            >
              <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                Something went wrong
              </p>
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">{errorMessage}</p>
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm font-semibold bg-[#058954] text-white hover:bg-[#047a48] transition-colors"
              >
                Return to booking
              </Link>
            </section>
          )}

          {/* NOT ELIGIBLE */}
          {state === 'not_eligible' && booking && (
            <section
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm"
              role="status"
            >
              <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                {booking.paidRemainingAt ? 'Already paid' : 'Not ready for payment'}
              </p>
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">
                {booking.paidRemainingAt
                  ? 'You have already paid the remaining balance for this booking.'
                  : 'This booking may not be completed yet or the remaining balance is not due.'}
              </p>
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm font-semibold bg-[#058954] text-white hover:bg-[#047a48] transition-colors"
              >
                View booking
              </Link>
            </section>
          )}

          {/* Paid in full but customer must confirm completion (no payment CTA) */}
          {state === 'needs_completion_confirm' && booking && (
            <>
              <CompletionHeader />
              <BookingRecapCard booking={booking} />
              <CompletionEvidenceSection booking={booking} />
              <PaymentSummaryCard booking={booking} />
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm p-4 pb-[env(safe-area-inset-bottom)] sm:relative sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0">
                <div className="max-w-lg mx-auto space-y-3 sm:space-y-4">
                  <p className="text-xs text-muted text-center -mt-2">
                    Payment is complete. Confirm the job is finished to release payout to your pro.
                  </p>
                  <button
                    type="button"
                    disabled={confirmingCompletion}
                    onClick={async () => {
                      setConfirmingCompletion(true);
                      try {
                        const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' });
                        if (res.ok) router.push(`/customer/bookings/${bookingId}`);
                      } finally {
                        setConfirmingCompletion(false);
                      }
                    }}
                    className="flex h-12 w-full items-center justify-center rounded-full border border-[hsl(var(--accent-pro)/0.68)] bg-[#B2FBA5] text-sm font-semibold text-black transition-colors hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--ring-orange)] focus:ring-offset-2 disabled:opacity-60"
                  >
                    {confirmingCompletion ? 'Confirming…' : 'Confirm job completion'}
                  </button>
                  <Link
                    href={`/customer/bookings/${bookingId}`}
                    className="block text-center text-xs font-medium text-text3 hover:text-text"
                  >
                    Back to booking
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* PAYMENT SUCCESS */}
          {state === 'payment_success' && booking && (
            <>
              <div className="flex flex-col items-center text-center mb-8">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'hsl(var(--customer-tint))' }}
                  aria-hidden
                >
                  <span className="text-2xl text-accentGreen" aria-hidden>✓</span>
                </div>
                <h1 className="text-2xl font-semibold text-text tracking-tight">
                  All paid
                </h1>
                <p className="mt-2 text-sm text-text3">
                  Thank you. Your booking is complete.
                </p>
              </div>
              <div className="space-y-4">
                <BookingRecapCard booking={booking} />
                <div className="flex flex-col gap-3">
                  <Link
                    href="/customer/settings/payments"
                    className="flex h-12 items-center justify-center rounded-full border border-[hsl(var(--accent-pro)/0.68)] bg-accentOrange text-sm font-semibold text-[hsl(var(--accent-contrast))] transition-colors hover:bg-[hsl(var(--accent-pro)/0.92)]"
                  >
                    View receipt
                  </Link>
                  <Link
                    href={`/customer/bookings/${bookingId}/review`}
                    className="flex h-11 items-center justify-center rounded-full border border-border bg-surface text-sm font-medium text-text transition-colors hover:bg-hover"
                  >
                    Leave a review
                  </Link>
                  {booking.proId && (
                    <Link
                      href={`/book/${booking.proId}?rebook=${bookingId}`}
                      className="flex h-11 items-center justify-center rounded-full border border-border bg-surface text-sm font-medium text-text transition-colors hover:bg-hover"
                    >
                      Book again
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}

          {/* COMPLETED / PAYMENT DUE */}
          {state === 'completed' && booking && (
            <>
              {/* 1. Completion header */}
              <CompletionHeader />

              {/* 2. Booking recap card */}
              <BookingRecapCard booking={booking} />

              {/* 3. Completion evidence */}
              <CompletionEvidenceSection booking={booking} />

              {/* 4. Payment summary */}
              <PaymentSummaryCard booking={booking} />

              {/* 5. Protection section */}
              <ProtectionSection supportHref="/customer/settings/help-support" />

              {/* 6. Actions - sticky on mobile */}
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm p-4 pb-[env(safe-area-inset-bottom)] sm:relative sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0">
                <div className="max-w-lg mx-auto space-y-3 sm:space-y-4">
                  {!isCustomerMoneyFullySettled({
                    finalPaymentStatus: booking.finalPaymentStatus,
                    paidRemainingAt: booking.paidRemainingAt,
                    fullyPaidAt: booking.fullyPaidAt,
                    amountRemaining: booking.amountRemaining,
                  }) ? (
                    <>
                      <p className="text-xs text-muted text-center -mt-2">
                        Pay the remaining balance — you&apos;ll confirm job completion after payment is settled.
                      </p>
                      <Link
                        href={checkoutHref}
                        className="flex h-12 w-full items-center justify-center rounded-full border border-[hsl(var(--accent-pro)/0.68)] bg-accentOrange text-sm font-semibold text-[hsl(var(--accent-contrast))] transition-colors hover:bg-[hsl(var(--accent-pro)/0.92)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-orange)] focus:ring-offset-2"
                      >
                        Release remaining payment
                      </Link>
                    </>
                  ) : (
                    <p className="text-xs text-center text-muted py-2" role="status">
                      Payment complete — no balance due.
                    </p>
                  )}
                  <div className="flex gap-3 sm:flex-wrap">
                    <Link
                      href={conversationHref}
                      className="flex h-11 flex-1 items-center justify-center rounded-full border border-border bg-surface text-sm font-medium text-text transition-colors hover:bg-hover sm:flex-initial"
                    >
                      Message pro
                    </Link>
                  </div>
                  <Link
                    href={`/customer/bookings/${bookingId}/issues/new`}
                    className="block pt-2 text-center text-xs text-muted hover:text-text"
                  >
                    Report an issue
                  </Link>
                  <Link
                    href={`/customer/bookings/${bookingId}`}
                    className="block text-center text-xs font-medium text-text3 hover:text-text"
                  >
                    Back to booking
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function CompletionHeader() {
  return (
    <header className="mb-8" role="banner">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'hsl(var(--customer-tint))' }}
        aria-hidden
      >
        <span className="text-xl text-[#058954]" aria-hidden>✓</span>
      </div>
      <h1 className="text-2xl font-semibold text-[#111111] dark:text-[#F5F7FA] tracking-tight">
        Job completed
      </h1>
      <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mt-2">
        Confirm everything looks good
      </p>
      <p className="flex items-center gap-2 text-sm text-[hsl(var(--accent-customer))] mt-3">
        <span aria-hidden>✔</span> Protected by Flyers Up
      </p>
    </header>
  );
}

function BookingRecapCard({ booking }: { booking: BookingData }) {
  return (
    <section
      className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm mb-4"
      aria-labelledby="recap-heading"
    >
      <h2 id="recap-heading" className="sr-only">
        Booking recap
      </h2>
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F7F6F4] dark:bg-[#1D2128]">
          {booking.proPhotoUrl ? (
            <Image
              src={booking.proPhotoUrl}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">
              —
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#111111] dark:text-[#F5F7FA]">{booking.proName ?? 'Pro'}</p>
          <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">{booking.serviceName ?? 'Service'}</p>
          <p className="text-sm text-[#3A3A3A] dark:text-[#A1A8B3] mt-2">
            {formatDate(booking.serviceDate, booking.serviceTime)}
          </p>
          {booking.address && (
            <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mt-1">{booking.address}</p>
          )}
          <span
            className="inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-xs font-medium bg-[#058954]/10 text-[#058954]"
            role="status"
          >
            Completed
          </span>
        </div>
      </div>
      {booking.notes && booking.notes.trim() && (
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
          <p className="text-xs font-medium text-[#6A6A6A] dark:text-[#A1A8B3] uppercase tracking-wider mb-1">
            Scope / notes
          </p>
          <p className="text-sm text-[#3A3A3A] dark:text-[#A1A8B3]">{booking.notes}</p>
        </div>
      )}
    </section>
  );
}

function CompletionEvidenceSection({ booking }: { booking: BookingData }) {
  const completion = booking.completion;
  const afterUrls = completion?.afterPhotoUrls ?? [];
  const beforeUrls = ((booking.photos_snapshot ?? []) as { url?: string }[])
    .map((p) => p?.url)
    .filter((u): u is string => !!u)
    .slice(0, 2);
  const hasPhotos = afterUrls.length > 0 || beforeUrls.length > 0;
  const hasNote = !!completion?.completionNote?.trim();
  const completedAt = completion?.completedAt;

  if (!hasPhotos && !hasNote && !completedAt) return null;

  return (
    <section
      className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm mb-4"
      aria-labelledby="evidence-heading"
    >
      <h2 id="evidence-heading" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
        Completion evidence
      </h2>
      {hasPhotos && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {beforeUrls.slice(0, 2).map((url, i) => (
            <div
              key={`b-${i}`}
              className="relative aspect-square rounded-xl overflow-hidden bg-[#F5F5F5] dark:bg-[#1D2128]"
            >
              <Image src={url} alt={`Before ${i + 1}`} fill className="object-cover" sizes="160px" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded">
                Before
              </span>
            </div>
          ))}
          {afterUrls.slice(0, 2).map((url, i) => (
            <div
              key={`a-${i}`}
              className="relative aspect-square rounded-xl overflow-hidden bg-[#F5F5F5] dark:bg-[#1D2128]"
            >
              <Image src={url} alt={`After ${i + 1}`} fill className="object-cover" sizes="160px" />
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 rounded">
                After
              </span>
            </div>
          ))}
        </div>
      )}
      {hasNote && (
        <p className="text-sm text-[#3A3A3A] dark:text-[#A1A8B3] mb-3">{completion!.completionNote}</p>
      )}
      {completedAt && (
        <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">
          Completed {formatTimestamp(completedAt)}
        </p>
      )}
    </section>
  );
}

function PaymentSummaryCard({ booking }: { booking: BookingData }) {
  const total = booking.amountTotal ?? 0;
  const deposit = booking.amountDeposit ?? 0;
  const remaining = booking.amountRemaining ?? 0;
  const platformFee = booking.platformFeeCents ?? 0;
  const serviceAmount = Math.max(0, total - platformFee);

  return (
    <section
      className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm mb-4"
      aria-labelledby="payment-heading"
    >
      <h2 id="payment-heading" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">
        Payment summary
      </h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Service</span>
          <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(serviceAmount)}</span>
        </div>
        {platformFee > 0 && (
          <div className="flex justify-between">
            <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Marketplace & protection fees</span>
            <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(platformFee)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-black/5 dark:border-white/10 pt-3 mt-3 font-medium">
          <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Total</span>
          <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(total)}</span>
        </div>
        {deposit > 0 && (
          <>
            <div className="flex justify-between pt-2">
              <span className="text-[#058954]">Deposit paid</span>
              <span className="text-[#058954] font-medium">{formatCents(deposit)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-2">
              <span className="text-[#111111] dark:text-[#F5F7FA]">Remaining due now</span>
              <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(remaining)}</span>
            </div>
            <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mt-3">
              Your deposit has already been applied to this booking.
            </p>
          </>
        )}
        {deposit === 0 && remaining > 0 && (
          <div className="flex justify-between font-semibold pt-2">
            <span className="text-[#111111] dark:text-[#F5F7FA]">Due now</span>
            <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(remaining)}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ProtectionSection({
  supportHref,
}: {
  supportHref: string;
}) {
  return (
    <section
      className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm mb-4"
      aria-labelledby="protection-heading"
    >
      <h2 id="protection-heading" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-2">
        Need help before paying?
      </h2>
      <p className="text-sm text-[#3A3A3A] dark:text-[#A1A8B3]">
        If something wasn&apos;t completed as expected, our team can review. Issues are handled discreetly.
      </p>
      <Link
        href={supportHref}
        className="inline-block mt-2 text-xs text-muted hover:text-text transition-colors"
      >
        Contact support
      </Link>
    </section>
  );
}
