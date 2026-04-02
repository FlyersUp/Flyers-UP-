'use server';

/**
 * Server Actions for Booking Reviews
 *
 * Customers can leave one review per completed/awaiting_payment booking.
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { requireCustomerUser } from '@/app/actions/_auth';
import { isCustomerBookingEligibleForReview } from '@/lib/bookings/customer-review-eligibility';

export interface SubmitReviewResult {
  success: boolean;
  error?: string;
}

/**
 * Submit a review for a booking. Customer must own the booking and it must be
 * completed or awaiting_payment. One review per booking.
 */
export async function submitReviewAction(
  bookingId: string,
  rating: number,
  comment: string | null,
  accessToken?: string,
  options?: { tags?: string[]; isPublic?: boolean }
): Promise<SubmitReviewResult> {
  try {
    const { userId } = await requireCustomerUser({ accessToken });
    const supabase = await createServerSupabaseClient();

    if (!bookingId?.trim()) {
      return { success: false, error: 'Booking is required.' };
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5.' };
    }

    // Verify booking exists, belongs to customer, and is reviewable
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('id, customer_id, pro_id, status')
      .eq('id', bookingId)
      .eq('customer_id', userId)
      .maybeSingle();

    if (bErr || !booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (!isCustomerBookingEligibleForReview(String(booking.status ?? ''))) {
      return { success: false, error: 'You can only review completed bookings.' };
    }

    const tags = Array.isArray(options?.tags) ? options.tags.filter((t) => typeof t === 'string' && t.trim()).slice(0, 10) : [];
    const isPublic = options?.isPublic !== false;

    const insertPayload: Record<string, unknown> = {
      booking_id: bookingId,
      customer_id: userId,
      pro_id: booking.pro_id,
      rating: Math.round(rating),
      comment: comment?.trim() || null,
    };
    // Extended columns (migration 073) - include if present
    insertPayload.is_public = isPublic;
    if (tags.length > 0) insertPayload.tags = tags;

    let { error } = await supabase.from('booking_reviews').insert(insertPayload);
    // Fallback if migration 073 not applied: retry without extended columns
    const colError = error?.message?.includes('is_public') || error?.message?.includes('does not exist') || error?.code === '42703';
    if (colError) {
      const basicPayload = {
        booking_id: bookingId,
        customer_id: userId,
        pro_id: booking.pro_id,
        rating: Math.round(rating),
        comment: comment?.trim() || null,
      };
      const retry = await supabase.from('booking_reviews').insert(basicPayload);
      error = retry.error;
    }

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You have already reviewed this booking.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in submitReviewAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}
