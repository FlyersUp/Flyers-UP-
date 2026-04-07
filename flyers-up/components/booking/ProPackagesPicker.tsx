'use client';

import { useEffect, useState } from 'react';
import type { ServicePackagePublic } from '@/types/service-packages';
import { Card } from '@/components/ui/Card';

export function ProPackagesPicker({
  proId,
  selectedPackageId,
  onSelectPackageId,
}: {
  proId: string;
  selectedPackageId: string | null;
  onSelectPackageId: (id: string | null) => void;
}) {
  const [packages, setPackages] = useState<ServicePackagePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [proId]);

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
    return (
      <p className="text-sm text-text2">
        No packages yet — you can still send a custom request below.
      </p>
    );
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
        Optional — pick one package to set scope and price. When a package is selected, you do not choose a separate
        service type; the package is enough.
      </p>
      <ul className="space-y-3">
        {packages.map((pkg) => {
          const selected = selectedPackageId === pkg.id;
          const price = (pkg.base_price_cents / 100).toFixed(2);
          return (
            <li key={pkg.id}>
              <Card
                padding="md"
                className={`!border-[#E5E7EB] !bg-white shadow-[0_2px_12px_rgba(74,105,189,0.05)] transition-shadow dark:!border-white/12 dark:!bg-[#14161c] ${
                  selected
                    ? '!border-[#4A69BD] !bg-[#4A69BD]/[0.06] shadow-[0_4px_16px_rgba(74,105,189,0.14)] ring-1 ring-[#4A69BD]/20 dark:!bg-[#4A69BD]/12'
                    : ''
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{pkg.title}</p>
                    {pkg.short_description && (
                      <p className="text-sm text-text2 mt-1">{pkg.short_description}</p>
                    )}
                    <p className="text-sm font-medium text-text mt-2">
                      ${price}
                      {pkg.estimated_duration_minutes != null && pkg.estimated_duration_minutes > 0 && (
                        <span className="text-text2 font-normal">
                          {' '}
                          · Est. {pkg.estimated_duration_minutes} min
                        </span>
                      )}
                    </p>
                    {pkg.deliverables.length > 0 && (
                      <ul className="mt-2 text-sm text-text2 list-disc list-inside space-y-0.5">
                        {pkg.deliverables.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectPackageId(selected ? null : pkg.id)}
                    className={`flex-shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                      selected
                        ? 'border-[#4A69BD] bg-[#4A69BD] text-white shadow-sm'
                        : 'border-[#E5E7EB] bg-white text-[#2d3436] hover:border-[#4A69BD]/35 dark:border-white/12 dark:bg-[#14161c] dark:text-white'
                    }`}
                  >
                    {selected ? 'Selected' : 'Select package'}
                  </button>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
