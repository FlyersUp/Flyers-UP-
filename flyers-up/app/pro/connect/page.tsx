'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';

function ConnectInner() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next') || '/pro/earnings';

  useEffect(() => {
    const url = `/api/stripe/connect/onboard?next=${encodeURIComponent(nextParam)}`;
    window.location.href = url;
  }, [nextParam]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex flex-col items-center justify-center gap-4 px-4">
      <Logo size="md" linkToHome />
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <div className="text-sm text-muted">Redirecting to Stripe Connect…</div>
    </div>
  );
}

/**
 * Client-side redirect to Stripe Connect onboarding.
 * Shows a brief "Redirecting…" before the API route handles auth/Stripe redirect.
 * Use /pro/connect?next=/pro as the entry point for clearer UX.
 */
export default function ProConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex flex-col items-center justify-center gap-4 px-4">
          <Logo size="md" linkToHome />
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-muted">Loading…</div>
        </div>
      }
    >
      <ConnectInner />
    </Suspense>
  );
}
