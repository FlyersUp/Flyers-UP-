'use client';

import { useEffect, useState } from 'react';
import { useHydrated } from '@/hooks/useHydrated';
import { formatAutoChargeCountdown } from '@/lib/bookings/auto-charge-countdown';

const TICK_MS = 60_000;

export type PaymentCountdownProps = {
  /** ISO timestamp from backend (customer_review_deadline_at or remaining_due_at) */
  deadlineIso: string;
  className?: string;
};

/**
 * Live countdown (updates at least once per minute). Renders stable placeholder until hydrated.
 */
export function PaymentCountdown({ deadlineIso, className = '' }: PaymentCountdownProps) {
  const hydrated = useHydrated();
  const deadlineMs = new Date(deadlineIso).getTime();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!hydrated || !Number.isFinite(deadlineMs)) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [hydrated, deadlineMs]);

  if (!Number.isFinite(deadlineMs)) {
    return (
      <p className={`text-sm font-medium text-[#111111] dark:text-[#F5F7FA] tabular-nums ${className}`}>
        Auto-charge available soon
      </p>
    );
  }

  if (!hydrated) {
    return (
      <p
        className={`text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] tabular-nums min-h-[1.25rem] ${className}`}
        aria-hidden
      >
        Auto-charging after review window
      </p>
    );
  }

  const { primary, secondary } = formatAutoChargeCountdown(deadlineMs, nowMs);

  return (
    <div className={className}>
      <p className="text-sm font-semibold text-[#111111] dark:text-[#F5F7FA] tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
        {primary}
      </p>
      {secondary ? (
        <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mt-0.5">{secondary}</p>
      ) : null}
    </div>
  );
}
