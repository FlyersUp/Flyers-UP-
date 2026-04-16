'use client';

import { useState } from 'react';
import { MapPin, Filter } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Stub filters (UI only) — wire to query later.
 */
export function AnalyticsFilterBar({ className }: { className?: string }) {
  const [area, setArea] = useState('all');
  const [role, setRole] = useState('all');

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text3" />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="h-9 appearance-none rounded-xl border border-border bg-[hsl(var(--card-neutral))] pl-8 pr-8 text-xs font-medium text-text shadow-[var(--shadow-1)]"
          aria-label="Area filter"
        >
          <option value="all">All areas</option>
          <option value="nj">New Jersey</option>
          <option value="ny">New York</option>
        </select>
      </div>
      <div className="relative">
        <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text3" />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 appearance-none rounded-xl border border-border bg-[hsl(var(--card-neutral))] pl-8 pr-8 text-xs font-medium text-text shadow-[var(--shadow-1)]"
          aria-label="Role filter"
        >
          <option value="all">All roles</option>
          <option value="customer">Customers</option>
          <option value="pro">Pros</option>
        </select>
      </div>
    </div>
  );
}
