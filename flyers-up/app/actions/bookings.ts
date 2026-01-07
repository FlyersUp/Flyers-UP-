'use server';

/**
 * Server Actions for Bookings
 * 
 * These server actions handle booking creation with add-ons and Stripe payment intent.
 * IMPORTANT: All pricing calculations happen server-side for security.
 */

import { getCurrentUser, createBooking, getProById, getActiveAddonsForPro, getBookingAddons } from '@/lib/api';
import { dollarsToCents } from '@/lib/utils/money';
import { createPaymentIntent } from '@/lib/stripe';
import { supabase } from '@/lib/supabaseClient';

/**
 * Create a booking with selected add-ons and Stripe payment intent.
 * 
 * IMPORTANT: This function:
 * 1. Validates the customer is authenticated
 * 2. Fetches current add-on prices from the database (server-side)
 * 3. Calculates total server-side (never trust client totals)
 * 4. Creates booking with add-on snapshots
 * 5. Creates Stripe Payment Intent for the total
 * 
 * NOTE: Stripe integration is a placeholder. In production, you would:
 * - Install @stripe/stripe-js and stripe package
 * - Set up Stripe API keys in environment variables
 * - Create actual Payment Intent using Stripe API
 * - Store payment_intent_id on the booking
 */
export async function createBookingWithPayment(
  proId: string,
  date: string,
  time: string,
  address: string,
  notes: string,
  selectedAddonIds: string[]
): Promise<{ success: boolean; bookingId?: string; paymentIntentId?: string; error?: string }> {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user || user.role !== 'customer') {
      return { success: false, error: 'Unauthorized. Customer access required.' };
    }

    // 2. Get pro data to calculate base price
    const pro = await getProById(proId);
    if (!pro) {
      return { success: false, error: 'Service pro not found.' };
    }

    // 3. Fetch current add-on prices from database (server-side validation)
    let addonsTotalCents = 0;
    if (selectedAddonIds.length > 0) {
      const activeAddons = await getActiveAddonsForPro(proId, pro.categorySlug);
      const selectedAddons = activeAddons.filter(a => selectedAddonIds.includes(a.id));
      
      // Verify all selected add-ons exist and are active
      if (selectedAddons.length !== selectedAddonIds.length) {
        return { success: false, error: 'One or more selected add-ons are no longer available.' };
      }

      addonsTotalCents = selectedAddons.reduce((sum, addon) => sum + addon.priceCents, 0);
    }

    // 4. Calculate total server-side (base price + add-ons)
    const basePriceCents = Math.round(pro.startingPrice * 100);
    const totalCents = basePriceCents + addonsTotalCents;

    // 5. Create booking with add-on snapshots
    const booking = await createBooking({
      customerId: user.id,
      proId,
      date,
      time,
      address,
      notes: notes || '',
      selectedAddonIds: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
    });

    if (!booking) {
      return { success: false, error: 'Failed to create booking.' };
    }

    // 6. Create Stripe Payment Intent
    const paymentIntentResult = await createPaymentIntent(totalCents, {
      bookingId: booking.id,
      customerId: user.id,
      proId: proId,
    });

    if (!paymentIntentResult.success) {
      // Log error but don't fail the booking - payment can be handled later
      console.error('Failed to create payment intent:', paymentIntentResult.error);
    }

    // Update booking with payment_intent_id if available
    if (paymentIntentResult.paymentIntentId) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ payment_intent_id: paymentIntentResult.paymentIntentId })
        .eq('id', booking.id);

      if (updateError) {
        console.error('Failed to update booking with payment intent ID:', updateError);
      }
    }

    const paymentIntentId = paymentIntentResult.paymentIntentId || `pi_mock_${booking.id}`;

    return {
      success: true,
      bookingId: booking.id,
      paymentIntentId,
    };
  } catch (err) {
    console.error('Error creating booking with payment:', err);
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}






