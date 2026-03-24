'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';
import { getCurrentUser } from '@/lib/api';
import { useGuidancePreferences } from '@/hooks/useGuidancePreferences';
import { useGuidanceContext } from '@/contexts/GuidanceContext';
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
 * Suppressed when onboarding is open. Only one hint can show at a time (session-wide).
 */
export function HintManager({
  hintKey,
  children,
  position = 'inline',
  active = true,
}: HintManagerProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const guidance = useGuidanceContext();

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
  const canShow = active && Boolean(userId && !dismissedKeys.includes(hintKey));
  const onboardingOpen = guidance?.onboardingOpen ?? false;
  const hasSlot = !guidance
    ? canShow
    : canShow && !onboardingOpen && guidance.requestHintSlot(hintKey);

  const guidanceRef = useRef(guidance);
  guidanceRef.current = guidance;
  useEffect(() => {
    return () => {
      guidanceRef.current?.releaseHintSlot();
    };
  }, []);

  async function handleDismiss() {
    if (userId) await dismissHintKey(hintKey);
    guidance?.releaseHintSlot();
  }

  const visible = hasSlot;

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
