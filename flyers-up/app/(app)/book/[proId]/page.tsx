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
  const recurringFromUrl = searchParams.get('recurring') === '1';
  const packageId = searchParams.get('packageId')?.trim() ?? undefined;
  /** Owner preview iframe on /pro/profile — allow pro to see customer UI without redirect */
  const customerPreview = searchParams.get('customerPreview') === '1';
  
  const [pro, setPro] = useState<ServicePro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rebookPrefill, setRebookPrefill] = useState<{
    address?: string;
    notes?: string;
    serviceSlug?: string;
  } | null>(null);

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
            const b = json.booking as {
              address?: string;
              notes?: string;
              serviceCategorySlug?: string;
            };
            setRebookPrefill({
              address: b.address ?? undefined,
              notes: b.notes ?? undefined,
              serviceSlug: b.serviceCategorySlug ?? undefined,
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
      <div className="-mx-3 bg-[#F5F6F8] py-2 pb-6 sm:-mx-[var(--page-pad-x)] sm:pb-8">
        <div className="mx-auto w-full min-w-0 max-w-2xl px-3 sm:px-4">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="mb-2 text-[1.625rem] font-bold leading-tight tracking-tight text-[#2d3436] dark:text-white">
            Book {pro.name}
          </h1>
          <p className="text-[15px] text-[#6B7280] dark:text-white/60">
            Fill out the form below to request a booking.
          </p>
        </div>

        {/* Pro summary card */}
        <div className="mb-8 rounded-[20px] border border-[#E8EAED] bg-white p-5 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#2d3436] dark:text-white">{pro.name}</h2>
              <p className="mb-2 text-sm text-[#6B7280] dark:text-white/60">{pro.location}</p>
              <p className="text-sm leading-relaxed text-[#6B7280] dark:text-white/65">{pro.bio}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="mb-1 flex items-center justify-end gap-1">
                <span className="text-warning">★</span>
                <span className="font-semibold text-[#2d3436] dark:text-white">{pro.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-white/55">({pro.reviewCount} reviews)</p>
              <p className="mt-2 text-lg font-bold text-[#4A69BD] dark:text-[#6b8fd4]">
                ${pro.startingPrice}/hr
              </p>
            </div>
          </div>
        </div>

        {/* Booking form */}
        <div className="rounded-[20px] border border-[#E8EAED] bg-white p-6 shadow-[0_4px_24px_rgba(74,105,189,0.06)] dark:border-white/10 dark:bg-[#1a1d24] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
          <h2 className="mb-5 text-lg font-bold text-[#2d3436] dark:text-white">
            Booking Details
          </h2>
          <BookingForm
            pro={pro}
            initialSubcategorySlug={subcategorySlug}
            serviceSlug={rebookPrefill?.serviceSlug ?? serviceSlug}
            initialAddress={rebookPrefill?.address ?? address}
            initialNotes={rebookPrefill?.notes ?? notes}
            previousBookingId={rebookBookingId}
            initialPackageId={packageId}
            recurringFromUrl={recurringFromUrl}
          />
        </div>

        {/* Rules accordion */}
        <div className="mt-6">
          <BookingRulesAccordion />
        </div>
        </div>
      </div>
    </Layout>
  );
}
