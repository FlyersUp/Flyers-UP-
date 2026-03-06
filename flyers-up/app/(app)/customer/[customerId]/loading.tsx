import { ProfilePageShell } from '@/components/profile/ProfilePageShell';

export default function Loading() {
  return (
    <ProfilePageShell>
      <div className="h-12 -mx-4 px-4 py-3 border-b border-hairline bg-white/90" />
      <div className="pt-4">
        <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
          <div className="flex gap-4">
            <div className="h-[72px] w-[72px] rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse" />
              <div className="mt-3 h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
              <div className="mt-4 h-10 w-40 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </ProfilePageShell>
  );
}

