'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { CustomerPageShell } from '@/components/customer/CustomerPageShell';
import { AppGuideAccordion } from '@/components/guidance/AppGuideAccordion';
import { OnboardingGuide } from '@/components/guidance/OnboardingGuide';
import { getCurrentUser } from '@/lib/api';
import { useGuidancePreferences } from '@/hooks/useGuidancePreferences';
import { useState, useEffect } from 'react';
import { trackAppGuideReplayed } from '@/lib/guidance/analytics';
import { clearSessionGuideDismissed } from '@/lib/onboarding/sessionGuideDismissal';

export default function CustomerAppGuidePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<'customer' | 'pro' | null>('customer');
  const [showReplay, setShowReplay] = useState(false);

  const { resetHints, refresh } = useGuidancePreferences(userId);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await getCurrentUser();
      if (!mounted) return;
      setUserId(user?.id ?? null);
      setRole((user?.role as 'customer' | 'pro') ?? 'customer');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function handleReplayGuide() {
    trackAppGuideReplayed();
    if (userId) clearSessionGuideDismissed(userId);
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
    <AppLayout mode="customer">
      <CustomerPageShell
        title="How Flyers Up Works"
        subtitle="Navigation, booking, payments, and support"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <Link
            href="/customer/settings"
            className="text-sm text-muted hover:text-text"
          >
            ← Back to Settings
          </Link>

          <AppGuideAccordion
            mode="customer"
            onReplayGuide={handleReplayGuide}
            onResetHints={handleResetHints}
            resetHintsLoading={resetLoading}
          />
        </div>
      </CustomerPageShell>

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
