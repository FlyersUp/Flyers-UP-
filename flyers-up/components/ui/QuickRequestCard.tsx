import Link from 'next/link';

export function QuickRequestCard({
  locationText,
  requestHref,
}: {
  locationText?: string | null;
  requestHref?: string | null;
}) {
  const disabled = !requestHref;

  return (
    <div className="surface-card border-l-[3px] border-l-[#6EE7B7]">
      <div className="p-5">
        <div className="text-sm font-semibold tracking-tight text-text">Quick Request</div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="What do you need help with?"
              className="w-full h-11 px-3 rounded-lg bg-surface2 border border-hairline text-text placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/25"
              // TODO: wire to a real search/request flow when available.
              disabled
            />
            {locationText ? <div className="mt-1 text-xs text-muted">{locationText}</div> : null}
          </div>

          {disabled ? (
            <button
              type="button"
              disabled
              className="h-11 px-4 rounded-lg bg-surface2 text-muted/60 font-medium border border-hairline cursor-not-allowed"
              title="TODO: wire to request flow"
            >
              Request a Pro
            </button>
          ) : (
            <Link
              href={requestHref}
              className="h-11 px-4 rounded-lg bg-accent text-accentContrast font-medium hover:opacity-95 transition-opacity inline-flex items-center"
            >
              Request a Pro
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

