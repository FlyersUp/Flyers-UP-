'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layouts/AppLayout';

/** Matches `Button` secondary variant for inline navigation actions on Growth pages */
export const growthActionLinkClass =
  'inline-flex items-center justify-center px-6 py-3 rounded-[var(--radius-lg)] font-medium transition-all duration-[var(--transition-base)] border border-[hsl(var(--accent-customer)/0.55)] bg-[hsl(var(--accent-customer)/0.16)] text-text hover:bg-[hsl(var(--accent-customer)/0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:ring-[hsl(var(--accent-customer)/0.45)] active:scale-[0.985]';

export function GrowthPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AppLayout mode="pro">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link
          href="/pro"
          className="inline-flex items-center gap-2 text-sm text-text2 hover:text-text mb-6"
        >
          <ArrowLeft size={18} aria-hidden />
          Back
        </Link>
        <h1 className="text-2xl font-semibold text-text mb-6">{title}</h1>
        {children}
      </div>
    </AppLayout>
  );
}
