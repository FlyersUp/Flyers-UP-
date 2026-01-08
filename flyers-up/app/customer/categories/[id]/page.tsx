'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { ServiceProCard } from '@/components/ui/ServiceProCard';
import { Input } from '@/components/ui/Input';
import { mockServicePros, mockCategories } from '@/lib/mockData';
import Link from 'next/link';
import { use } from 'react';

/**
 * Service Pro List - Screen 3
 * List of pros for a category with filters
 */
export default function CategoryProList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const category = mockCategories.find(c => c.id === id);
  const pros = mockServicePros.filter(p => p.category === category?.name || true);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Link href="/customer/categories" className="text-sm text-gray-600 mb-2 inline-block">
            ← Back to Categories
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
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











