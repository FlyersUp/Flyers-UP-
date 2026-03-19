import { ProfilePageShell } from '@/components/profile/ProfilePageShell';

export default function Loading() {
  return (
    <ProfilePageShell>
      <div className="h-14 -mx-4 px-4 py-3 border-b border-black/5 bg-white/95 dark:bg-[#171A20]/95 animate-pulse" />
      <div className="pt-6 space-y-6">
        {/* Hero skeleton */}
        <div className="rounded-2xl border border-black/6 bg-white dark:bg-[#1D2128] p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="h-20 w-20 rounded-full bg-black/10 dark:bg-white/10 animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-2/3 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-black/5 dark:bg-white/5 rounded animate-pulse" />
              <div className="h-px bg-black/5 dark:bg-white/5" />
              <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded animate-pulse" />
              <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
        {/* Trust badges skeleton */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-28 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
        {/* Services skeleton */}
        <div className="rounded-2xl border border-black/6 bg-white dark:bg-[#1D2128] p-5 shadow-sm">
          <div className="h-4 w-1/3 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
          <div className="mt-3 h-6 w-1/2 bg-black/10 dark:bg-white/10 rounded animate-pulse" />
        </div>
        {/* Gallery skeleton */}
        <div className="rounded-2xl border border-black/6 bg-white dark:bg-[#1D2128] p-4 shadow-sm">
          <div className="h-4 w-1/4 bg-black/10 dark:bg-white/10 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </ProfilePageShell>
  );
}

