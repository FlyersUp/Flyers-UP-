'use client';

/**
 * Legacy route:
 * `/pro/[id]` used to be a customer-facing pro profile.
 * We keep it only to redirect to the customer side.
 */

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/customer/pros/${encodeURIComponent(id)}`);
  }, [router, id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex items-center justify-center p-6">
      <div className="surface-card p-6 text-center max-w-md w-full">
        <div className="text-sm font-semibold tracking-tight text-text">Redirecting…</div>
        <div className="mt-2 text-sm text-muted">Taking you to the customer profile page.</div>
      </div>
    </div>
  );
}
