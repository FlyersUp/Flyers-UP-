import type { SelectedPackageSnapshot } from '@/types/service-packages';

type PackageLike = {
  title: string;
  short_description: string | null;
  base_price_cents: number;
  estimated_duration_minutes: number | null;
  deliverables: unknown;
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean);
}

export function buildSelectedPackageSnapshot(row: PackageLike): SelectedPackageSnapshot {
  return {
    title: row.title,
    short_description: row.short_description,
    base_price_cents: row.base_price_cents,
    estimated_duration_minutes: row.estimated_duration_minutes,
    deliverables: asStringArray(row.deliverables),
  };
}

export function formatPackageScopeNotes(snapshot: SelectedPackageSnapshot, customerNotes: string): string {
  const lines: string[] = [`Package: ${snapshot.title}`];
  if (snapshot.short_description) {
    lines.push(snapshot.short_description);
  }
  if (snapshot.deliverables.length > 0) {
    lines.push("What's included:");
    for (const d of snapshot.deliverables) {
      lines.push(`• ${d}`);
    }
  }
  const scope = lines.join('\n');
  const extra = customerNotes.trim();
  if (!extra) return scope;
  return `${scope}\n\nCustomer notes:\n${extra}`;
}
