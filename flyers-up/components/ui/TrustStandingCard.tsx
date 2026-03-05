import Link from 'next/link';

export type Standing = {
  verifiedStatus: 'Verified' | 'Pending' | 'Needs action';
  insurance: 'On file' | 'Expiring soon' | 'Missing';
  credentials: { complete: number; total: number } | 'Not started';
  llcVerified: boolean | null;
};

export type TrustStandingInput = {
  guidelinesAcknowledged?: boolean;
  guidelinesAcceptedAt?: string | null;
  insuranceDocPath?: string | null;
  insuranceDocumentUrl?: string | null;
  insuranceExpiresAt?: string | null;
  backgroundCheckStatus?: string;
  certifications?: unknown[] | { name?: string; verified?: boolean }[];
};

const CREDENTIAL_NAMES = ['Insurance', 'Background check', 'ID verification'];

export function computeTrustStanding(input: TrustStandingInput | null | undefined): Standing {
  if (!input) {
    return {
      verifiedStatus: 'Needs action',
      insurance: 'Missing',
      credentials: 'Not started',
      llcVerified: null,
    };
  }

  const hasGuidelines = Boolean(input.guidelinesAcknowledged || input.guidelinesAcceptedAt);
  const bgStatus = (input.backgroundCheckStatus ?? 'not_started').toLowerCase();
  const verifiedStatus: Standing['verifiedStatus'] =
    hasGuidelines && bgStatus === 'verified'
      ? 'Verified'
      : hasGuidelines || bgStatus !== 'not_started'
        ? 'Pending'
        : 'Needs action';

  const hasInsurance = Boolean(input.insuranceDocPath || input.insuranceDocumentUrl);
  const expiresAt = input.insuranceExpiresAt ? new Date(input.insuranceExpiresAt) : null;
  const now = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const insurance: Standing['insurance'] = !hasInsurance
    ? 'Missing'
    : expiresAt && expiresAt.getTime() - now.getTime() < thirtyDays
      ? 'Expiring soon'
      : 'On file';

  const certs = Array.isArray(input.certifications) ? input.certifications : [];
  const total = Math.max(CREDENTIAL_NAMES.length, certs.length, 1);
  const complete = certs.filter((c) => (typeof c === 'object' && c && (c as { verified?: boolean }).verified) || (typeof c === 'string' && c)).length;
  const credentials: Standing['credentials'] =
    total === 0 ? 'Not started' : { complete: Math.min(complete, total), total };

  return {
    verifiedStatus,
    insurance,
    credentials,
    llcVerified: null,
  };
}

export function countActionNeeded(standing: Standing) {
  let n = 0;
  if (standing.verifiedStatus !== 'Verified') n += 1;
  if (standing.insurance !== 'On file') n += 1;
  if (standing.credentials === 'Not started') n += 1;
  else if (standing.credentials.complete < standing.credentials.total) n += 1;
  if (standing.llcVerified === false) n += 1;
  return n;
}

function StatusChip({ tone = 'neutral', children }: { tone?: 'neutral' | 'warn' | 'danger'; children: string }) {
  const toneClass =
    tone === 'warn'
      ? 'bg-warning/10 border-badgeBorder'
      : tone === 'danger'
        ? 'bg-danger/10 border-badgeBorder'
        : 'bg-badgeFill border-badgeBorder';
  return (
    <span
      className={[
        'inline-flex items-center h-7 px-2.5 rounded-full border',
        'text-[11px] uppercase tracking-wide font-medium text-text',
        toneClass,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="flex items-center gap-2">{value}</div>
    </div>
  );
}

export function TrustStandingCard({ standing }: { standing: Standing }) {
  const credentialsLabel =
    standing.credentials === 'Not started' ? 'Not started' : `${standing.credentials.complete}/${standing.credentials.total} complete`;

  const verifiedTone = standing.verifiedStatus === 'Needs action' ? 'danger' : standing.verifiedStatus === 'Pending' ? 'warn' : 'neutral';
  const insuranceTone = standing.insurance === 'Missing' ? 'danger' : standing.insurance === 'Expiring soon' ? 'warn' : 'neutral';
  const credsTone =
    standing.credentials === 'Not started'
      ? 'warn'
      : standing.credentials.complete < standing.credentials.total
        ? 'warn'
        : 'neutral';
  const llcTone = standing.llcVerified === false ? 'warn' : 'neutral';
  const llcLabel = standing.llcVerified == null ? '—' : standing.llcVerified ? 'Yes' : 'No';

  return (
    <div className="surface-card">
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-sm font-semibold text-text">Trust &amp; Standing</div>
          <Link href="/pro/verified-badge" className="text-sm text-muted hover:text-text transition-colors">
            View details
          </Link>
        </div>

        <div className="mt-4 divide-y divide-[color:var(--hairline)]">
          <Row label="Verified Status" value={<StatusChip tone={verifiedTone}>{standing.verifiedStatus}</StatusChip>} />
          <Row label="Insurance" value={<StatusChip tone={insuranceTone}>{standing.insurance}</StatusChip>} />
          <Row label="Credentials" value={<StatusChip tone={credsTone}>{credentialsLabel}</StatusChip>} />
          <Row label="LLC Verified" value={<StatusChip tone={llcTone}>{llcLabel}</StatusChip>} />
        </div>
      </div>
    </div>
  );
}

