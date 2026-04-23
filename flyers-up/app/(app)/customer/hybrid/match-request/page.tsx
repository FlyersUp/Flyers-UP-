'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { HybridAppHeader } from '@/components/hybrid/AppHeader';
import { HybridMatchRequestForm } from '@/components/hybrid/MatchRequestForm';

export default function HybridMatchRequestPage() {
  const router = useRouter();

  return (
    <AppLayout mode="customer" showFloatingNotificationBell={false}>
      <div className="min-h-dvh bg-bg pb-28">
        <HybridAppHeader />
        <div className="px-4 pt-2">
          <Link href="/customer/hybrid/occupation?state=weak" className="text-xs font-medium text-[hsl(var(--trust))] hover:underline">
            ← Back
          </Link>
        </div>
        <div className="mt-6 px-4">
          <h1 className="text-2xl font-bold text-[hsl(var(--trust))]">Submit a Match Request</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-3">
            Find the perfect neighborhood specialist. Fill out the details below and Flyers Up will alert verified pros
            in your borough.
          </p>
        </div>
        <div className="mt-8 px-4 pb-8">
          <HybridMatchRequestForm
            onSubmit={async (values) => {
              const q = new URLSearchParams({
                cat: values.category,
                b: values.boroughSlug,
              });
              router.push(`/customer/hybrid/match-request/sent?${q.toString()}`);
            }}
            submitLabel="Submit request"
          />
        </div>
      </div>
    </AppLayout>
  );
}
