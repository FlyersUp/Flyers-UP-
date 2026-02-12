import Link from 'next/link';

export type UpcomingBooking = {
  serviceName: string;
  dateTimeLabel: string;
  proName: string;
  status: string;
  detailsHref?: string | null;
};

function CustomerConfirmationPill({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const confirm = s === 'scheduled' || s === 'completed';
  const label = status.replaceAll('_', ' ');

  return (
    <span
      className={[
        'relative inline-flex items-center h-6 px-2.5 rounded-full border text-[11px] uppercase tracking-wide font-medium',
        'bg-badgeFill text-text border-badgeBorder',
        confirm
          ? "pl-4 before:content-[''] before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:h-2 before:w-2 before:rounded-full before:bg-accent/80"
          : 'text-muted',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

export function UpcomingCard({
  booking,
  browseHref,
}: {
  booking: UpcomingBooking | null;
  browseHref: string;
}) {
  return (
    <div className="surface-card">
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
              <CustomerConfirmationPill status={booking.status} />
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

