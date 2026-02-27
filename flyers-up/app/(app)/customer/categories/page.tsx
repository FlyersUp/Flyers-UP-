'use client';

import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getServiceCategories, type ServiceCategory } from '@/lib/api';

/**
 * Category List - Screen 2
 * Grid of all service categories
 */
export default function CategoriesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    const check = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/signin?next=/customer/categories');
        return;
      }
      setReady(true);

      // Real categories (no mock data)
      try {
        const data = await getServiceCategories();
        setCategories(data);
      } finally {
        setLoadingCats(false);
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
          <h1 className="text-2xl font-semibold text-text mb-2">
            Choose a category
          </h1>
          <Label>BROWSE FIRST, REQUEST WHEN READY</Label>
          <p className="mt-2 text-sm text-muted">
            <Link href="/customer/services" className="text-accent hover:underline">
              Browse by service with subcategory filters →
            </Link>
          </p>
        </div>

        {loadingCats ? (
          <div className="surface-card p-6">
            <p className="text-sm text-muted/70">Loading categories…</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="surface-card p-6 border-l-[3px] border-l-accent">
            <div className="text-base font-semibold text-text">No categories yet</div>
            <div className="mt-1 text-sm text-muted">
              Categories will appear here once they’re added.
            </div>
            <div className="mt-4">
              <Link href="/services" className="text-sm font-medium text-text hover:underline">
                Try the services page →
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/customer/categories/${encodeURIComponent(cat.id)}`}
                className="bg-surface rounded-xl p-6 border border-border hover:border-accent transition-colors text-center"
              >
                <div className="text-4xl mb-3">{cat.icon}</div>
                <div className="font-medium text-text">{cat.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}












