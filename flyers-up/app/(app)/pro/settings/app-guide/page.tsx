'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProPageShell } from '@/components/pro/ProPageShell';
import { AppGuideAccordion } from '@/components/guidance/AppGuideAccordion';
import { OnboardingGuide } from '@/components/guidance/OnboardingGuide';
import { getCurrentUser } from '@/lib/api';
import { useGuidancePreferences } from '@/hooks/useGuidancePreferences';
import { useState, useEffect } from 'react';
import { trackAppGuideReplayed } from '@/lib/guidance/analytics';

export default function ProAppGuidePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<'customer' | 'pro' | null>('pro');
  const [showReplay, setShowReplay] = useState(false);

  const { resetHints, refresh } = useGuidancePreferences(userId);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await getCurrentUser();
      if (!mounted) return;
      setUserId(user?.id ?? null);
      setRole((user?.role as 'customer' | 'pro') ?? 'pro');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function handleReplayGuide() {
    trackAppGuideReplayed();
    setShowReplay(true);
  }

  function handleReplayComplete() {
    setShowReplay(false);
    void refresh();
  }

  async function handleResetHints() {
    if (!userId) return;
    setResetLoading(true);
    await resetHints();
    setResetLoading(false);
  }

  return (
    <AppLayout mode="pro">
      <ProPageShell
        title="How Flyers Up Works"
        subtitle="Navigation, jobs, payments, and support"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <Link
            href="/pro/settings"
            className="text-sm text-muted hover:text-text"
          >
            ← Back to Settings
          </Link>

          <AppGuideAccordion
            mode="pro"
            onReplayGuide={handleReplayGuide}
            onResetHints={handleResetHints}
            resetHintsLoading={resetLoading}
          />
        </div>
      </ProPageShell>

      {showReplay && (
        <OnboardingGuide
          open
          role={role}
          onComplete={handleReplayComplete}
          onSkip={handleReplayComplete}
          isReplay
        />
      )}
    </AppLayout>
  );
}
