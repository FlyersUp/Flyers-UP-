'use client';

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

/**
 * Service details card for checkout.
 */
export function ServiceDetailsCard({
  serviceName,
  serviceDate,
  serviceTime,
  address,
  durationHours,
}: {
  serviceName: string;
  serviceDate: string;
  serviceTime: string;
  address?: string | null;
  durationHours?: number | null;
}) {
  return (
    <div
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <h3 className="text-sm font-medium text-[#6A6A6A] mb-3">Service details</h3>
      <div className="space-y-2 text-sm">
        <p className="font-medium text-[#111111]">{serviceName}</p>
        <p className="text-[#3A3A3A]">{formatDateTime(serviceDate, serviceTime)}</p>
        {durationHours != null && durationHours > 0 && (
          <p className="text-[#6A6A6A]">{durationHours} hr{durationHours !== 1 ? 's' : ''}</p>
        )}
        {address && address.trim() && (
          <p className="text-[#6A6A6A]">{address}</p>
        )}
      </div>
    </div>
  );
}
