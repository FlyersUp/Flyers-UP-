/**
 * Reusable KPI card for admin dashboard.
 * Shows label, big value, optional helper text / trend.
 */

interface KpiCardProps {
  label: string;
  value: string | number;
  helperText?: string;
  /** Optional period label (e.g. "Today", "Last 7 days") */
  periodLabel?: string;
}

export function KpiCard({ label, value, helperText, periodLabel }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      {periodLabel ? (
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{periodLabel}</p>
      ) : null}
      <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
      <p className="text-sm text-muted">{label}</p>
      {helperText ? <p className="mt-0.5 text-xs text-muted">{helperText}</p> : null}
    </div>
  );
}
