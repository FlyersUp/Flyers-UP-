'use client';

/**
 * Countdown for remaining_due_at (shows hours when > 1h, else mm:ss).
 */

import { useEffect, useState } from 'react';

interface RemainingDueCountdownProps {
  remainingDueAt?: string | null;
  className?: string;
}

export function RemainingDueCountdown({
  remainingDueAt,
  className = '',
}: RemainingDueCountdownProps) {
  const [display, setDisplay] = useState<string>('—');

  useEffect(() => {
    if (!remainingDueAt) {
      setDisplay('—');
      return;
    }
    const update = () => {
      const due = new Date(remainingDueAt).getTime();
      const now = Date.now();
      const diff = due - now;
      if (diff <= 0) {
        setDisplay('Overdue');
        return;
      }
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      if (hours >= 1) {
        setDisplay(`${hours}h ${mins}m`);
      } else {
        const secs = Math.floor((diff % 60000) / 1000);
        setDisplay(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [remainingDueAt]);

  if (display === '—') return null;
  return <span className={className}>{display}</span>;
}
