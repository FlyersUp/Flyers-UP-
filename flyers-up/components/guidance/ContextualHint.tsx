'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { HintKey } from '@/lib/guidance/hints';
import { HINT_CONFIG } from '@/lib/guidance/hints';
import { trackContextualHintViewed, trackContextualHintDismissed } from '@/lib/guidance/analytics';

interface ContextualHintProps {
  hintKey: HintKey;
  visible: boolean;
  onDismiss: () => void;
  /** Optional: position anchor (e.g. near a specific element) */
  position?: 'bottom' | 'top' | 'inline';
}

export function ContextualHint({
  hintKey,
  visible,
  onDismiss,
  position = 'bottom',
}: ContextualHintProps) {
  const config = HINT_CONFIG[hintKey];
  const viewedRef = useRef(false);

  useEffect(() => {
    if (visible && !viewedRef.current) {
      viewedRef.current = true;
      trackContextualHintViewed(hintKey);
    }
  }, [visible, hintKey]);

  if (!visible || !config) return null;

  function handleDismiss() {
    trackContextualHintDismissed(hintKey);
    onDismiss();
  }

  const base =
    'flex items-center gap-3 rounded-xl border border-border bg-surface shadow-lg px-4 py-3 text-sm text-foreground';

  const positionClass =
    position === 'top'
      ? 'absolute left-0 right-0 top-0 -mt-1 z-40'
      : position === 'inline'
        ? 'w-full'
        : 'absolute left-0 right-0 bottom-0 mb-2 z-40';

  return (
    <div className={`${positionClass}`}>
      <div className={base} role="status" aria-live="polite">
        <p className="flex-1 min-w-0">{config.message}</p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-hover hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
