'use client';

/**
 * Gated booking entrypoint for dormant lanes.
 *
 * - Default: keep existing behavior (send users to normal browsing)
 * - Gated: /book?category=hoarding -> show hoarding lane (hidden from public lists)
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import ProCard from '@/components/ProCard';
import {
  getCategoryBySlug,
  getHoardingPros,
  type ServiceCategory,
  type ServicePro,
} from '@/lib/api';

export default function BookGatePage() {
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
  }, [isHoarding]);

  if (!isHoarding) {
    return (
      <Layout title={title} showBackButton>
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-700">
              Booking starts from browsing. Use{' '}
              <Link className="text-emerald-700 hover:underline" href="/services">
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{cat?.name ?? title}</h1>
          <p className="text-gray-600">
            This lane is currently gated (not visible in public category lists). Continue only if you
            intended to book this specialty.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading professionals...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <p className="text-red-700 font-medium mb-2">Not available</p>
            <p className="text-gray-700">{error}</p>
          </div>
        ) : pros.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-700 font-medium mb-2">No hoarding-specialty pros available.</p>
            <p className="text-sm text-gray-500">
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


