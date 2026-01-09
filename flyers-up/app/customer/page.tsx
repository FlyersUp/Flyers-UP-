'use client';

import { useEffect } from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Label } from '@/components/ui/Label';
import { ServiceProCard } from '@/components/ui/ServiceProCard';
import { Button } from '@/components/ui/Button';
import { mockServicePros, mockCategories } from '@/lib/mockData';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateProfile, routeAfterAuth } from '@/lib/onboarding';

/**
 * Customer Home - Screen 1
 * Header with greeting, categories, featured pros
 */
export default function CustomerHome() {
  const router = useRouter();

  useEffect(() => {
    const guard = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth?next=%2Fcustomer');
        return;
      }
      const profile = await getOrCreateProfile(user.id, user.email ?? null);
      if (!profile) return;
      const dest = routeAfterAuth(profile, '/customer');
      if (dest !== '/customer') router.replace(dest);
    };
    void guard();
  }, [router]);

  return (
    <AppLayout mode="customer">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-gray-900">
              Good morning! 👋
            </h1>
            <Link href="/messages">
              <Button variant="ghost" className="text-sm py-2">
                💬 Messages
              </Button>
            </Link>
          </div>
          <p className="text-gray-600">123 Main St, Your City</p>
        </div>

        {/* Services Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Label>SERVICES NEAR YOU</Label>
            <Link href="/customer/categories">
              <Button variant="ghost" className="text-sm py-2">
                SEE ALL →
              </Button>
            </Link>
          </div>
          
          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {mockCategories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/customer/categories/${cat.id}`}
                className="flex-shrink-0 bg-white rounded-xl px-4 py-3 border border-gray-200 hover:border-[#A8E6CF] transition-colors"
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="text-sm font-medium text-gray-700">{cat.name}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Pros */}
        <div className="mb-8">
          <Label className="mb-4 block">FEATURED PROS</Label>
          <div className="space-y-4">
            {mockServicePros.map((pro) => (
              <Link key={pro.id} href={`/pro/${pro.id}`}>
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
      </div>
    </AppLayout>
  );
}

