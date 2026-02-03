'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { ServiceProCard } from '@/components/ui/ServiceProCard';
import { Input } from '@/components/ui/Input';
import { mockServicePros, mockCategories } from '@/lib/mockData';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';

/**
 * Service Pro List - Screen 3
 * List of pros for a category with filters
 */
export default function CategoryProList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace(`/signin?next=/customer/categories/${encodeURIComponent(id)}`);
        return;
      }
      setReady(true);
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

  const category = mockCategories.find(c => c.id === id);
  const pros = mockServicePros.filter(p => p.category === category?.name || true);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/customer/categories" className="text-sm text-muted mb-2 inline-block">
            ← Back to Categories
          </Link>
          <h1 className="text-2xl font-semibold text-text mb-2">
            {category?.name || 'Service Pros'}
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
      </div>
    </AppLayout>
  );
}












