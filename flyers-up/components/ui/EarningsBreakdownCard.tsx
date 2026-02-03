import Link from 'next/link';

export type EarningsBreakdown = {
  grossToday: number | null;
  platformFee: number | null;
  holdback: number | null;
  netPayout: number | null;
  payoutDate: string | null;
};

function formatMoney(n: number | null) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatText(v: string | null) {
  return v == null || v.trim() === '' ? '—' : v;
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="text-sm text-muted">{label}</div>
      <div className={emphasize ? 'text-sm font-semibold text-text' : 'text-sm text-text'}>{value}</div>
    </div>
  );
}

export function EarningsBreakdownCard({
  breakdown,
  payoutsHref,
}: {
  breakdown: EarningsBreakdown;
  payoutsHref?: string | null;
}) {
  const linkDisabled = !payoutsHref;
  return (
    <div className="surface-card">
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-sm font-semibold text-text">Earnings Breakdown</div>
          {linkDisabled ? (
            <span className="text-sm text-muted/60">See payouts</span>
          ) : (
            <Link href={payoutsHref} className="text-sm text-muted hover:text-text transition-colors">
              See payouts
            </Link>
          )}
        </div>

        <div className="mt-4 divide-y divide-[color:var(--hairline)]">
          <Row label="Gross today" value={formatMoney(breakdown.grossToday)} />
          <Row label="Platform fee" value={formatMoney(breakdown.platformFee)} />
          <Row label="Shield holdback" value={formatMoney(breakdown.holdback)} />
          <Row label="Net payout" value={formatMoney(breakdown.netPayout)} emphasize />
          <Row label="Payout date" value={formatText(breakdown.payoutDate)} />
        </div>
      </div>
    </div>
  );
}

