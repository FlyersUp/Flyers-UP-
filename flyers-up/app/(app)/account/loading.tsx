import { AppLayout } from '@/components/layouts/AppLayout';

export default function Loading() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-[720px] mx-auto px-4 py-6">
        <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
          <div className="flex gap-4">
            <div className="h-[72px] w-[72px] rounded-full bg-surface2 animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-1/2 bg-surface2 rounded animate-pulse" />
              <div className="mt-3 h-4 w-2/3 bg-surface2 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-hairline bg-white shadow-sm p-5">
          <div className="h-4 w-1/3 bg-surface2 rounded animate-pulse" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface2 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

