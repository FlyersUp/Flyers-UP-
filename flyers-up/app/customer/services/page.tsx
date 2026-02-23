'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';

interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * Main services list - browse by service.
 * Links to /customer/services/[slug] for pro listings with subcategory filter.
 */
export default function ServicesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/signin?next=/customer/services');
        return;
      }
      setReady(true);

      try {
        const res = await fetch('/api/marketplace/services');
        const data = await res.json();
        if (data.ok && Array.isArray(data.services)) {
          setServices(data.services);
        }
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, [router]);

  if (!ready) {
    return (
      <AppLayout mode="customer">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-sm text-muted/70">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/customer" className="text-sm text-muted mb-2 inline-block">
            ← Back
          </Link>
          <h1 className="text-2xl font-semibold text-text mb-2">
            Choose a service
          </h1>
          <Label>BROWSE FIRST, REQUEST WHEN READY</Label>
          <p className="mt-2 text-sm text-muted">
            <Link href="/customer/categories" className="text-accent hover:underline">
              ← Browse by category
            </Link>
          </p>
        </div>

        {loading ? (
          <div className="surface-card p-6">
            <p className="text-sm text-muted/70">Loading services…</p>
          </div>
        ) : services.length === 0 ? (
          <div className="surface-card p-6 border-l-[3px] border-l-accent">
            <div className="text-base font-semibold text-text">No services yet</div>
            <div className="mt-1 text-sm text-muted">
              Services will appear here once they’re added.
            </div>
            <div className="mt-4">
              <Link href="/customer/categories" className="text-sm font-medium text-accent hover:underline">
                Try categories →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map((s) => (
              <Link
                key={s.id}
                href={`/customer/services/${encodeURIComponent(s.slug)}`}
                className="bg-surface rounded-xl p-6 border border-border hover:border-accent transition-colors text-center"
              >
                <div className="font-medium text-text">{s.name}</div>
                {s.description && (
                  <p className="text-sm text-muted mt-1 line-clamp-2">{s.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
