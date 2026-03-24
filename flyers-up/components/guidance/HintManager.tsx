'use client';

import { ReactNode, useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/api';
import { useGuidancePreferences } from '@/hooks/useGuidancePreferences';
import { ContextualHint } from './ContextualHint';
import type { HintKey } from '@/lib/guidance/hints';

interface HintManagerProps {
  hintKey: HintKey;
  children: ReactNode;
  position?: 'bottom' | 'top' | 'inline';
  /** When false, hint never shows (e.g. completion hint only when status is awaiting confirmation) */
  active?: boolean;
}

/**
 * Wraps content and shows a contextual hint once when the hint hasn't been dismissed.
 * Self-contained: fetches user and preferences internally.
 */
export function HintManager({
  hintKey,
  children,
  position = 'inline',
  active = true,
}: HintManagerProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await getCurrentUser();
      if (!mounted) return;
      setUserId(user?.id ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const { prefs, dismissHintKey } = useGuidancePreferences(userId);
  const dismissedKeys = prefs?.dismissedHintKeys ?? [];
  const visible = active && Boolean(userId && !dismissedKeys.includes(hintKey));

  async function handleDismiss() {
    if (userId) await dismissHintKey(hintKey);
  }

  return (
    <div className="relative">
      {children}
      <ContextualHint
        hintKey={hintKey}
        visible={visible}
        onDismiss={handleDismiss}
        position={position}
      />
    </div>
  );
}
