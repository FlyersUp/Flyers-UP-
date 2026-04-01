'use client';

import type { ReactNode } from 'react';
import { parseProBookingNotes } from '@/lib/bookings/pro-job-notes';
import { formatAddonScopeSection } from '@/lib/service-packages/snapshot';

function mergeScopeWithBookingAddons(
  scopeText: string,
  addons?: Array<{ titleSnapshot: string; priceSnapshotCents: number }>
): string {
  if (!addons?.length) return scopeText;
  if (scopeText.includes('Add-ons:')) return scopeText;
  const block = formatAddonScopeSection(
    addons.map((a) => ({ title: a.titleSnapshot, price_cents: a.priceSnapshotCents }))
  );
  if (!block) return scopeText;
  return scopeText.trim() ? `${scopeText.trim()}\n\n${block}` : block;
}

function ScopeBlock({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let i = 0;
  let inList = false;

  const flushList = (items: string[], key: string) => {
    if (items.length === 0) return;
    elements.push(
      <ul key={key} className="mt-1 list-disc list-inside space-y-0.5 text-sm text-text">
        {items.map((item, j) => (
          <li key={j}>{item.replace(/^\u2022\s*/, '').replace(/^•\s*/, '').trim()}</li>
        ))}
      </ul>
    );
  };

  let listItems: string[] = [];
  let listKey = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();
    const isBullet = /^[•\u2022]\s/.test(trimmed) || trimmed.startsWith('•');

    if (isBullet) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(trimmed);
      i += 1;
      continue;
    }

    if (inList) {
      flushList(listItems, `ul-${listKey++}`);
      inList = false;
      listItems = [];
    }

    if (trimmed === '') {
      i += 1;
      continue;
    }

    if (/^Package:/i.test(trimmed)) {
      elements.push(
        <p key={`h-${i}`} className="text-sm font-semibold text-text">
          {trimmed}
        </p>
      );
    } else if (/^what'?s included/i.test(trimmed)) {
      elements.push(
        <p key={`w-${i}`} className="text-sm font-medium text-text mt-2">
          {trimmed}
        </p>
      );
    } else if (/^add-ons:?$/i.test(trimmed)) {
      elements.push(
        <p key={`a-${i}`} className="text-sm font-medium text-text mt-2">
          {trimmed}
        </p>
      );
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-sm text-text/90">
          {trimmed}
        </p>
      );
    }
    i += 1;
  }

  if (inList) flushList(listItems, `ul-${listKey++}`);

  return <div className="space-y-1">{elements}</div>;
}

/**
 * Structured job instructions for pros (package scope + customer notes).
 */
export function ProBookingJobNotes({
  notes,
  bookingAddonSnapshots,
  className = '',
}: {
  notes: string | null | undefined;
  /** Fallback for older bookings: notes lacked add-on lines but booking_addons rows exist. */
  bookingAddonSnapshots?: Array<{
    titleSnapshot: string;
    priceSnapshotCents: number;
  }>;
  className?: string;
}) {
  const { scopeText, customerNotes } = parseProBookingNotes(notes);
  const scopeDisplay = mergeScopeWithBookingAddons(scopeText, bookingAddonSnapshots);
  if (!scopeDisplay && !customerNotes) {
    return <p className={`text-sm text-muted ${className}`.trim()}>No notes for this job.</p>;
  }

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {scopeDisplay ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Scope &amp; package</p>
          <ScopeBlock text={scopeDisplay} />
        </div>
      ) : null}
      {customerNotes ? (
        <div className="rounded-xl border border-[hsl(var(--accent-pro))]/25 bg-[hsl(var(--card-neutral))] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Customer notes</p>
          <p className="text-sm text-text whitespace-pre-wrap">{customerNotes}</p>
        </div>
      ) : null}
    </div>
  );
}
