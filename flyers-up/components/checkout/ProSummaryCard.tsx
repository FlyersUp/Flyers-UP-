'use client';

/**
 * Pro summary card for checkout.
 * Shows real pro photo if available; otherwise "No photo yet" tile (no initials avatars).
 */
export function ProSummaryCard({
  proName,
  proPhotoUrl,
  serviceName,
}: {
  proName: string;
  proPhotoUrl: string | null;
  serviceName: string;
}) {
  return (
    <div
      className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F5]">
          {proPhotoUrl ? (
            <img
              src={proPhotoUrl}
              alt={proName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[#6A6A6A]">
              No photo yet
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#111111]">{proName}</p>
          <p className="text-sm text-[#6A6A6A]">{serviceName}</p>
        </div>
      </div>
    </div>
  );
}
