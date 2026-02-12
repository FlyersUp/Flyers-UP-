'use client';

/**
 * Job Details Page
 * Shows job information, status, map, and actions
 */

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/Badge';
import { createScopeReview, getBookingById, getCurrentUser, getLatestScopeReview, type BookingDetails, type ScopeReview, type UserWithProfile } from '@/lib/api';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default function JobDetailsPage({ params }: PageProps) {
  const { jobId } = use(params);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [bookingLoaded, setBookingLoaded] = useState(false);

  // Scope review UI state
  const [userLoaded, setUserLoaded] = useState(false);
  const [canUseScopeReview, setCanUseScopeReview] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithProfile | null>(null);
  const [latestScopeReview, setLatestScopeReview] = useState<ScopeReview | null>(null);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopeReason, setScopeReason] = useState('');
  const [scopeSubmitting, setScopeSubmitting] = useState(false);
  const [scopeMessage, setScopeMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadBooking() {
      const b = await getBookingById(jobId);
      if (!mounted) return;
      setBooking(b);
      setBookingLoaded(true);
    }
    void loadBooking();
    return () => {
      mounted = false;
    };
  }, [jobId]);

  useEffect(() => {
    let mounted = true;
    async function loadScopeReview() {
      // Only enable scope review on real Supabase bookings.
      if (!booking) {
        setLatestScopeReview(null);
        setCanUseScopeReview(false);
        setUserLoaded(true);
        return;
      }

      const user = await getCurrentUser();
      if (!mounted) return;
      setUserLoaded(true);
      setCurrentUser(user);
      setCanUseScopeReview(Boolean(user));

      const latest = await getLatestScopeReview(booking.id);
      if (!mounted) return;
      setLatestScopeReview(latest);
    }

    void loadScopeReview();
    return () => {
      mounted = false;
    };
  }, [booking]);

  const formattedBookingDate = useMemo(() => {
    if (!booking) return null;
    return new Date(booking.serviceDate).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [booking]);

  if (!bookingLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold text-text mb-2">Job Not Found</h1>
          <p className="text-muted/70 mb-6">This job may have been removed or doesn&apos;t exist.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-accent hover:opacity-95 text-accentContrast rounded-xl font-medium transition-opacity"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-surface to-bg">
      <header className="sticky top-0 z-50 bg-surface border-b border-hairline">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-muted hover:text-text transition-colors">
              <span>←</span>
              <span className="font-medium">Back</span>
            </Link>
            <h1 className="text-lg font-semibold text-text">Job Details</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <section className="bg-surface rounded-[18px] border border-hairline shadow-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text">Booking</h2>
            <StatusBadge status={booking.status} />
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">📍</span>
              <div>
                <p className="text-sm text-muted/70">Address</p>
                <p className="text-text">{booking.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">📅</span>
              <div>
                <p className="text-sm text-muted/70">Date & Time</p>
                <p className="text-text">{formattedBookingDate}</p>
                <p className="text-text font-medium">{booking.serviceTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">👤</span>
              <div>
                <p className="text-sm text-muted/70">Pro</p>
                <p className="text-text">{booking.proName || 'Service Pro'}</p>
              </div>
            </div>

            {booking.notes && (
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">📝</span>
                <div>
                  <p className="text-sm text-muted/70">Notes</p>
                  <p className="text-text">{booking.notes}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {currentUser?.role === 'customer' && booking.status === 'awaiting_payment' ? (
          <section className="bg-surface rounded-[18px] border border-hairline shadow-card p-6 mb-6 border-l-[3px] border-l-accent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-text">Payment due</h3>
                <p className="text-sm text-muted/70 mt-1">
                  Your pro marked the job complete. Please pay to close out the request.
                </p>
              </div>
              <Link
                href={`/customer/booking/pay?bookingId=${encodeURIComponent(booking.id)}`}
                className="shrink-0 px-4 py-2 rounded-xl bg-accent text-accentContrast font-medium hover:opacity-95"
              >
                Pay now →
              </Link>
            </div>
          </section>
        ) : null}

        {/* Scope review (generic, platform-wide) */}
        <section className="bg-surface rounded-[18px] border border-hairline shadow-card p-6 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-text">Scope Review</h3>
              <p className="text-sm text-muted/70">If the scope changed, request a review / re-quote.</p>
            </div>
            <button
              onClick={() => setShowScopeModal(true)}
              disabled={!userLoaded || !canUseScopeReview}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                userLoaded && canUseScopeReview
                  ? 'bg-accent hover:opacity-95 text-accentContrast'
                  : 'bg-surface2 text-muted/60 cursor-not-allowed'
              }`}
            >
              Request scope review
            </button>
          </div>

          {scopeMessage && (
            <div className="mt-4 p-3 rounded-xl bg-success/15 border border-hairline text-text text-sm">
              {scopeMessage}
            </div>
          )}

          {latestScopeReview ? (
            <div className="mt-4 p-4 rounded-xl bg-surface2 border border-hairline">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text">Latest request</p>
                <p className="text-sm text-muted">
                  Status: <span className="font-semibold">{latestScopeReview.status}</span>
                </p>
              </div>
              <p className="text-sm text-text mt-2">{latestScopeReview.reason}</p>
            </div>
          ) : (
            <p className="text-sm text-muted/70 mt-4">No scope review requests yet.</p>
          )}
        </section>
      </main>

      {/* Modal */}
      {showScopeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface w-full max-w-lg rounded-[18px] border border-hairline shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-text">Request scope review</h4>
              <button
                onClick={() => {
                  setShowScopeModal(false);
                  setScopeReason('');
                  setScopeMessage(null);
                }}
                className="text-muted/70 hover:text-text"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <label className="block text-sm font-medium text-text mb-2">
              Explain what changed from the original scope…
            </label>
            <textarea
              value={scopeReason}
              onChange={(e) => setScopeReason(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 bg-surface2 border border-hairline rounded-xl text-text placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-transparent resize-none"
              placeholder="e.g., additional rooms, heavier debris than expected, access issues, etc."
            />

            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowScopeModal(false);
                  setScopeReason('');
                }}
                className="px-4 py-2 rounded-xl bg-surface2 hover:bg-surface text-text text-sm font-medium"
                disabled={scopeSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setScopeSubmitting(true);
                  setScopeMessage(null);
                  const res = await createScopeReview(booking.id, scopeReason);
                  if (res.success) {
                    setScopeMessage('Scope review requested.');
                    const latest = await getLatestScopeReview(booking.id);
                    setLatestScopeReview(latest);
                    setShowScopeModal(false);
                    setScopeReason('');
                  } else {
                    setScopeMessage(res.error || 'Failed to request scope review.');
                  }
                  setScopeSubmitting(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  scopeSubmitting ? 'bg-accent/70 text-accentContrast' : 'bg-accent hover:opacity-95 text-accentContrast'
                }`}
                disabled={scopeSubmitting || !scopeReason.trim()}
              >
                {scopeSubmitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
