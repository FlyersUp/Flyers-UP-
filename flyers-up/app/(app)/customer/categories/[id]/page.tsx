'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getProsByCategory } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { FlyerWall } from '@/components/flyers/FlyerWall';
import type { ProProfilePro } from '@/components/pro/ProProfileCard';

/**
 * Service Pro List - Screen 3
 * Flyer Wall: Option C - clean minimal paper cards
 */
export default function CategoryProList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string>('Service Pros');
  const [categoryUnavailable, setCategoryUnavailable] = useState(false);
  const [pros, setPros] = useState<ProProfilePro[]>([]);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/signin?next=/customer/categories/${encodeURIComponent(id)}`);
        return;
      }
      setReady(true);

      // Real category + pros (no mock data)
      const categoryId = normalizeUuidOrNull(id);
      if (!categoryId) {
        setCategoryName('Category');
        setPros([]);
        setLoading(false);
        return;
      }

      try {
        const { data: cat } = await supabase
          .from('service_categories')
          .select('name, slug, is_active_phase1')
          .eq('id', categoryId)
          .maybeSingle();

        if (cat && (cat as { is_active_phase1?: boolean }).is_active_phase1 === false) {
          setCategoryName(cat?.name || 'Category');
          setCategoryUnavailable(true);
          setPros([]);
          setLoading(false);
          return;
        }
        setCategoryName(cat?.name || 'Service Pros');
        if (cat?.slug) {
          const data = await getProsByCategory(cat.slug);
          setPros(
            data.map((p) => ({
              id: p.id,
              displayName: p.name,
              photoUrl: p.logoUrl ?? null,
              primaryCategory: p.categoryName,
              rating: p.rating,
              reviewsCount: p.reviewCount,
              tagline: p.bio?.trim() || null,
              availability: p.businessHours?.trim() || null,
              serviceRadius: p.serviceRadius ?? null,
              serviceRadiusMiles: p.serviceRadius ?? null,
              startingPrice: p.startingPrice,
            }))
          );
        } else {
          setPros([]);
        }
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, [id, router]);

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
          <Link href="/customer/categories" className="text-sm text-muted mb-2 inline-block">
            ← Back to Categories
          </Link>
          <h1 className="text-2xl font-semibold text-text mb-2">
            {categoryName}
          </h1>
        </div>

        {categoryUnavailable ? (
          <div className="surface-card p-6 border-l-[3px] border-l-accent">
            <div className="text-base font-semibold text-text">This category is temporarily unavailable during platform updates.</div>
            <div className="mt-2 text-sm text-muted">
              Check back soon or browse other categories.
            </div>
            <div className="mt-4">
              <Link href="/customer/categories" className="text-sm font-medium text-accent hover:underline">
                ← Back to categories
              </Link>
            </div>
          </div>
        ) : loading ? (
          <div className="surface-card p-6">
            <p className="text-sm text-muted/70">Loading pros…</p>
          </div>
        ) : pros.length === 0 ? (
          <div className="surface-card p-6 border-l-[3px] border-l-accent">
            <div className="text-base font-semibold text-text">No pros available</div>
            <div className="mt-1 text-sm text-muted">
              Try expanding your filters or service area.</div>
            <div className="mt-4">
              <Link href="/customer/categories" className="text-sm font-medium text-accent hover:underline">
                Browse categories
              </Link>
            </div>
          </div>
        ) : (
          <FlyerWall
            pros={pros}
            categoryName={categoryName}
            getBookHref={(proId) => `/book/${encodeURIComponent(proId)}`}
            getMessageHref={(proId) => `/customer/pros/${encodeURIComponent(proId)}`}
          />
        )}
      </div>
    </AppLayout>
  );
}












