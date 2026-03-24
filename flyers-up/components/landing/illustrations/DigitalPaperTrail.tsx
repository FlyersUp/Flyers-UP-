/**
 * Vertical timeline: job progression with a clear "paper trail" metaphor.
 */
export function DigitalPaperTrailIllustration({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-8 sm:gap-12 items-stretch ${className}`}>
      <div className="relative flex justify-center sm:justify-start shrink-0">
        <svg
          className="w-16 sm:w-20 h-auto text-blue-600"
          viewBox="0 0 80 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <title>Timeline</title>
          <line x1="40" y1="12" x2="40" y2="268" stroke="currentColor" strokeWidth="2" opacity="0.25" />
          <circle cx="40" cy="32" r="14" fill="#EFF6FF" stroke="currentColor" strokeWidth="2" />
          <path d="M34 32l4 4 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="40" cy="120" r="14" fill="#EFF6FF" stroke="currentColor" strokeWidth="2" />
          <rect x="32" y="114" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="white" />
          <path d="M36 120h8M36 124h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="40" cy="208" r="14" fill="#ECFDF5" stroke="#059669" strokeWidth="2" />
          <path d="M34 208h12M40 202v12" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="208" r="6" fill="#10B981" opacity="0.35" />
        </svg>
      </div>
      <div className="flex-1 space-y-6 sm:space-y-8">
        <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">Step 1</p>
          <h3 className="text-lg font-semibold text-slate-900">Details confirmed</h3>
          <p className="text-sm text-slate-600 mt-1">
            Scope and expectations are captured in writing—no fuzzy handshakes.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">Step 2</p>
          <h3 className="text-lg font-semibold text-slate-900">Scheduled</h3>
          <p className="text-sm text-slate-600 mt-1">
            Time and place live in one thread, synced with your booking.
          </p>
        </article>
        <article className="rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Step 3</p>
          <h3 className="text-lg font-semibold text-slate-900">Protected payment</h3>
          <p className="text-sm text-slate-600 mt-1">
            Funds flow through the platform with a record you can reference later.
          </p>
        </article>
      </div>
    </div>
  );
}
