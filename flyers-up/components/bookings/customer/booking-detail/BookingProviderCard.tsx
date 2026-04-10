'use client';

import type { ReactNode } from 'react';
import { DateTime } from 'luxon';
import { Calendar, MapPin, Layers } from 'lucide-react';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';

function formatWhen(serviceDate?: string, serviceTime?: string): string {
  if (!serviceDate) return '—';
  try {
    const dt = DateTime.fromISO(serviceDate, { zone: DEFAULT_BOOKING_TIMEZONE });
    if (!dt.isValid) return serviceDate;
    const dateStr = dt.toFormat('MMM d, yyyy');
    return serviceTime ? `${dateStr} at ${serviceTime}` : dateStr;
  } catch {
    return serviceDate;
  }
}

export interface BookingProviderCardProps {
  proName: string;
  proPhotoUrl?: string | null;
  serviceName: string;
  categoryName?: string | null;
  serviceDate?: string;
  serviceTime?: string;
  address?: string | null;
  pendingRescheduleSummary?: string | null;
  /** e.g. “Professional pet care” — falls back from category */
  occupationSubtitle?: string | null;
  className?: string;
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 min-w-0 py-2.5 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0 last:pb-0 first:pt-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4A69BD]/10 dark:bg-[#4A69BD]/20 text-[#4A69BD]">
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#4A69BD] mb-0.5">{label}</p>
        <div className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA] break-words">{children}</div>
      </div>
    </div>
  );
}

export function BookingProviderCard({
  proName,
  proPhotoUrl,
  serviceName,
  categoryName,
  serviceDate,
  serviceTime,
  address,
  pendingRescheduleSummary,
  occupationSubtitle,
  className = '',
}: BookingProviderCardProps) {
  const subtitle =
    occupationSubtitle?.trim() ||
    (categoryName ? `${categoryName} professional` : 'Service professional');

  return (
    <section
      className={`rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#171A20] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${className}`}
      aria-labelledby="booking-provider-heading"
    >
      <h2 id="booking-provider-heading" className="sr-only">
        Provider and booking details
      </h2>
      <div className="flex gap-4 min-w-0 mb-4">
        <div className="shrink-0">
          {proPhotoUrl ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[#F0EFEC] dark:bg-[#1D2128] ring-2 ring-white dark:ring-[#171A20] shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proPhotoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F0EFEC] dark:bg-[#1D2128] text-sm font-semibold text-[#6A6A6A]">
              {proName.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA] leading-tight">{proName}</p>
          <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mt-0.5 capitalize">{subtitle}</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#F9FAFB] dark:bg-white/[0.04] px-1">
        <Row icon={Layers} label="Service & category">
          {serviceName}
          {categoryName ? <span className="text-[#6A6A6A] dark:text-[#A1A8B3] font-normal"> · {categoryName}</span> : null}
        </Row>
        <Row icon={Calendar} label="Date & time">
          {pendingRescheduleSummary ? (
            <>
              <span className="block text-xs font-normal text-amber-800 dark:text-amber-200/90 mb-1">
                New time requested: {pendingRescheduleSummary}
              </span>
              <span className="font-normal text-[#6A6A6A] dark:text-[#A1A8B3] text-xs">Currently scheduled: </span>
              {formatWhen(serviceDate, serviceTime)}
            </>
          ) : (
            formatWhen(serviceDate, serviceTime)
          )}
        </Row>
        {address?.trim() ? (
          <Row icon={MapPin} label="Address">
            {address}
          </Row>
        ) : null}
      </div>
    </section>
  );
}
