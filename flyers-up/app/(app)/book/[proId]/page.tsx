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
import { BookingRulesAccordion } from '@/components/booking/BookingRulesAccordion';
import { getProById, getCurrentUser, type ServicePro } from '@/lib/api';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const proId = params.proId as string;
  const subcategorySlug = searchParams.get('subcategorySlug')?.trim() ?? undefined;
  const serviceSlug = searchParams.get('serviceSlug')?.trim() ?? undefined;
  const address = searchParams.get('address')?.trim() ?? undefined;
  const notes = searchParams.get('notes')?.trim() ?? undefined;
  const service = searchParams.get('service')?.trim() ?? undefined;
  const rebookBookingId = searchParams.get('rebook')?.trim() ?? undefined;
  const packageId = searchParams.get('packageId')?.trim() ?? undefined;
  /** Owner preview iframe on /pro/profile — allow pro to see customer UI without redirect */
  const customerPreview = searchParams.get('customerPreview') === '1';
  
  const [pro, setPro] = useState<ServicePro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rebookPrefill, setRebookPrefill] = useState<{ address?: string; notes?: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const user = await getCurrentUser();
      if (!user) {
        const nextParams = new URLSearchParams();
        if (serviceSlug) nextParams.set('serviceSlug', serviceSlug);
        if (subcategorySlug) nextParams.set('subcategorySlug', subcategorySlug);
        const nextPath = nextParams.toString() ? `/book/${proId}?${nextParams.toString()}` : `/book/${proId}`;
        router.push(`/auth?role=customer&next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const proData = await getProById(proId);
      if (
        !customerPreview &&
        proData &&
        user.role === 'pro' &&
        user.id === proData.userId
      ) {
        router.replace('/pro/profile');
        return;
      }
      setPro(proData);

      if (rebookBookingId && proId) {
        try {
          const res = await fetch(`/api/customer/bookings/${rebookBookingId}`, { cache: 'no-store', credentials: 'include' });
          const json = await res.json();
          if (res.ok && json.booking?.proId === proId) {
            const b = json.booking;
            setRebookPrefill({
              address: b.address ?? undefined,
              notes: b.notes ?? undefined,
            });
          }
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [proId, router, rebookBookingId, serviceSlug, subcategorySlug, customerPreview]);

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
          <BookingForm
            pro={pro}
            initialSubcategorySlug={subcategorySlug}
            serviceSlug={serviceSlug}
            initialAddress={rebookPrefill?.address ?? address}
            initialNotes={rebookPrefill?.notes ?? notes}
            previousBookingId={rebookBookingId}
            initialPackageId={packageId}
          />
        </div>

        {/* Rules accordion */}
        <div className="mt-6">
          <BookingRulesAccordion />
        </div>
      </div>
    </Layout>
  );
}
