import Link from 'next/link';

export type ServiceItem = {
  name: string;
  startingFromPrice?: number | null;
  durationRange?: string | null;
};

export function ServicesList({
  proId,
  services,
  limit = 10,
}: {
  proId: string;
  services: ServiceItem[];
  limit?: number;
}) {
  if (!services.length) {
    return (
      <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
        <div className="text-sm font-semibold">Services coming soon</div>
        <div className="mt-1 text-sm text-muted">This pro hasn’t listed services yet.</div>
      </div>
    );
  }

  const shown = services.slice(0, limit);
  const hasMore = services.length > shown.length;

  return (
    <div className="space-y-3">
      {shown.map((s) => (
        <div key={s.name} className="rounded-2xl border border-hairline bg-white shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{s.name}</div>
              <div className="mt-1 text-sm text-muted">
                {s.startingFromPrice != null ? `Starting at $${s.startingFromPrice}` : null}
                {s.startingFromPrice != null && s.durationRange ? ' • ' : null}
                {s.durationRange ? `Typical: ${s.durationRange}` : null}
                {s.startingFromPrice == null && !s.durationRange ? 'Details available on request.' : null}
              </div>
            </div>
            <div className="shrink-0">
              <Link
                href={`/book/${encodeURIComponent(proId)}?service=${encodeURIComponent(s.name)}`}
                className="inline-flex items-center justify-center rounded-xl px-3 py-2 bg-white border border-hairline text-text font-semibold text-sm hover:shadow-sm transition-shadow focus-ring btn-press"
              >
                Request
              </Link>
            </div>
          </div>
        </div>
      ))}

      {hasMore ? (
        <div className="text-sm text-muted">
          Showing {shown.length} of {services.length}. More services will appear here.
        </div>
      ) : null}
    </div>
  );
}

