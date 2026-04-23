'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SentInner() {
  const sp = useSearchParams();
  const id = sp.get('id')?.trim() ?? '';

  return (
    <AppLayout mode="customer">
      <div className="max-w-lg mx-auto px-4 py-12 pb-24 text-center">
        <h1 className="text-2xl font-semibold text-text">We&apos;re on it</h1>
        <p className="mt-3 text-sm text-muted">
          Thanks for your request{id ? ` (reference ${id.slice(0, 8)}…)` : ''}. Flyers Up is finding the right pro for
          your borough and will follow up with availability and next steps.
        </p>
        <p className="mt-2 text-sm font-medium text-text">
          Most matches are proposed within <span className="text-accent">45 minutes</span> during peak hours; complex
          requests may take longer.
        </p>
        <ol className="mt-8 text-left text-sm text-text space-y-3 list-decimal list-inside border border-border rounded-2xl p-4 bg-surface">
          <li>Ops reviews your request and shortlists pros.</li>
          <li>We reach out to pros (push/SMS/manual) based on fit and fairness.</li>
          <li>When a pro accepts, we connect you to book and pay in-app.</li>
        </ol>
        <div className="mt-8 flex flex-col gap-2">
          <Link href="/customer" className="rounded-xl bg-accent py-3 text-sm font-semibold text-accentContrast hover:opacity-95">
            Back to home
          </Link>
          <Link href="/customer/services" className="rounded-xl border border-border py-3 text-sm font-semibold text-text hover:bg-surface2">
            Browse services
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export default function MatchRequestSentPage() {
  return (
    <Suspense
      fallback={
        <AppLayout mode="customer">
          <div className="max-w-lg mx-auto px-4 py-10 text-sm text-muted">Loading…</div>
        </AppLayout>
      }
    >
      <SentInner />
    </Suspense>
  );
}
