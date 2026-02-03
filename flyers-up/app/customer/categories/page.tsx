'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { mockCategories } from '@/lib/mockData';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/api';

/**
 * Category List - Screen 2
 * Grid of all service categories
 */
export default function CategoriesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/signin?next=/customer/categories');
        return;
      }
      setReady(true);
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
          <h1 className="text-2xl font-semibold text-text mb-2">
            All Categories
          </h1>
          <Label>SEE ALL CATEGORIES</Label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mockCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/customer/categories/${cat.id}`}
              className="bg-surface rounded-xl p-6 border border-border hover:border-accent transition-colors text-center"
            >
              <div className="text-4xl mb-3">{cat.icon}</div>
              <div className="font-medium text-text">{cat.name}</div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}












