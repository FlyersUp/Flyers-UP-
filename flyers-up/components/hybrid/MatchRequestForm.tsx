'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NYC_BOROUGH_OPTIONS } from '@/lib/marketplace/nycBoroughs';
import { cn } from '@/lib/cn';

const CATEGORIES = ['Home Maintenance', 'Cleaning', 'Handyman', 'Pet Care', 'Events & DJ', 'Moving'];

export interface MatchRequestFormValues {
  category: string;
  boroughSlug: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
}

export interface HybridMatchRequestFormProps {
  defaultValues?: Partial<MatchRequestFormValues>;
  onSubmit?: (values: MatchRequestFormValues) => void | Promise<void>;
  submitLabel?: string;
  className?: string;
}

export function HybridMatchRequestForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Submit request',
  className,
}: HybridMatchRequestFormProps) {
  const [category, setCategory] = useState(defaultValues?.category ?? CATEGORIES[0]!);
  const [boroughSlug, setBoroughSlug] = useState(defaultValues?.boroughSlug ?? 'manhattan');
  const [preferredDate, setPreferredDate] = useState(defaultValues?.preferredDate ?? '');
  const [preferredTime, setPreferredTime] = useState(defaultValues?.preferredTime ?? '');
  const [notes, setNotes] = useState(defaultValues?.notes ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;
    setLoading(true);
    try {
      await onSubmit({ category, boroughSlug, preferredDate, preferredTime, notes });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={cn('space-y-5', className)}>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-text-3">Service category</label>
        <div className="rounded-2xl border border-[hsl(var(--trust))]/15 bg-[hsl(222_44%_98%)] px-3 py-0.5">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-12 w-full bg-transparent text-sm font-medium text-text focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-3">Borough</p>
        <div className="flex flex-wrap gap-2">
          {NYC_BOROUGH_OPTIONS.map((b) => {
            const active = boroughSlug === b.slug;
            return (
              <button
                key={b.slug}
                type="button"
                onClick={() => setBoroughSlug(b.slug)}
                className={cn(
                  'rounded-full border px-3 py-2 text-xs font-semibold transition-colors',
                  active
                    ? 'border-amber-300 bg-[hsl(33_100%_94%)] text-amber-950'
                    : 'border-[hsl(var(--trust))]/15 bg-[hsl(222_44%_97%)] text-[hsl(var(--trust))] hover:bg-[hsl(222_44%_94%)]'
                )}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-text-3">Preferred date</label>
        <div className="relative rounded-2xl border border-[hsl(var(--trust))]/15 bg-[hsl(222_44%_98%)]">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-3" />
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="h-12 w-full rounded-2xl border-0 bg-transparent pl-10 pr-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-[hsl(var(--trust))]/20"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-text-3">Preferred time</label>
        <input
          type="text"
          value={preferredTime}
          onChange={(e) => setPreferredTime(e.target.value)}
          placeholder="e.g. Saturday morning"
          className="h-12 w-full rounded-2xl border border-[hsl(var(--trust))]/15 bg-[hsl(222_44%_98%)] px-4 text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--trust))]/20"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-text-3">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Tell us about access, building rules, or scope."
          className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--trust))]/20"
        />
      </div>

      <Button type="submit" variant="primary" className="w-full rounded-2xl py-6 text-base font-semibold" loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
