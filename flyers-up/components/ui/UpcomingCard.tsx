import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';

export type UpcomingBooking = {
  serviceName: string;
  dateTimeLabel: string;
  proName: string;
  status: string;
  detailsHref?: string | null;
};

export function UpcomingCard({
  booking,
  browseHref,
}: {
  booking: UpcomingBooking | null;
  browseHref: string;
}) {
  return (
    <div className="surface-card border-l-[3px] border-l-[#6EE7B7]">
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-sm font-semibold tracking-tight text-text">Upcoming</div>
          {booking?.detailsHref ? (
            <Link href={booking.detailsHref} className="text-sm text-muted hover:text-text transition-colors">
              View details
            </Link>
          ) : null}
        </div>

        {booking ? (
          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-base font-semibold text-text truncate">{booking.serviceName}</div>
              <div className="mt-1 text-sm text-muted">{booking.dateTimeLabel}</div>
              <div className="text-sm text-muted">{booking.proName}</div>
            </div>
            <div className="shrink-0">
              <StatusBadge status={booking.status} />
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-text">No upcoming bookings</div>
              <div className="mt-1 text-sm text-muted">When you book a pro, it’ll show up here.</div>
            </div>
            <Link href={browseHref} className="text-sm font-medium text-text hover:underline">
              Browse pros
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

