'use client';

import type { Status } from '@/components/jobs/jobStatus';

const LATEST_UPDATE_COPY: Record<Status, string> = {
  BOOKED: 'Your request is booked. Waiting for the pro to accept.',
  ACCEPTED: 'Your pro accepted the job.',
  ON_THE_WAY: 'Your pro is on the way.',
  IN_PROGRESS: 'Your pro started working.',
  COMPLETED: 'Job completed. You can leave a review.',
};

interface LatestUpdateCardProps {
  status: Status;
  timestamp?: string | null;
  etaText?: string | null;
}

function formatTimestamp(raw: string): string {
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return raw;
  }
}

export function LatestUpdateCard({ status, timestamp, etaText }: LatestUpdateCardProps) {
  const copy = LATEST_UPDATE_COPY[status];

  return (
    <div className="rounded-2xl border border-[var(--hairline)] bg-[hsl(var(--surface))] p-5">
      <p className="text-sm font-medium text-[hsl(var(--text))]">{copy}</p>
      {timestamp && (
        <p className="mt-1 text-xs text-[hsl(var(--text-3))]">
          {formatTimestamp(timestamp)}
        </p>
      )}
      {status === 'ON_THE_WAY' && etaText && (
        <p className="mt-2 text-sm text-[hsl(var(--text-2))]">{etaText}</p>
      )}
    </div>
  );
}
