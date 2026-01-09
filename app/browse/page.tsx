'use client';

/**
 * Service Marketplace - Browse Pros
 * Requires an authenticated customer session.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import FilterBar from '@/components/FilterBar';
import ProCardEnhanced from '@/components/ProCardEnhanced';
import TrustShieldBanner from '@/components/ui/TrustShieldBanner';
import PageLayout from '@/components/PageLayout';
import { SERVICE_CATEGORIES, MOCK_PROS, getProsByCategory } from '@/lib/mockData';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function BrowsePage() {
  const router = useRouter();
  const { user, loading, logout } = useCurrentUser();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/signin?role=customer');
      return;
    }
    if (user.role !== 'customer') {
      router.push('/dashboard/pro');
    }
  }, [loading, router, user]);

  const filteredPros = useMemo(() => {
    let pros = getProsByCategory(selectedCategory);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      pros = pros.filter(
        (pro) =>
          pro.name.toLowerCase().includes(query) ||
          pro.location.toLowerCase().includes(query) ||
          pro.category.toLowerCase().includes(query) ||
          pro.bio.toLowerCase().includes(query)
      );
    }

    return pros;
  }, [selectedCategory, searchQuery]);

  const availableCount = MOCK_PROS.filter((p) => p.available).length;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <PageLayout showBackButton backButtonHref="/dashboard/customer">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/customer"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              My Bookings
            </Link>
            <Link
              href="/notifications"
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl">🔔</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Find Trusted Local Pros</h1>
            <p className="text-emerald-100 text-lg mb-6">
              Book background-checked professionals for cleaning, plumbing, lawn care, and more.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                {availableCount} pros available now
              </span>
              <span className="text-emerald-200 hidden sm:inline">•</span>
              <span>⭐ 4.8 avg rating</span>
              <span className="text-emerald-200 hidden sm:inline">•</span>
              <span>🛡️ Satisfaction guaranteed</span>
            </div>
          </div>
        </div>
      </section>

      <div>
        <FilterBar
          categories={SERVICE_CATEGORIES}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onSearch={setSearchQuery}
          className="mb-8"
        />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedCategory === 'all'
                ? 'All Service Pros'
                : SERVICE_CATEGORIES.find((c) => c.slug === selectedCategory)?.name || 'Pros'}
            </h2>
            <p className="text-sm text-gray-500">
              {filteredPros.length} {filteredPros.length === 1 ? 'pro' : 'pros'} found
            </p>
          </div>

          <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option>Top Rated</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Most Reviews</option>
          </select>
        </div>

        {filteredPros.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
            {filteredPros.map((pro, index) => (
              <div
                key={pro.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ProCardEnhanced pro={pro} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No pros found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        <TrustShieldBanner className="mb-12" />
      </div>
    </PageLayout>
  );
}






