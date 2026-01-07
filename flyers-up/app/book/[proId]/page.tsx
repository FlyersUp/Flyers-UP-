'use client';

/**
 * Booking Request Page
 * Allows customers to submit a booking request to a specific pro
 * 
 * Protected route - redirects to /auth if not logged in.
 * Uses Supabase for data fetching.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import BookingForm from '@/components/BookingForm';
import { getProById, getCurrentUser, type ServicePro } from '@/lib/api';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const proId = params.proId as string;
  
  const [pro, setPro] = useState<ServicePro | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Check if user is logged in via Supabase
      const user = await getCurrentUser();
      if (!user) {
        router.push('/auth?role=customer');
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
      <Layout title="Flyers Up" showBackButton>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!pro) {
    return (
      <Layout title="Flyers Up" showBackButton>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Professional Not Found
          </h1>
          <p className="text-gray-600">
            This service professional doesn&apos;t exist or is no longer available.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Flyers Up" showBackButton>
      <div className="max-w-2xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Book {pro.name}
          </h1>
          <p className="text-gray-600">
            Fill out the form below to request a booking.
          </p>
        </div>

        {/* Pro summary card */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-gray-800 text-lg">{pro.name}</h2>
              <p className="text-sm text-gray-500 mb-2">{pro.location}</p>
              <p className="text-sm text-gray-600">{pro.bio}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-yellow-500">★</span>
                <span className="font-medium">{pro.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500">({pro.reviewCount} reviews)</p>
              <p className="mt-2 text-lg font-bold text-gray-800">
                ${pro.startingPrice}/hr
              </p>
            </div>
          </div>
        </div>

        {/* Booking form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            Booking Details
          </h2>
          <BookingForm pro={pro} />
        </div>
      </div>
    </Layout>
  );
}
