import Link from 'next/link';
import type { ProCredential } from '@/lib/profileData';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-hairline last:border-b-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="text-sm font-medium text-text text-right">{value}</div>
    </div>
  );
}

function CredentialRow({ c }: { c: ProCredential }) {
  const updated = c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-hairline last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{c.label}</div>
        {updated ? <div className="text-xs text-muted mt-1">Updated {updated}</div> : null}
        {c.url ? (
          <div className="text-xs mt-1">
            <Link href={c.url} className="text-muted hover:text-text underline underline-offset-4">
              View document
            </Link>
          </div>
        ) : null}
      </div>
      <div className="shrink-0">
        {c.verified ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text">
            <span className="text-accent" aria-hidden>
              ✓
            </span>
            Verified
          </span>
        ) : (
          <span className="text-xs text-muted">Listed</span>
        )}
      </div>
    </div>
  );
}

export function AboutPanel({
  aboutLong,
  bio,
  credentials,
  serviceRadiusMiles,
  businessHoursSummary,
}: {
  aboutLong: string | null;
  bio: string | null;
  credentials: ProCredential[];
  serviceRadiusMiles: number | null;
  businessHoursSummary: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
        <div className="text-sm font-semibold">About this business</div>
        <div className="mt-2 text-sm text-text/90 whitespace-pre-line">
          {aboutLong ?? bio ?? 'No additional details yet.'}
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
        <div className="text-sm font-semibold">Details</div>
        <div className="mt-2">
          {businessHoursSummary ? <Row label="Hours" value={businessHoursSummary} /> : null}
          {serviceRadiusMiles != null ? <Row label="Service radius" value={`${serviceRadiusMiles} mi`} /> : null}
          <Row label="Service guarantee" value="Satisfaction matters — contact support if issues arise." />
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-white shadow-sm p-5">
        <div className="text-sm font-semibold">Credentials</div>
        {credentials.length ? (
          <div className="mt-2">
            {credentials.map((c, idx) => (
              <CredentialRow key={`${c.label}-${idx}`} c={c} />
            ))}
          </div>
        ) : (
          <div className="mt-2 text-sm text-muted">No credentials listed yet.</div>
        )}
      </div>
    </div>
  );
}

