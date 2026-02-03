'use server';

/**
 * Server Actions for Bookings
 * 
 * These server actions handle booking creation with add-ons (request-only launch).
 * IMPORTANT: All pricing calculations happen server-side for security.
 */

import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { recordServerErrorEvent } from '@/lib/serverError';

type BookingStatus = 'requested' | 'accepted' | 'declined' | 'completed' | 'cancelled';

/**
 * Create a booking with selected add-ons.
 * 
 * IMPORTANT: This function:
 * 1. Validates the customer is authenticated
 * 2. Validates the pro exists (server-side)
 * 3. Fetches current add-on prices from the database (server-side)
 * 3. Calculates total server-side (never trust client totals)
 * 4. Creates booking with add-on snapshots
 * 
 * Request-only launch:
 * - We do not collect card details and do not charge the customer at request time.
 * - Payment can be added later (e.g., after acceptance or after service completion).
 */
export async function createBookingWithPayment(
  proId: string,
  date: string,
  time: string,
  address: string,
  notes: string,
  selectedAddonIds: string[]
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1) Authenticate user
    if (!user) {
      return { success: false, error: 'Unauthorized. Customer access required.' };
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'customer') {
      return { success: false, error: 'Unauthorized. Customer access required.' };
    }

    // 2) Validate pro exists + get pricing context
    const { data: proRow, error: proErr } = await supabase
      .from('service_pros')
      .select(
        `id, user_id, starting_price, service_categories!inner ( slug )`
      )
      .eq('id', proId)
      .maybeSingle();

    if (proErr || !proRow) {
      void recordServerErrorEvent({
        message: 'Booking create: service pro not found',
        severity: 'error',
        route: 'action:createBookingWithPayment',
        userId: user.id,
        meta: { proId, hasProRow: Boolean(proRow), proErr: proErr ? { code: (proErr as any).code, message: (proErr as any).message } : null },
      });
      return { success: false, error: 'Service pro not found.' };
    }

    const categorySlug = (proRow as any).service_categories?.slug as string | undefined;
    const basePriceCents = Math.round(Number((proRow as any).starting_price ?? 0) * 100);

    // 3) Fetch current add-on prices from database (server-side validation)
    let addonsTotalCents = 0;
    if (selectedAddonIds.length > 0) {
      if (!categorySlug) {
        return { success: false, error: 'Service category not found for this pro.' };
      }

      const { data: activeAddons, error: addonsErr } = await supabase
        .from('service_addons')
        .select('id, title, price_cents')
        .eq('pro_id', (proRow as any).user_id)
        .eq('service_category', categorySlug)
        .eq('is_active', true);

      if (addonsErr) {
        void recordServerErrorEvent({
          message: 'Booking create: add-on validation query failed',
          severity: 'error',
          route: 'action:createBookingWithPayment',
          userId: user.id,
          meta: {
            proId,
            selectedAddonCount: selectedAddonIds.length,
            addonsErr: { code: (addonsErr as any).code, message: (addonsErr as any).message },
          },
        });
        return { success: false, error: 'Could not validate add-ons. Please try again.' };
      }

      const selected = (activeAddons || []).filter((a) => selectedAddonIds.includes(a.id));
      if (selected.length !== selectedAddonIds.length) {
        return { success: false, error: 'One or more selected add-ons are no longer available.' };
      }

      addonsTotalCents = selected.reduce((sum, a) => sum + Number(a.price_cents ?? 0), 0);
    }

    // 4) Calculate total server-side (base price + add-ons)
    const totalCents = basePriceCents + addonsTotalCents;
    const totalDollars = totalCents / 100;

    const initialStatusHistory = [{ status: 'requested', at: new Date().toISOString() }];

    // 5) Create booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        customer_id: user.id,
        pro_id: proId,
        service_date: date,
        service_time: time,
        address,
        notes: notes || null,
        status: 'requested' satisfies BookingStatus,
        status_history: initialStatusHistory,
        price: totalDollars,
      })
      .select('id')
      .single();

    if (bookingErr || !booking) {
      void recordServerErrorEvent({
        message: 'Booking create: insert failed',
        severity: 'error',
        route: 'action:createBookingWithPayment',
        userId: user.id,
        meta: {
          proId,
          selectedAddonCount: selectedAddonIds.length,
          // Do NOT log address/notes (PII). Only log safe context.
          bookingErr: bookingErr ? { code: (bookingErr as any).code, message: (bookingErr as any).message } : null,
        },
      });
      return { success: false, error: 'Failed to create request. Please try again.' };
    }

    // 6) Snapshot selected add-ons (best-effort)
    if (selectedAddonIds.length > 0) {
      const { data: addonsData } = await supabase
        .from('service_addons')
        .select('id, title, price_cents')
        .in('id', selectedAddonIds);

      if (addonsData && addonsData.length > 0) {
        const snapshots = addonsData.map((addon) => ({
          booking_id: booking.id,
          addon_id: addon.id,
          title_snapshot: addon.title,
          price_snapshot_cents: addon.price_cents,
        }));
        await supabase.from('booking_addons').insert(snapshots);
      }
    }

    return {
      success: true,
      bookingId: booking.id,
    };
  } catch (err) {
    console.error('Error creating booking with payment:', err);
    void recordServerErrorEvent({
      message: 'Booking create: unexpected exception',
      severity: 'error',
      route: 'action:createBookingWithPayment',
      stack: err instanceof Error ? err.stack ?? null : null,
      meta: {
        proId,
        selectedAddonCount: selectedAddonIds.length,
      },
    });
    return { success: false, error: 'An unexpected error occurred. Please try again.' };
  }
}






