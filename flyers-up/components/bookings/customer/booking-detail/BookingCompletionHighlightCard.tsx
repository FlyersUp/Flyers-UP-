'use client';

export interface BookingCompletionHighlightCardProps {
  proName: string;
  serviceName: string;
  /** Short place or context, e.g. neighborhood or address snippet */
  contextLine?: string | null;
  completionNote?: string | null;
  afterPhotoUrl?: string | null;
  className?: string;
}

export function BookingCompletionHighlightCard({
  proName,
  serviceName,
  contextLine,
  completionNote,
  afterPhotoUrl,
  className = '',
}: BookingCompletionHighlightCardProps) {
  const summary =
    completionNote?.trim() ||
    `${proName} successfully completed your ${serviceName.toLowerCase()}${contextLine ? ` — ${contextLine}` : '.'}`;

  return (
    <section
      className={`rounded-2xl border border-sky-200/50 dark:border-sky-800/40 bg-gradient-to-br from-sky-50/95 via-indigo-50/40 to-white dark:from-sky-950/40 dark:via-indigo-950/20 dark:to-[#171A20] p-4 sm:p-5 shadow-sm ${className}`}
      aria-labelledby="completion-highlight-title"
    >
      <div className="flex gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <p id="completion-highlight-title" className="text-lg font-semibold text-[#1e3a8a] dark:text-sky-200">
            Job completed
          </p>
          <div className="mt-1 flex gap-0.5 text-amber-500" aria-hidden>
            {'★★★★★'.split('').map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
          <p className="mt-2 text-sm text-[#374151] dark:text-[#D1D5DB] leading-relaxed">{summary}</p>
        </div>
        {afterPhotoUrl ? (
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-white/60 dark:bg-white/5 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={afterPhotoUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
