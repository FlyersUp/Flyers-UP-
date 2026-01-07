'use client';

/**
 * Service Pros by Category Page
 * Lists available service professionals for a specific category
 * 
 * Uses Supabase for data fetching.
 * 
 * FUTURE IMPROVEMENTS:
 * - Add filters (rating, price, availability)
 * - Add sorting options
 * - Add pagination for large result sets
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import ProCard from '@/components/ProCard';
import { getProsByCategory, getServiceCategories, type ServicePro, type ServiceCategory } from '@/lib/api';

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;
  
  const [pros, setPros] = useState<ServicePro[]>([]);
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Fetch category info and pros in parallel from Supabase
      const [allCategories, categoryPros] = await Promise.all([
        getServiceCategories(),
        getProsByCategory(categorySlug),
      ]);

      const currentCategory = allCategories.find(c => c.slug === categorySlug);
      setCategory(currentCategory || null);
      setPros(categoryPros);
      setIsLoading(false);
    };

    loadData();
  }, [categorySlug]);

  if (isLoading) {
    return (
      <Layout title="Flyers Up" showBackButton>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading professionals...</p>
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <Layout title="Flyers Up" showBackButton>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Category Not Found
          </h1>
          <p className="text-gray-600">
            The service category &quot;{categorySlug}&quot; doesn&apos;t exist.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Flyers Up" showBackButton>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{category.icon}</span>
          <h1 className="text-2xl font-bold text-gray-900">
            {category.name} Services
          </h1>
        </div>
        <p className="text-gray-600">{category.description}</p>
      </div>

      {/* Results count */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">
          {pros.length} professional{pros.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Pros list */}
      {pros.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-2">No professionals available in this category yet.</p>
          <p className="text-sm text-gray-400">Check back soon or try a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pros.map(pro => (
            <ProCard key={pro.id} pro={pro} />
          ))}
        </div>
      )}
    </Layout>
  );
}
