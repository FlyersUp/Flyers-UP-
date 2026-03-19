'use client';

export function TrackBookingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse" data-role="customer">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-black/10 dark:bg-white/10" />
        <div className="h-5 w-28 rounded bg-black/10 dark:bg-white/10" />
      </div>

      {/* Status header */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5">
        <div className="flex justify-between gap-3 mb-3">
          <div className="h-6 w-48 rounded bg-black/10 dark:bg-white/10" />
          <div className="h-6 w-20 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
        <div className="h-4 w-full rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-3 w-3/4 rounded bg-black/5 dark:bg-white/5" />
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5">
        <div className="flex gap-4">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-black/10 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-black/10 dark:bg-white/10" />
            <div className="h-3 w-24 rounded bg-black/5 dark:bg-white/5" />
            <div className="h-3 w-40 rounded bg-black/5 dark:bg-white/5" />
          </div>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="h-4 w-16 rounded bg-black/10 dark:bg-white/10 mb-3" />
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6">
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-black/10 dark:bg-white/10" />
            ))}
          </div>
        </div>
      </div>

      {/* Messaging */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-black/10 dark:bg-white/10" />
            <div className="h-3 w-40 rounded bg-black/5 dark:bg-white/5" />
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5">
        <div className="h-4 w-16 rounded bg-black/10 dark:bg-white/10 mb-3" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-3/4 rounded bg-black/5 dark:bg-white/5" />
        </div>
      </div>
    </div>
  );
}
