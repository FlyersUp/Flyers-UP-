'use client';

/**
 * Leave Review / Rate Your Pro
 *
 * STRUCTURE
 * - Header (close, title)
 * - Pro recap card (avatar, name, service)
 * - Star rating (primary)
 * - Selectable tags (positive/negative)
 * - Optional text review
 * - Optional photo upload (placeholder for now)
 * - Public vs private toggle
 * - Submit CTA (fixed bottom)
 * - Success state
 *
 * STATE LOGIC
 * - loading: fetch booking + check existing review
 * - form: show form (rating required, rest optional)
 * - submitting: disable CTA
 * - success: show thank-you, link to booking
 * - already_reviewed: show existing review
 * - error: not found, not eligible
 */

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layouts/AppLayout';
import { submitReviewAction } from '@/app/actions/reviews';
import { supabase } from '@/lib/supabaseClient';
import { isCustomerBookingEligibleForReview } from '@/lib/bookings/customer-review-eligibility';

type PageState = 'loading' | 'form' | 'submitting' | 'success' | 'already_reviewed' | 'error';

interface BookingData {
  id: string;
  status: string;
  proId?: string | null;
  proName?: string;
  proPhotoUrl?: string | null;
  serviceName?: string;
  serviceDate?: string;
  serviceTime?: string;
}

const POSITIVE_TAGS = [
  'Punctual',
  'Professional',
  'Quality work',
  'Friendly',
  'Thorough',
  'On time',
  'Great communication',
  'Would book again',
];

const NEGATIVE_TAGS = [
  'Late',
  'Rushed',
  'Incomplete work',
  'Poor communication',
  'Unprofessional',
];

export default function LeaveReviewPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [state, setState] = useState<PageState>('loading');
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [existingComment, setExistingComment] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const fetchData = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/customer/bookings/${bookingId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) {
        setState('error');
        setErrorMessage(json.error ?? 'Could not load booking');
        return;
      }
      const b = json.booking as BookingData & { completion?: unknown };
      setBooking(b);

      if (!isCustomerBookingEligibleForReview(b.status)) {
        setState('error');
        setErrorMessage('This booking is not ready for review yet.');
        return;
      }

      const { data: review } = await supabase
        .from('booking_reviews')
        .select('rating, comment')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (review) {
        setExistingRating(review.rating);
        setExistingComment(review.comment ?? null);
        setState('already_reviewed');
        return;
      }

      setState('form');
    } catch {
      setState('error');
      setErrorMessage('Could not load booking');
    }
  }, [bookingId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5 || state === 'submitting') return;
    setState('submitting');
    setErrorMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await submitReviewAction(
        bookingId,
        rating,
        comment.trim() || null,
        session?.access_token,
        { tags: selectedTags, isPublic }
      );
      if (res.success) {
        setState('success');
      } else {
        setErrorMessage(res.error ?? 'Failed to submit review');
        setState('form');
      }
    } catch {
      setErrorMessage('Something went wrong');
      setState('form');
    }
  };

  return (
    <AppLayout mode="customer" data-role="customer">
      <div className="min-h-screen bg-[hsl(var(--bg))]">
        <div className="max-w-lg mx-auto px-4 md:px-6 py-6 pb-32">
          {/* Header */}
          <header className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <span className="text-xl">×</span>
            </button>
            <h1 className="text-lg font-semibold text-[#111111] dark:text-[#F5F7FA]">
              Rate your pro
            </h1>
            <div className="w-10" />
          </header>

          {/* LOADING */}
          {state === 'loading' && (
            <div className="space-y-4 animate-pulse" role="status">
              <div className="rounded-2xl bg-white dark:bg-[#171A20] p-6 h-24" />
              <div className="rounded-2xl bg-white dark:bg-[#171A20] p-6 h-32" />
              <div className="rounded-2xl bg-white dark:bg-[#171A20] p-6 h-40" />
            </div>
          )}

          {/* ERROR */}
          {state === 'error' && (
            <section
              className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm"
              role="alert"
            >
              <p className="text-sm font-medium text-[#111111] dark:text-[#F5F7FA] mb-2">
                Something went wrong
              </p>
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mb-4">{errorMessage}</p>
              <Link
                href={`/customer/bookings/${bookingId}`}
                className="inline-flex items-center justify-center h-11 px-5 rounded-full text-sm font-semibold bg-[#058954] text-white hover:bg-[#047a48]"
              >
                Back to booking
              </Link>
            </section>
          )}

          {/* ALREADY REVIEWED */}
          {state === 'already_reviewed' && booking && (
            <section
              className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm"
              role="status"
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'hsl(var(--customer-tint))' }}
                >
                  <span className="text-2xl text-[#058954]">✓</span>
                </div>
                <h2 className="text-xl font-semibold text-[#111111] dark:text-[#F5F7FA]">
                  Thank you for your review
                </h2>
                <div className="flex gap-1 mt-3" aria-label={`${existingRating} stars`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className={s <= (existingRating ?? 0) ? 'text-amber-500' : 'text-[#D9D5D2] dark:text-white/20'}
                    >
                      ★
                    </span>
                  ))}
                </div>
                {existingComment && (
                  <p className="text-sm text-[#3A3A3A] dark:text-[#A1A8B3] mt-4 text-left w-full">
                    {existingComment}
                  </p>
                )}
                <Link
                  href={`/customer/bookings/${bookingId}`}
                  className="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-full text-sm font-semibold bg-[#058954] text-white hover:bg-[#047a48]"
                >
                  View booking
                </Link>
              </div>
            </section>
          )}

          {/* SUCCESS */}
          {state === 'success' && booking && (
            <section
              className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-6 shadow-sm"
              role="status"
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'hsl(var(--customer-tint))' }}
                >
                  <span className="text-2xl text-[#058954]">✓</span>
                </div>
                <h2 className="text-xl font-semibold text-[#111111] dark:text-[#F5F7FA]">
                  Review submitted
                </h2>
                <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mt-2">
                  Thanks for helping others find great pros.
                </p>
                <div className="flex flex-col gap-3 mt-6 w-full">
                  <Link
                    href={`/customer/bookings/${bookingId}`}
                    className="flex h-12 items-center justify-center rounded-full text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48]"
                  >
                    View booking
                  </Link>
                  {booking.proId && (
                    <Link
                      href={`/book/${booking.proId}?rebook=${bookingId}`}
                      className="flex h-11 items-center justify-center rounded-full text-sm font-medium border border-black/10 dark:border-white/10 text-[#111111] dark:text-[#F5F7FA] hover:bg-black/5"
                    >
                      Book again
                    </Link>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* FORM */}
          {(state === 'form' || state === 'submitting') && booking && (
            <>
              <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3] mb-6">
                How would you rate your experience with {booking.proName ?? 'your pro'}?
              </p>

              {/* Pro recap card */}
              <section
                className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-[#171A20] p-5 shadow-sm mb-6"
                aria-labelledby="pro-recap"
              >
                <h2 id="pro-recap" className="sr-only">Pro</h2>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F7F6F4] dark:bg-[#1D2128]">
                    {booking.proPhotoUrl ? (
                      <Image
                        src={booking.proPhotoUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#6A6A6A]">
                        —
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111111] dark:text-[#F5F7FA]">
                      {booking.proName ?? 'Pro'}
                    </p>
                    <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">
                      {booking.serviceName ?? 'Service'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Star rating */}
              <section className="mb-6" aria-labelledby="rating-label">
                <h2 id="rating-label" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
                  Your rating
                </h2>
                <div
                  className="flex gap-2 justify-center py-4"
                  role="group"
                  aria-label="Star rating"
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setRating(s);
                        }
                      }}
                      className={`text-3xl p-1 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#058954]/50 focus:ring-offset-2 ${
                        s <= rating
                          ? 'text-amber-500'
                          : 'text-[#D9D5D2] dark:text-white/20 hover:text-amber-400/70'
                      }`}
                      aria-label={`${s} star${s === 1 ? '' : 's'}`}
                      aria-pressed={s <= rating}
                    >
                      {s <= rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </section>

              {/* Tags */}
              <section className="mb-6" aria-labelledby="tags-label">
                <h2 id="tags-label" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
                  Select highlights (optional)
                </h2>
                <div className="flex flex-wrap gap-2">
                  {[...POSITIVE_TAGS, ...NEGATIVE_TAGS].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-[#058954] text-white'
                          : 'bg-[#F5F5F5] dark:bg-[#1D2128] text-[#3A3A3A] dark:text-[#A1A8B3] hover:bg-[#EBEBEB] dark:hover:bg-[#252A33]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </section>

              {/* Optional text review */}
              <section className="mb-6" aria-labelledby="comment-label">
                <label
                  id="comment-label"
                  htmlFor="review-comment"
                  className="block text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-2"
                >
                  Written review (optional)
                </label>
                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share what went well..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1D2128] text-[#111111] dark:text-[#F5F7FA] placeholder:text-[#6A6A6A] dark:placeholder:text-[#A1A8B3] focus:outline-none focus:ring-2 focus:ring-[#058954]/50 resize-none"
                />
              </section>

              {/* Optional photo upload - placeholder */}
              <section className="mb-6" aria-labelledby="photos-label">
                <h2 id="photos-label" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-2">
                  Add photos (optional)
                </h2>
                <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-[#D9D5D2] dark:border-white/20 bg-[#F7F6F4] dark:bg-[#1D2128]/50">
                  <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3]">Photo upload coming soon</p>
                </div>
              </section>

              {/* Public vs private */}
              <section className="mb-6" aria-labelledby="visibility-label">
                <h2 id="visibility-label" className="text-sm font-medium text-[#6A6A6A] dark:text-[#A1A8B3] mb-3">
                  Visibility
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                      isPublic
                        ? 'bg-[#058954] text-white'
                        : 'bg-[#F5F5F5] dark:bg-[#1D2128] text-[#3A3A3A] dark:text-[#A1A8B3]'
                    }`}
                  >
                    Public review
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                      !isPublic
                        ? 'bg-[#058954] text-white'
                        : 'bg-[#F5F5F5] dark:bg-[#1D2128] text-[#3A3A3A] dark:text-[#A1A8B3]'
                    }`}
                  >
                    Private feedback
                  </button>
                </div>
                <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] mt-2">
                  {isPublic
                    ? 'Visible on the pro\'s profile to help others.'
                    : 'Sent to the pro only, not shown publicly.'}
                </p>
              </section>

              {errorMessage && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
                  {errorMessage}
                </p>
              )}
            </>
          )}
        </div>

        {/* Fixed submit button */}
        {(state === 'form' || state === 'submitting') && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 dark:border-white/10 bg-white/95 dark:bg-[#171A20]/95 backdrop-blur-sm p-4 pb-[env(safe-area-inset-bottom)]">
            <div className="max-w-lg mx-auto">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={rating < 1 || state === 'submitting'}
                className="w-full h-12 rounded-full text-sm font-semibold text-white bg-[#058954] hover:bg-[#047a48] disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#058954]/50 focus:ring-offset-2"
              >
                {state === 'submitting' ? 'Submitting…' : 'Submit review'}
              </button>
              {rating < 1 && (
                <p className="text-xs text-[#6A6A6A] dark:text-[#A1A8B3] text-center mt-2">
                  Tap a star to choose your rating
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
