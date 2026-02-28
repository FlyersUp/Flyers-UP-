'use client';

/**
 * Booking Request Page
 * Allows customers to submit a booking request to a specific pro
 * 
 * Protected route - redirects to /auth if not logged in.
 * Uses Supabase for data fetching.
 * Supports ?subcategorySlug=xxx to pre-select when coming from marketplace.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import BookingForm from '@/components/BookingForm';
import { getProById, getCurrentUser, type ServicePro } from '@/lib/api';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const proId = params.proId as string;
  const subcategorySlug = searchParams.get('subcategorySlug')?.trim() ?? undefined;
  
  const [pro, setPro] = useState<ServicePro | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Check if user is logged in via Supabase
      const user = await getCurrentUser();
      if (!user) {
        router.push(`/auth?role=customer&next=${encodeURIComponent(`/book/${proId}`)}`);
        return;
      }

      // Fetch pro details from Supabase
      const proData = await getProById(proId);
      setPro(proData);
      setIsLoading(false);
    };

    loadData();
  }, [proId, router]);

  if (isLoading) {
    return (
      <Layout title="Flyers Up" showBackButton hideNavLinks>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted/70">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!pro) {
    return (
      <Layout title="Flyers Up" showBackButton hideNavLinks>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-text mb-4">
            Professional Not Found
          </h1>
          <p className="text-muted">
            This service professional doesn&apos;t exist or is no longer available.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Flyers Up" showBackButton hideNavLinks>
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text mb-2">
            Book {pro.name}
          </h1>
          <p className="text-muted">
            Fill out the form below to request a booking.
          </p>
        </div>

        {/* Pro summary card */}
        <div className="bg-surface border border-border rounded-lg p-5 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-text text-lg">{pro.name}</h2>
              <p className="text-sm text-muted/70 mb-2">{pro.location}</p>
              <p className="text-sm text-muted">{pro.bio}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-warning">★</span>
                <span className="font-medium">{pro.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted/70">({pro.reviewCount} reviews)</p>
              <p className="mt-2 text-lg font-bold text-text">
                ${pro.startingPrice}/hr
              </p>
            </div>
          </div>
        </div>

        {/* Booking form */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="font-semibold text-text mb-4">
            Booking Details
          </h2>
          <BookingForm pro={pro} initialSubcategorySlug={subcategorySlug} />
        </div>
      </div>
    </Layout>
  );
}
