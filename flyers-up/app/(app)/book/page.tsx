'use client';

/**
 * Gated booking entrypoint for dormant lanes.
 *
 * - Default: keep existing behavior (send users to normal browsing)
 * - Gated: /book?category=hoarding -> show hoarding lane (hidden from public lists)
 */

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import ProCard from '@/components/ProCard';
import {
  getCategoryBySlug,
  getHoardingPros,
  getCurrentUser,
  type ServiceCategory,
  type ServicePro,
} from '@/lib/api';

function BookGateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');

  const isHoarding = category === 'hoarding';

  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<ServiceCategory | null>(null);
  const [pros, setPros] = useState<ServicePro[]>([]);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (!isHoarding) return 'Book a Service';
    return 'Hoarding / Extreme Clutter';
  }, [isHoarding]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const user = await getCurrentUser();
      if (!user) {
        const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/book';
        router.replace(`/signin?next=${encodeURIComponent(next)}`);
        return;
      }

      if (!isHoarding) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const hoardingCategory = await getCategoryBySlug('hoarding', { includeHidden: true });
      if (!mounted) return;

      if (!hoardingCategory) {
        setCat(null);
        setPros([]);
        setError(
          'Hoarding lane is not configured yet. Ask an admin to run the latest Supabase migrations (006+) and create the hoarding category.'
        );
        setLoading(false);
        return;
      }

      setCat(hoardingCategory);
      const hoardingPros = await getHoardingPros();
      if (!mounted) return;

      setPros(hoardingPros);
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [isHoarding, router]);

  if (!isHoarding) {
    return (
      <Layout title={title} showBackButton>
        <div className="max-w-2xl mx-auto">
          <div className="bg-surface border border-border rounded-lg p-6">
            <p className="text-text">
              Booking starts from browsing. Use{' '}
              <Link className="text-text hover:underline" href="/services">
                Browse Services
              </Link>
              .
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={title} showBackButton>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text mb-2">{cat?.name ?? title}</h1>
          <p className="text-muted">
            This lane is currently gated (not visible in public category lists). Continue only if you
            intended to book this specialty.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted/70">Loading professionals...</p>
          </div>
        ) : error ? (
          <div className="bg-surface border border-danger/30 rounded-lg p-6">
            <p className="text-text font-medium mb-2">Not available</p>
            <p className="text-text">{error}</p>
          </div>
        ) : pros.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-8 text-center">
            <p className="text-text font-medium mb-2">No hoarding-specialty pros available.</p>
            <p className="text-sm text-muted/70">
              A pro must opt in (accepts_hoarding_jobs=true) before they appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pros.map((pro) => (
              <ProCard key={pro.id} pro={pro} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function BookGatePage() {
  return (
    <Suspense
      fallback={
        <Layout title="Book a Service" showBackButton>
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <p className="text-muted/70">Loading...</p>
            </div>
          </div>
        </Layout>
      }
    >
      <BookGateContent />
    </Suspense>
  );
}


