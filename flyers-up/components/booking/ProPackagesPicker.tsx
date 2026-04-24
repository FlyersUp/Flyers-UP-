'use client';

import { useEffect, useState } from 'react';
import type { ServicePackagePublic } from '@/types/service-packages';
import { Card } from '@/components/ui/Card';

function formatIncluded(deliverables: string[], max = 4): string[] {
  const lines = deliverables.filter(Boolean).slice(0, max);
  return lines;
}

export function ProPackagesPicker({
  proId,
  selectedPackageId,
  onSelectPackageId,
  /** When set, skip internal fetch and use this list (may be empty). */
  externalPackages,
  externalLoading,
}: {
  proId: string;
  selectedPackageId: string | null;
  onSelectPackageId: (id: string | null) => void;
  externalPackages?: ServicePackagePublic[] | null;
  externalLoading?: boolean;
}) {
  const [packages, setPackages] = useState<ServicePackagePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const controlled = externalPackages != null;

  useEffect(() => {
    if (controlled) {
      setPackages(externalPackages ?? []);
      setLoading(Boolean(externalLoading));
      setError(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pros/${encodeURIComponent(proId)}/packages`, {
          credentials: 'include',
        });
        const j = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof j.error === 'string' ? j.error : 'Could not load packages');
          setPackages([]);
          return;
        }
        if (j.ok && Array.isArray(j.packages)) {
          setPackages(j.packages as ServicePackagePublic[]);
        } else {
          setPackages([]);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load packages');
          setPackages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [proId, controlled, externalPackages, externalLoading]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 w-32 bg-surface2 rounded" />
        <div className="h-20 bg-surface2 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-text2">{error}</p>;
  }

  if (packages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-semibold text-[#2d3436] dark:text-white">Packages</label>
        {selectedPackageId && (
          <button
            type="button"
            className="text-sm font-medium text-[#4A69BD] underline-offset-2 hover:underline dark:text-[#6b8fd4]"
            onClick={() => onSelectPackageId(null)}
          >
            Clear selection
          </button>
        )}
      </div>
      <p className="text-xs text-[#6B7280] dark:text-white/55">
        Optional bundles — one package sets your scope and price. Clear it anytime to pick a single service type instead.
      </p>
      <ul className="space-y-3">
        {packages.map((pkg) => {
          const selected = selectedPackageId === pkg.id;
          const price = (pkg.base_price_cents / 100).toFixed(2);
          const compare = pkg.compare_at_cents != null && pkg.compare_at_cents > pkg.base_price_cents;
          const saveCents = compare ? pkg.compare_at_cents! - pkg.base_price_cents : 0;
          const included = formatIncluded(pkg.deliverables);
          return (
            <li key={pkg.id}>
              <button
                type="button"
                onClick={() => onSelectPackageId(selected ? null : pkg.id)}
                className={`w-full text-left rounded-2xl border transition-shadow ${
                  selected
                    ? 'border-[#4A69BD] bg-[#4A69BD]/[0.08] shadow-[0_4px_16px_rgba(74,105,189,0.14)] ring-1 ring-[#4A69BD]/20 dark:bg-[#4A69BD]/12'
                    : 'border-[#E5E7EB] bg-white shadow-[0_2px_12px_rgba(74,105,189,0.05)] hover:border-[#4A69BD]/30 dark:border-white/12 dark:bg-[#14161c]'
                }`}
              >
                <Card padding="md" className="!border-0 !bg-transparent !shadow-none">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between gap-x-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-text">{pkg.title}</p>
                        {compare ? (
                          <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full bg-emerald-100 text-emerald-900 px-2 py-0.5 dark:bg-emerald-900/40 dark:text-emerald-100">
                            Save ${(saveCents / 100).toFixed(0)}
                          </span>
                        ) : null}
                      </div>
                      {pkg.short_description && (
                        <p className="text-sm text-text2 mt-1 line-clamp-2">{pkg.short_description}</p>
                      )}
                      {included.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Includes</p>
                          <ul className="mt-1 text-sm text-text2 space-y-0.5">
                            {included.map((d, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-[#4A69BD] dark:text-[#7BA3E8]">✓</span>
                                <span className="min-w-0">{d}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-base font-bold text-[#4A69BD] dark:text-[#7BA3E8] mt-2">
                        ${price}
                        {pkg.estimated_duration_minutes != null && pkg.estimated_duration_minutes > 0 && (
                          <span className="text-sm font-normal text-text2">
                            {' '}
                            · ~{pkg.estimated_duration_minutes} min
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 self-start rounded-xl border px-3 py-2 text-xs font-semibold sm:mt-1 ${
                        selected
                          ? 'border-[#4A69BD] bg-[#4A69BD] text-white'
                          : 'border-[#E5E7EB] bg-white text-[#2d3436] dark:border-white/12 dark:bg-[#1a1d24] dark:text-white'
                      }`}
                    >
                      {selected ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </Card>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
