'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarClock, RefreshCw, Users } from 'lucide-react';
import { ProtectedFlyersUpBadge } from '@/components/retention/ProtectedFlyersUpBadge';
import { trackProductAnalyticsEvent } from '@/lib/analytics/productEvents';

export interface BookingRebookCardProps {
  proName: string;
  proId: string;
  bookingId: string;
  /** Service category slug for “similar pros” marketplace link when pro isn’t bookable. */
  serviceCategorySlug?: string | null;
  className?: string;
}

export function BookingRebookCard({
  proName,
  proId,
  bookingId,
  serviceCategorySlug,
  className = '',
}: BookingRebookCardProps) {
  const [proBookable, setProBookable] = useState<boolean | null>(null);
  const [loyaltyHint, setLoyaltyHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/pro/${encodeURIComponent(proId)}/customer-bookable`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && typeof j?.bookable === 'boolean') setProBookable(j.bookable);
      })
      .catch(() => {
        if (!cancelled) setProBookable(null);
      });
    return () => {
      cancelled = true;
    };
  }, [proId]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/customer/loyalty-hooks', { cache: 'no-store', credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled || !j?.hooks) return;
        const h = j.hooks as { repeat_customer_badge_placeholder?: boolean; loyalty_tier_placeholder?: string };
        if (h.repeat_customer_badge_placeholder) {
          setLoyaltyHint('Repeat customer — thank you for booking through Flyers Up.');
        } else if (h.loyalty_tier_placeholder && h.loyalty_tier_placeholder !== 'standard') {
          setLoyaltyHint('Loyalty perks are on the way — stay tuned.');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const bookAgainHref = `/book/${encodeURIComponent(proId)}?rebook=${encodeURIComponent(bookingId)}`;
  const repeatHref = bookAgainHref;
  const recurringHref = `/book/${encodeURIComponent(proId)}?rebook=${encodeURIComponent(bookingId)}&recurring=1`;
  const similarProsHref =
    serviceCategorySlug && serviceCategorySlug.trim()
      ? `/customer/services/${encodeURIComponent(serviceCategorySlug.trim())}`
      : '/customer/services';

  const fireBookAgain = () => {
    trackProductAnalyticsEvent('book_again_clicked', { booking_id: bookingId, pro_id: proId });
  };

  return (
    <section
      className={`rounded-2xl border border-sky-200/40 dark:border-sky-800/35 bg-gradient-to-br from-white to-sky-50/90 dark:from-[#171A20] dark:to-sky-950/20 p-4 sm:p-5 shadow-sm ${className}`}
      aria-labelledby="rebook-heading"
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <ProtectedFlyersUpBadge />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 min-w-0">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-100">
            <RefreshCw className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="rebook-heading" className="text-base font-semibold text-[#111111] dark:text-[#F5F7FA]">
              Book again with {proName}
            </h2>
            <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mt-0.5 leading-relaxed">
              We&apos;ll carry over your address and notes so you can pick a new time faster than starting from scratch.
            </p>
            {proBookable === false ? (
              <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-2">
                {proName} isn&apos;t taking new requests right now. Similar verified pros are a tap away.
              </p>
            ) : null}
            {loyaltyHint ? <p className="text-[11px] text-[#058954] dark:text-emerald-300/90 mt-2">{loyaltyHint}</p> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[200px] shrink-0">
          <Link
            href={bookAgainHref}
            prefetch={false}
            onClick={fireBookAgain}
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48] transition-colors shadow-sm"
          >
            Book again
          </Link>
          <div className="flex flex-col gap-1.5 text-sm">
            <Link
              href={repeatHref}
              prefetch={false}
              onClick={() =>
                trackProductAnalyticsEvent('repeat_booking_started', { booking_id: bookingId, pro_id: proId })
              }
              className="inline-flex items-center gap-2 font-medium text-[#4A69BD] dark:text-[#7BA3E8] hover:underline"
            >
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
              Repeat this service
            </Link>
            <Link
              href={recurringHref}
              prefetch={false}
              onClick={() =>
                trackProductAnalyticsEvent('recurring_booking_started', { booking_id: bookingId, pro_id: proId })
              }
              className="inline-flex items-center gap-2 font-medium text-[#4A69BD] dark:text-[#7BA3E8] hover:underline"
            >
              <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
              Schedule recurring
            </Link>
            {proBookable === false ? (
              <Link
                href={similarProsHref}
                prefetch={false}
                className="inline-flex items-center gap-2 font-medium text-[#4A69BD] dark:text-[#7BA3E8] hover:underline mt-1"
              >
                <Users className="h-4 w-4 shrink-0" aria-hidden />
                Browse similar pros
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-[#9CA3AF] dark:text-white/35 mt-3 leading-snug">
        Future perks like repeat-booking discounts may appear here — pricing still follows your pro&apos;s current rates.
      </p>
    </section>
  );
}
