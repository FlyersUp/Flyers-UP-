'use client';

import { useState } from 'react';
import { AdminPageShell } from '@/components/hybrid/AdminPageShell';
import { BoroughHealthMatrix } from '@/components/hybrid/BoroughHealthMatrix';
import type { BoroughHealthRow } from '@/lib/hybrid-ui/types';
import { MOCK_BOROUGH_HEALTH_ROWS } from '@/lib/hybrid-ui/mock-data';
import Link from 'next/link';
import { cn } from '@/lib/cn';

const BOROUGH_TABS = ['All boroughs', 'Brooklyn Heights', 'Upper East Side', 'Williamsburg', 'Astoria'] as const;

export function BoroughHealthScreen({ initialRows }: { initialRows?: BoroughHealthRow[] }) {
  const [tab, setTab] = useState<string>('All boroughs');
  const rows = initialRows ?? MOCK_BOROUGH_HEALTH_ROWS;

  return (
    <AdminPageShell
      title="Borough Health"
      subtitle="Active availability across key residential districts. Wire rows to `category_borough_status` + refresh job."
      filters={
        <div className="flex flex-wrap gap-2">
          {BOROUGH_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                tab === t
                  ? 'border-[hsl(var(--trust))] bg-[hsl(222_44%_96%)] text-[hsl(var(--trust))]'
                  : 'border-border bg-surface text-text-2 hover:bg-surface2'
              )}
            >
              {t}
            </button>
          ))}
          <Link
            href="/admin/hybrid/category-health"
            className="ml-auto self-center text-xs font-semibold text-[hsl(var(--trust))] hover:underline"
          >
            Gate overrides (legacy table) →
          </Link>
        </div>
      }
    >
      <BoroughHealthMatrix rows={rows} />
    </AdminPageShell>
  );
}
