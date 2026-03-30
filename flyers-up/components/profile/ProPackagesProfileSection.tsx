'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ServicePackagePublic } from '@/types/service-packages';
import { Card } from '@/components/ui/Card';

export function ProPackagesProfileSection({ proId, bookHref }: { proId: string; bookHref: string }) {
  const [packages, setPackages] = useState<ServicePackagePublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/pros/${encodeURIComponent(proId)}/packages`, { credentials: 'include' });
        const j = await res.json();
        if (cancelled) return;
        if (res.ok && j.ok && Array.isArray(j.packages)) {
          setPackages(j.packages as ServicePackagePublic[]);
        }
      } catch {
        if (!cancelled) setPackages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proId]);

  if (loading || packages.length === 0) return null;

  const bookBase = bookHref.split('?')[0] ?? bookHref;

  return (
    <section>
      <h2 className="text-lg font-semibold text-text mb-3">Packages</h2>
      <ul className="space-y-3">
        {packages.map((pkg) => {
          const href = `${bookBase}?packageId=${encodeURIComponent(pkg.id)}`;
          const price = (pkg.base_price_cents / 100).toFixed(2);
          return (
            <li key={pkg.id}>
              <Card padding="md" className="border border-border">
                <p className="font-semibold text-text">{pkg.title}</p>
                {pkg.short_description && (
                  <p className="text-sm text-text2 mt-1">{pkg.short_description}</p>
                )}
                <p className="text-sm text-text mt-2">
                  ${price}
                  {pkg.estimated_duration_minutes != null && pkg.estimated_duration_minutes > 0 && (
                    <span className="text-text2"> · Est. {pkg.estimated_duration_minutes} min</span>
                  )}
                </p>
                {pkg.deliverables.length > 0 && (
                  <ul className="mt-2 text-sm text-text2 list-disc list-inside space-y-0.5">
                    {pkg.deliverables.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
                <Link
                  href={href}
                  className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium border border-accent bg-accent/10 text-text hover:bg-accent/20 transition"
                >
                  Select package
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
