'use client';

import type { Status } from '@/components/jobs/jobStatus';

const LATEST_UPDATE_COPY: Record<Status, string> = {
  BOOKED: 'Booked. Waiting for pro to accept.',
  ACCEPTED: 'Accepted. Pro is preparing to head over.',
  ON_THE_WAY: 'On the way.',
  IN_PROGRESS: 'Work started.',
  COMPLETED: 'Completed.',
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
    <div className="rounded-2xl border border-black/10 bg-[#F2F2F0] p-4 shadow-sm">
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
