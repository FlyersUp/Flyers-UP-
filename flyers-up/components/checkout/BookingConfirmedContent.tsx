'use client';

/**
 * Booking Confirmed — Post-deposit payment success
 *
 * UX: Eliminate ALL uncertainty after payment.
 * - Did it go through? → Clear success state + payment clarity
 * - What happens next? → Step list
 * - When is the job? → Booking summary card
 * - Can I contact them? → Message pro CTA
 * - Am I protected? → Trust layer
 *
 * References: Airbnb (action list), Stripe (payment clarity), Skyscanner (calm checkmark)
 */

import React from 'react';
import Link from 'next/link';
import { Check, MessageCircle, Home } from 'lucide-react';
import { cn } from '@/lib/cn';

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDateTime(serviceDate?: string, serviceTime?: string): string {
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

export interface BookingConfirmedData {
  serviceName: string;
  proName: string;
  proPhotoUrl: string | null;
  serviceDate: string;
  serviceTime: string;
  address?: string | null;
  status: string;
  paymentStatus: string;
  amountDeposit: number | null;
  amountRemaining: number | null;
  amountTotal: number | null;
  paidDepositAt?: string | null;
}

export interface BookingConfirmedContentProps {
  bookingId: string;
  data: BookingConfirmedData;
  /** Payment still processing (webhook delay) */
  isProcessing?: boolean;
  className?: string;
}

const WHAT_HAPPENS_NEXT = [
  'Pro reviews and confirms your booking',
  'Pro arrives at the scheduled time',
  'You pay the remaining balance after the job is complete',
];

const TRUST_ITEMS = [
  'Covered by satisfaction guarantee',
  'Reschedule or cancel within policy',
  'Support available if anything goes wrong',
];

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    deposit_paid: 'Scheduled',
    payment_required: 'Scheduled',
    pro_en_route: 'On the way',
    on_the_way: 'On the way',
    arrived: 'Arrived',
    in_progress: 'In progress',
    completed_pending_payment: 'Completed',
    awaiting_payment: 'Awaiting payment',
    awaiting_remaining_payment: 'Pay remaining',
    fully_paid: 'Completed',
  };
  return map[status] ?? 'Scheduled';
}

export function BookingConfirmedContent({
  bookingId,
  data,
  isProcessing = false,
  className,
}: BookingConfirmedContentProps) {
  const depositCents = data.amountDeposit ?? 0;
  const remainingCents = data.amountRemaining ?? 0;
  const totalCents = data.amountTotal ?? depositCents + remainingCents;
  const statusLabel = getStatusLabel(data.status);

  return (
    <div className={cn('space-y-5', className)} data-role="customer">
      {/* 1. Success state — calm, not celebratory (subtle fade/scale) */}
      <section
        className="flex flex-col items-center py-6 animate-fade-in"
        role="status"
        aria-live="polite"
        aria-label="Booking confirmed"
      >
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300',
            isProcessing
              ? 'bg-amber-100 dark:bg-amber-900/30'
              : 'bg-[#058954]/10 dark:bg-[#058954]/20'
          )}
        >
          <Check
            size={28}
            strokeWidth={2.5}
            className={isProcessing ? 'text-amber-600 dark:text-amber-400' : 'text-[#058954]'}
          />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-[#111111] dark:text-[#F5F7FA] tracking-tight">
          {isProcessing ? 'Processing your booking…' : 'Booking confirmed'}
        </h1>
        <p className="mt-2 max-w-sm text-center text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
          {isProcessing
            ? 'Your payment was successful. We’re finalizing the details — this page will update shortly.'
            : 'Your deposit is paid. Your pro will be in touch if needed.'}
        </p>
      </section>

      {/* 2. Booking summary card */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="confirmed-summary"
      >
        <h2 id="confirmed-summary" className="sr-only">
          Booking details
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F7F6F4] dark:bg-[#1D2128]">
              {data.proPhotoUrl ? (
                <img src={data.proPhotoUrl} alt={data.proName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">
                  —
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#111111] dark:text-[#F5F7FA]">{data.proName}</p>
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">{data.serviceName}</p>
              <p className="mt-1 text-sm text-[#3A3A3A] dark:text-[#A1A8B3]">
                {formatDateTime(data.serviceDate, data.serviceTime)}
              </p>
              {data.address && data.address.trim() && (
                <p className="mt-0.5 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">{data.address}</p>
              )}
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
              'bg-[#058954]/10 dark:bg-[#058954]/20 text-[#058954]'
            )}
          >
            {statusLabel}
          </span>
        </div>
      </section>

      {/* 3. Payment clarity — Stripe-style */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="confirmed-payment"
      >
        <h2 id="confirmed-payment" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
          Payment
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#058954] font-medium">Deposit paid</span>
            <span className="font-semibold text-[#058954]">
              {depositCents > 0 ? formatCents(depositCents) : '—'}
            </span>
          </div>
          {remainingCents > 0 && (
            <div className="flex justify-between">
              <span className="text-[#6A6A6A] dark:text-[#A1A8B3]">Remaining (due after service)</span>
              <span className="text-[#111111] dark:text-[#F5F7FA]">{formatCents(remainingCents)}</span>
            </div>
          )}
          {depositCents === 0 && remainingCents === 0 && totalCents > 0 && (
            <div className="flex justify-between">
              <span className="text-[#058954] font-medium">Paid</span>
              <span className="font-semibold text-[#058954]">{formatCents(totalCents)}</span>
            </div>
          )}
        </div>
      </section>

      {/* 4. What happens next — CRITICAL */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="confirmed-next"
      >
        <h2 id="confirmed-next" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
          What happens next
        </h2>
        <ol className="space-y-3">
          {WHAT_HAPPENS_NEXT.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#058954]/10 dark:bg-[#058954]/20 text-xs font-semibold text-[#058954]">
                {i + 1}
              </span>
              <span className="text-sm text-[#3A3A3A] dark:text-[#A1A8B3] pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">
          You’ll receive updates as the booking progresses.
        </p>
      </section>

      {/* 5. Trust / protection */}
      <section
        className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm"
        aria-labelledby="confirmed-trust"
      >
        <h2 id="confirmed-trust" className="sr-only">
          Protection
        </h2>
        <ul className="space-y-2">
          {TRUST_ITEMS.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#3A3A3A] dark:text-[#A1A8B3]">
              <span className="text-[#058954] mt-0.5">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 6. Actions — clear hierarchy */}
      <section className="space-y-3 pt-2">
        <Link
          href={`/customer/bookings/${bookingId}`}
          className="flex w-full items-center justify-center gap-2 h-12 rounded-full text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48] transition-colors focus:outline-none focus:ring-2 focus:ring-[#058954]/50 focus:ring-offset-2"
        >
          View booking
        </Link>
        <div className="flex gap-3">
          <Link
            href={`/customer/chat/${bookingId}`}
            className="flex flex-1 items-center justify-center gap-2 h-11 rounded-full text-sm font-medium border border-black/15 dark:border-white/10 text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <MessageCircle size={18} strokeWidth={2} />
            Message pro
          </Link>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 h-11 rounded-full text-sm font-medium border border-black/15 dark:border-white/10 text-[#6A6A6A] dark:text-[#A1A8B3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <Home size={18} strokeWidth={2} />
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
