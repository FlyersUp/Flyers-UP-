'use client';

/**
 * Services Browse Page
 * Displays all service categories for customers to browse
 * 
 * Uses Supabase for data fetching.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ServiceCategoryCard from '@/components/ServiceCategoryCard';
import { getServiceCategories, type ServiceCategory } from '@/lib/api';
import { getCurrentUser } from '@/lib/api';

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadCategories = async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.replace('/signin?next=/services');
        return;
      }
      // Fetch categories from Supabase
      const data = await getServiceCategories();
      setCategories(data);
      setIsLoading(false);
    };

    loadCategories();
  }, [router]);

  return (
    <Layout title="Flyers Up" showBackButton>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-text mb-2">
          Browse Services
        </h1>
        <p className="text-muted">
          Find trusted local professionals for any job.
        </p>
      </div>

      {/* Categories grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted/70">Loading services...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-surface border border-hairline shadow-card rounded-[18px] p-8 text-center">
          <p className="text-muted/70 mb-2">No service categories available yet.</p>
          <p className="text-sm text-muted/60">
            Categories will appear here once they&apos;re added to the database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map(category => (
            <ServiceCategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}

      {/* Info text */}
      <div className="mt-8 p-5 bg-info/10 rounded-[18px] border border-hairline shadow-card">
        <p className="text-sm text-info">
          💡 <strong>Tip:</strong> Click on a category to see available professionals in your area.
        </p>
      </div>
    </Layout>
  );
}
