'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';
import { FlyerWall } from '@/components/flyers/FlyerWall';
import type { ProProfilePro } from '@/components/pro/ProProfileCard';

interface Subcategory {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
}

/**
 * Service Pro List with subcategory filter.
 * GET /api/marketplace/pros?serviceSlug=...&subcategorySlug=...
 */
export default function ServiceProListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serviceName, setServiceName] = useState<string>('Service Pros');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string | null>(null);
  const [pros, setPros] = useState<ProProfilePro[]>([]);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/signin?next=/customer/services/${encodeURIComponent(slug)}`);
        return;
      }
      setReady(true);
    };
    void check();
  }, [router, slug]);

  useEffect(() => {
    if (!ready || !slug) return;

    const load = async () => {
      setLoading(true);
      try {
        const [servicesRes, subRes, prosRes] = await Promise.all([
          fetch('/api/marketplace/services'),
          fetch(`/api/marketplace/subcategories?serviceSlug=${encodeURIComponent(slug)}`),
          fetch(
            `/api/marketplace/pros?serviceSlug=${encodeURIComponent(slug)}${
              selectedSubcategorySlug ? `&subcategorySlug=${encodeURIComponent(selectedSubcategorySlug)}` : ''
            }`
          ),
        ]);

        const servicesData = await servicesRes.json();
        const subData = await subRes.json();
        const prosData = await prosRes.json();

        const svc = (servicesData.services ?? []).find((s: { slug: string }) => s.slug === slug);
        setServiceName(svc?.name ?? slug);
        setSubcategories(subData.subcategories ?? []);

        const raw = prosData.pros ?? [];
        setPros(
          raw.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            displayName: (p.display_name as string) ?? 'Pro',
            photoUrl: (p.logo_url as string) ?? null,
            primaryCategory: (p.category_name as string) ?? '',
            rating: Number(p.rating) ?? 0,
            reviewsCount: Number(p.review_count) ?? 0,
            tagline: (p.bio as string)?.trim() || null,
            availability: (p.business_hours as string)?.trim() || null,
            serviceRadius: (p.service_radius as number) ?? null,
            serviceRadiusMiles: (p.service_radius as number) ?? null,
            startingPrice: Number(p.starting_price) ?? 0,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [ready, slug, selectedSubcategorySlug]);

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Link href="/customer/services" className="text-sm text-muted mb-2 inline-block">
            ← Back to Services
          </Link>
          <h1 className="text-2xl font-semibold text-text mb-2">
            {serviceName}
          </h1>

          {subcategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubcategorySlug(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !selectedSubcategorySlug
                    ? 'bg-accent text-accentContrast'
                    : 'bg-surface2 text-text hover:bg-surface'
                }`}
              >
                All
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubcategorySlug(sub.slug)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedSubcategorySlug === sub.slug
                      ? 'bg-accent text-accentContrast'
                      : 'bg-surface2 text-text hover:bg-surface'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="surface-card p-6">
            <p className="text-sm text-muted/70">Loading pros…</p>
          </div>
        ) : pros.length === 0 ? (
          <div className="surface-card p-6 border-l-[3px] border-l-accent">
            <div className="text-base font-semibold text-text">No pros available</div>
            <div className="mt-1 text-sm text-muted">
              Try another subcategory or service.
            </div>
            <div className="mt-4">
              <Link href="/customer/services" className="text-sm font-medium text-accent hover:underline">
                Browse services
              </Link>
            </div>
          </div>
        ) : (
          <FlyerWall
            pros={pros}
            categoryName={serviceName}
            getBookHref={(proId) => `/book/${encodeURIComponent(proId)}`}
            getMessageHref={(proId) => `/customer/pros/${encodeURIComponent(proId)}`}
          />
        )}
      </div>
    </AppLayout>
  );
}
