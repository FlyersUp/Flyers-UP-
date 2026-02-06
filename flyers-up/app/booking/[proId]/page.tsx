'use client';

/**
 * Booking Flow Page
 * Clean-slate placeholder (no fake availability).
 */

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { RatingCompact } from '@/components/ui/RatingStars';
import TrustShieldBanner from '@/components/ui/TrustShieldBanner';
import { getCurrentUser, getProById, type ServicePro } from '@/lib/api';

interface PageProps {
  params: Promise<{ proId: string }>;
}

export default function BookingPage({ params }: PageProps) {
  const { proId } = use(params);
  const [pro, setPro] = useState<ServicePro | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!mounted) return;
      setSignedIn(Boolean(user));
      if (!user) {
        setPro(null);
        setLoading(false);
        return;
      }

      const data = await getProById(proId);
      if (!mounted) return;
      setPro(data);
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [proId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface2 flex items-center justify-center">
        <div className="text-sm text-muted/70">Loading…</div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen bg-surface2 flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl border border-border p-8 max-w-md w-full text-center">
          <div className="text-xl font-semibold text-text">Sign in required</div>
          <div className="mt-2 text-sm text-muted">Please sign in to continue.</div>
          <div className="mt-6">
            <Link
              href={`/signin?next=${encodeURIComponent(`/booking/${proId}`)}`}
              className="inline-flex px-6 py-3 bg-accent hover:opacity-95 text-accentContrast rounded-xl font-semibold transition-opacity"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="min-h-screen bg-surface2 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-text mb-2">Pro Not Found</h1>
          <p className="text-muted/70 mb-6">This professional may no longer be available.</p>
          <Link
            href="/services"
            className="px-6 py-3 bg-accent hover:opacity-95 text-accentContrast rounded-xl font-medium transition-opacity"
          >
            Browse Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface2">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/customer/pros/${pro.id}`}
              className="flex items-center gap-2 text-muted hover:text-text transition-colors"
            >
              <span>←</span>
              <span className="font-medium">Back</span>
            </Link>
            <h1 className="font-semibold text-text">Book Appointment</h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Pro summary card */}
        <section className="bg-surface rounded-2xl border border-border p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface2 flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-text">{pro.name}</h2>
              </div>
              <p className="text-sm text-muted/70 mb-1">{pro.categoryName}</p>
              <RatingCompact rating={pro.rating} reviewCount={pro.reviewCount} />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted/70">From</p>
              <p className="text-xl font-bold text-text">${pro.startingPrice}</p>
            </div>
          </div>
        </section>

        {/* Clean-slate note */}
        <section className="bg-surface rounded-2xl border border-border p-6 mb-6">
          <h3 className="font-semibold text-text mb-2">Booking is being wired</h3>
          <p className="text-sm text-muted">
            We removed the “fake” schedules and confirmations. Next, we’ll connect this to real availability and real bookings.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/services/${encodeURIComponent(pro.categorySlug)}`}
              className="inline-flex px-5 py-3 bg-accent hover:opacity-95 text-accentContrast rounded-xl font-semibold transition-opacity"
            >
              Browse more {pro.categoryName} pros
            </Link>
            <Link
              href={`/customer/pros/${pro.id}`}
              className="inline-flex px-5 py-3 bg-surface2 hover:bg-surface text-text rounded-xl font-medium transition-colors border border-border"
            >
              Back to profile
            </Link>
          </div>
        </section>

        {/* Trust section */}
        <TrustShieldBanner variant="compact" className="mb-6" />

      </main>

    </div>
  );
}




