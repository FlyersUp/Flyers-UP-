'use client';

/**
 * Shows "Auto-confirm in Xh Ym" when auto_confirm_at is in the future.
 */

import { useEffect, useState } from 'react';

interface AutoConfirmCountdownProps {
  autoConfirmAt?: string | null;
  className?: string;
}

export function AutoConfirmCountdown({
  autoConfirmAt,
  className = '',
}: AutoConfirmCountdownProps) {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!autoConfirmAt) {
      setDisplay(null);
      return;
    }
    const update = () => {
      const at = new Date(autoConfirmAt).getTime();
      const now = Date.now();
      const diff = at - now;
      if (diff <= 0) {
        setDisplay('Auto-confirming soon');
        return;
      }
      const hours = Math.floor(diff / (60 * 60 * 1000));
      const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      setDisplay(`Auto-confirm in ${hours}h ${mins}m`);
    };
    update();
    const t = setInterval(update, 60000); // Update every minute
    return () => clearInterval(t);
  }, [autoConfirmAt]);

  if (!display) return null;
  return <span className={className}>{display}</span>;
}
