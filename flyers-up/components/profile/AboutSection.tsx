'use client';

/**
 * About / Bio — Airbnb-style
 * Progressive disclosure with "Read more"
 */

import { useState } from 'react';
import { MapPin } from 'lucide-react';

interface AboutSectionProps {
  bio: string | null;
  aboutLong: string | null;
  locationLabel: string | null;
  categoryName?: string | null;
}

const MAX_PREVIEW = 200;

export function AboutSection({
  bio,
  aboutLong,
  locationLabel,
  categoryName,
}: AboutSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const text = aboutLong || bio || '';
  const hasMore = text.length > MAX_PREVIEW;
  const displayText = expanded ? text : text.slice(0, MAX_PREVIEW);
  const showReadMore = hasMore && !expanded;

  if (!text.trim()) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-black/6 dark:border-white/10 bg-white dark:bg-[#1D2128] p-5 shadow-sm shadow-black/5 dark:shadow-black/20">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6A6A6A] dark:text-[#A1A8B3]">
        About
      </h3>

      {locationLabel && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
          <MapPin size={14} strokeWidth={2} />
          <span>{locationLabel}</span>
        </div>
      )}

      {categoryName && (
        <p className="mt-1 text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
          {categoryName}
        </p>
      )}

      <div className="mt-4">
        <p className="text-sm leading-relaxed text-[#111111] dark:text-[#F5F7FA] whitespace-pre-wrap">
          {displayText}
          {showReadMore && '…'}
        </p>
        {showReadMore && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 text-sm font-semibold text-[#111111] dark:text-[#F5F7FA] underline underline-offset-2 hover:no-underline"
          >
            Read more
          </button>
        )}
      </div>
    </div>
  );
}
