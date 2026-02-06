'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { ServiceProCard } from '@/components/ui/ServiceProCard';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getProsByCategory } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';
import { normalizeUuidOrNull } from '@/lib/isUuid';

/**
 * Service Pro List - Screen 3
 * List of pros for a category with filters
 */
export default function CategoryProList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState<string>('Service Pros');
  const [pros, setPros] = useState<Array<{
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    startingPrice: number;
    badges?: any[];
  }>>([]);

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
          .select('name, slug')
          .eq('id', categoryId)
          .maybeSingle();

        setCategoryName(cat?.name || 'Service Pros');
        if (cat?.slug) {
          const data = await getProsByCategory(cat.slug);
          setPros(
            data.map((p) => ({
              id: p.id,
              name: p.name,
              rating: p.rating,
              reviewCount: p.reviewCount,
              startingPrice: p.startingPrice,
              badges: [],
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
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/customer/categories" className="text-sm text-muted mb-2 inline-block">
            ← Back to Categories
          </Link>
          <h1 className="text-2xl font-semibold text-text mb-2">
            {categoryName}
          </h1>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="Price" />
            <Input placeholder="Rating" />
            <Input placeholder="Distance" />
          </div>
        </div>

        {/* Pro List */}
        {loading ? (
          <div className="surface-card p-6">
            <p className="text-sm text-muted/70">Loading pros…</p>
          </div>
        ) : pros.length === 0 ? (
          <div className="surface-card p-6 border-l-[3px] border-l-accent">
            <div className="text-base font-semibold text-text">No pros listed yet</div>
            <div className="mt-1 text-sm text-muted">
              When pros join this category, they’ll appear here.
            </div>
            <div className="mt-4">
              <Link href="/services" className="text-sm font-medium text-text hover:underline">
                Browse services →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {pros.map((pro) => (
              <Link key={pro.id} href={`/customer/pros/${pro.id}`}>
                <ServiceProCard
                  name={pro.name}
                  rating={pro.rating}
                  reviewCount={pro.reviewCount}
                  startingPrice={pro.startingPrice}
                  badges={pro.badges}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}












