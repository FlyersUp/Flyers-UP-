'use client';

import { parseBusinessHoursModel, summarizeBusinessHours } from '@/lib/utils/businessHours';

interface AvailabilityCardProps {
  businessHours: string | null;
}

function getAvailabilitySummary(hours: string | null): string {
  if (!hours || !hours.trim()) {
    return 'Availability available on request.';
  }
  try {
    const model = parseBusinessHoursModel(hours);
    const summary = summarizeBusinessHours(model);
    if (summary === 'No availability set') {
      return 'Availability available on request.';
    }
    return summary;
  } catch {
    return 'Availability set';
  }
}

export function AvailabilityCard({ businessHours }: AvailabilityCardProps) {
  const summary = getAvailabilitySummary(businessHours);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Availability</h3>
      <p className="mt-2 text-sm text-text">{summary}</p>
      <p className="mt-1 text-xs text-muted">Request a time when you book.</p>
    </div>
  );
}
