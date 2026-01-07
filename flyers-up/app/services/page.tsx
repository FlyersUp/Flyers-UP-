'use client';

/**
 * Services Browse Page
 * Displays all service categories for customers to browse
 * 
 * Uses Supabase for data fetching.
 */

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import ServiceCategoryCard from '@/components/ServiceCategoryCard';
import { getServiceCategories, type ServiceCategory } from '@/lib/api';

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      // Fetch categories from Supabase
      const data = await getServiceCategories();
      setCategories(data);
      setIsLoading(false);
    };

    loadCategories();
  }, []);

  return (
    <Layout title="Flyers Up" showBackButton>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Browse Services
        </h1>
        <p className="text-gray-600">
          Find trusted local professionals for any job.
        </p>
      </div>

      {/* Categories grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading services...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-2">No service categories available yet.</p>
          <p className="text-sm text-gray-400">
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
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          💡 <strong>Tip:</strong> Click on a category to see available professionals in your area.
        </p>
      </div>
    </Layout>
  );
}
