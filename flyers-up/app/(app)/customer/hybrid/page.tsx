'use client';

import Link from 'next/link';
import { AppLayout } from '@/components/layouts/AppLayout';
import { HybridAppHeader } from '@/components/hybrid/AppHeader';
import { MobileHero } from '@/components/hybrid/MobileHero';
import { HybridSearchBar } from '@/components/hybrid/SearchBar';
import { TrustBadgeRow } from '@/components/hybrid/TrustBadgeRow';
import { FloatingActionFab } from '@/components/hybrid/FloatingActionFab';
import { MOCK_TRUST_PILLS_HOME, MOCK_TRUST_STRIP } from '@/lib/hybrid-ui/mock-data';
import { NYC_BOROUGH_OPTIONS } from '@/lib/marketplace/nycBoroughs';
import { useState } from 'react';

export default function HybridCustomerHomePage() {
  const [borough, setBorough] = useState('brooklyn');

  return (
    <AppLayout mode="customer" showFloatingNotificationBell={false}>
      <div className="min-h-dvh bg-bg pb-28">
        <HybridAppHeader />
        <MobileHero
          pills={MOCK_TRUST_PILLS_HOME}
          title={
            <>
              Book trusted <em className="font-serif not-italic text-[hsl(var(--trust))]/90">local help</em> in NYC.
            </>
          }
        />
        <div className="mt-6 space-y-4 px-4">
          <div className="rounded-3xl border border-border bg-surface p-4 shadow-[var(--shadow-md)]">
            <HybridSearchBar name="q" autoComplete="off" />
            <div className="mt-4 flex flex-wrap items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor="home-borough">
                  Borough
                </label>
                <select
                  id="home-borough"
                  value={borough}
                  onChange={(e) => setBorough(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-border bg-surface2 px-4 text-sm font-medium text-text focus:outline-none focus:ring-2 focus:ring-[hsl(var(--trust))]/25"
                >
                  {NYC_BOROUGH_OPTIONS.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
              <Link
                href={`/customer/services?borough=${encodeURIComponent(borough)}`}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-[hsl(var(--trust-hover)/0.5)] bg-trust px-6 text-sm font-semibold text-trustFg shadow-sm hover:bg-[hsl(var(--trust-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust/40"
              >
                Find Pro
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-10">
          <TrustBadgeRow items={MOCK_TRUST_STRIP} />
        </div>
        <p className="mt-10 px-4 text-center text-[11px] text-text-3">
          Hybrid UI demo ·{' '}
          <Link href="/customer/hybrid/occupation?state=strong" className="text-[hsl(var(--trust))] underline">
            Occupation states
          </Link>
        </p>
        <FloatingActionFab />
      </div>
    </AppLayout>
  );
}
