'use client';

/**
 * Countdown timer for deposit payment due.
 * Shows mm:ss when status=awaiting_deposit_payment and payment_due_at in future.
 * Shows "Expired" when past due (cron will cancel).
 */

import { useEffect, useState } from 'react';

interface BookingCountdownProps {
  status: string;
  paymentDueAt?: string | null;
  className?: string;
}

export function BookingCountdown({
  status,
  paymentDueAt,
  className = '',
}: BookingCountdownProps) {
  const [display, setDisplay] = useState<string>('—');

  useEffect(() => {
    const awaiting =
      status === 'awaiting_deposit_payment' ||
      status === 'payment_required' ||
      status === 'accepted';
    if (!awaiting || !paymentDueAt) {
      setDisplay('—');
      return;
    }

    const update = () => {
      const due = new Date(paymentDueAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, due - now);
      if (diff <= 0) {
        setDisplay('Expired');
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setDisplay(`${m}:${s.toString().padStart(2, '0')}`);
    };

    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [status, paymentDueAt]);

  if (display === '—') return null;

  return (
    <span className={className} data-countdown={display}>
      {display}
    </span>
  );
}
