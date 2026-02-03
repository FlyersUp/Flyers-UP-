import Link from 'next/link';

type TrustFlags = {
  verifiedPros: boolean;
  securePayments: boolean;
  supportHref?: string | null;
};

function Row({
  title,
  description,
  right,
  href,
}: {
  title: string;
  description: string;
  right?: string;
  href?: string | null;
}) {
  const content = (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-text">{title}</div>
        <div className="text-sm text-muted">{description}</div>
      </div>
      <div className="shrink-0 flex items-center gap-2 text-muted">
        {right ? <span className="text-sm text-muted">{right}</span> : null}
        <span aria-hidden className="text-sm">›</span>
      </div>
    </div>
  );

  if (!href) return <div>{content}</div>;
  return (
    <Link href={href} className="block hover:bg-surface2/60 rounded-xl px-2 -mx-2 transition-colors">
      {content}
    </Link>
  );
}

export function TrustCoverageCard({ flags }: { flags: TrustFlags }) {
  return (
    <div className="surface-card border-l-[3px] border-l-accent">
      <div className="p-5">
        <div className="text-sm font-semibold tracking-tight text-text">Trust &amp; Verification</div>

        <div className="mt-4 divide-y divide-[color:var(--hairline)]">
          <Row
            title="Verified Pros"
            description="Pros can verify identity and credentials."
            right={flags.verifiedPros ? 'On' : '—'}
            href="/trust-verification"
          />
          <Row
            title="Secure payments"
            description="Payments are handled through the platform when enabled."
            right={flags.securePayments ? 'On' : '—'}
            href="/settings/payments"
          />
          <Row
            title="Support"
            description="Get help when you need it."
            right=""
            href={flags.supportHref ?? null}
          />
        </div>
      </div>
    </div>
  );
}

