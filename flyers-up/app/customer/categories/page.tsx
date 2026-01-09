'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { mockCategories } from '@/lib/mockData';
import Link from 'next/link';

/**
 * Category List - Screen 2
 * Grid of all service categories
 */
export default function CategoriesPage() {
  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            All Categories
          </h1>
          <Label>SEE ALL CATEGORIES</Label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mockCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/customer/categories/${cat.id}`}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-[#A8E6CF] transition-colors text-center"
            >
              <div className="text-4xl mb-3">{cat.icon}</div>
              <div className="font-medium text-gray-900">{cat.name}</div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}












