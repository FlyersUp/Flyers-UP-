'use client';

import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge';

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

export interface BookingHeaderCardProps {
  serviceName: string;
  proName: string;
  categoryName?: string;
  serviceDate?: string;
  serviceTime?: string;
  status: string;
  proPhotoUrl?: string | null;
}

export function BookingHeaderCard({
  serviceName,
  proName,
  categoryName,
  serviceDate,
  serviceTime,
  status,
  proPhotoUrl,
}: BookingHeaderCardProps) {
  return (
    <div
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {proPhotoUrl ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proPhotoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-black/5 text-sm text-muted"
              aria-hidden
            >
              No photo yet
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-text">{serviceName}</p>
          <p className="text-sm text-muted">
            {proName}
            {categoryName ? ` · ${categoryName}` : ''}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatDateTime(serviceDate, serviceTime)}
          </p>
          <div className="mt-3">
            <BookingStatusBadge status={status} className="text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}
