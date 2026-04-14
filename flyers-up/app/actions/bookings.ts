'use server';

/**
 * Server Actions for Bookings
 * 
 * These server actions handle booking creation with add-ons (request-only launch).
 * IMPORTANT: All pricing calculations happen server-side for security.
 */

import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { recordServerErrorEvent } from '@/lib/serverError';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import { geocodeAddress } from '@/lib/geocode';
import { DEFAULT_BOOKING_TIMEZONE } from '@/lib/datetime';
import { loadComputeContextForProRange } from '@/lib/availability/load-context';
import { assertSlotBookable, proposedBookingUtcWindow } from '@/lib/availability/engine';
import { resolveUrgency } from '@/lib/bookings/urgency';
import { getFeeRuleForBooking } from '@/lib/bookings/fee-rules';
import {
  bookingAddonsInsertRows,
  buildNotesAndPackageSnapshotForRequest,
  validateActiveAddonsForProCategory,
} from '@/lib/bookings/booking-request-scope';
import { isServiceProBookableByCustomers } from '@/lib/pro/pro-bookability';
import { applyMinimumBookingSubtotal } from '@/lib/pricing/config';
import {
  buildCanonicalBookingPricingSnapshotPatchFromMarketplaceFees,
  logIfBookingPricingSnapshotPatchIncomplete,
} from '@/lib/bookings/booking-pricing-snapshot';
import { getFeeProfileForOccupationSlug } from '@/lib/pricing/category-config';
import { computeMarketplaceFees, resolveMarketplacePricingVersionForBooking } from '@/lib/pricing/fees';
import { getSuggestedPriceCents } from '@/lib/pricing/suggestions';
import { bookingLimiter } from '@/lib/rate-limit';
import { headers } from 'next/headers';

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
  selectedAddonIds: string[],
  subcategoryId?: string | null,
  previousBookingId?: string | null,
  selectedPackageId?: string | null
): Promise<{ success: boolean; bookingId?: string; error?: string; minimumSubtotalApplied?: boolean }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1) Authenticate user
    if (!user) {
      return { success: false, error: 'Unauthorized. Customer access required.' };
    }

    const { data: profile } = await supabase.from('profiles').select('role, account_status').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'customer') {
      return { success: false, error: 'Unauthorized. Customer access required.' };
    }
    if ((profile as { account_status?: string }).account_status !== 'active') {
      return { success: false, error: 'Your account is deactivated. Reactivate to book services.' };
    }

    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { success: withinBookingLimit } = await bookingLimiter.limit(`booking:${user.id}:${ip}`);
    if (!withinBookingLimit) {
      return { success: false, error: 'Too many requests. Please try again shortly.' };
    }

    // 2) Validate pro exists + get pricing context.
    // Avoid service_categories join (service_pros can have multiple FKs to categories).
    const { data: proRow, error: proErr } = await supabase
      .from('service_pros')
      .select('id, user_id, starting_price, category_id, occupation_id, available')
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

    const adminClient = createAdminSupabaseClient();
    const customerBookable = await isServiceProBookableByCustomers(adminClient, proId);
    if (!customerBookable) {
      return { success: false, error: 'Service pro not available.' };
    }

    // Validate subcategoryId if provided (must be one this pro offers).
    // Package bookings define scope server-side; never store a subcategory alongside a selected package.
    let validatedSubcategoryId: string | null = null;
    const willUsePackage = Boolean(selectedPackageId?.trim());
    if (!willUsePackage && subcategoryId?.trim()) {
      const { data: link } = await supabase
        .from('pro_service_subcategories')
        .select('subcategory_id')
        .eq('pro_id', proId)
        .eq('subcategory_id', subcategoryId.trim())
        .maybeSingle();
      if (link?.subcategory_id) {
        validatedSubcategoryId = link.subcategory_id;
      }
    }

    let categorySlug: string | undefined;
    let categoryDisplayName: string | undefined;
    try {
      const { data: cat } = await supabase
        .from('service_categories')
        .select('slug, name')
        .eq('id', (proRow as any).category_id)
        .maybeSingle();
      categorySlug = cat?.slug ?? undefined;
      categoryDisplayName =
        typeof (cat as { name?: string } | null)?.name === 'string'
          ? String((cat as { name: string }).name).trim() || undefined
          : undefined;
    } catch {
      categorySlug = undefined;
      categoryDisplayName = undefined;
    }

    let occupationSlug: string | undefined;
    const occId = (proRow as { occupation_id?: string | null }).occupation_id;
    if (occId) {
      const { data: occ } = await supabase
        .from('occupations')
        .select('slug')
        .eq('id', occId)
        .maybeSingle();
      if (occ && typeof (occ as { slug?: string }).slug === 'string') {
        occupationSlug = String((occ as { slug: string }).slug).trim() || undefined;
      }
    }

    const proUserId = String((proRow as { user_id: string }).user_id);
    const startingPriceCents = Math.round(Number((proRow as any).starting_price ?? 0) * 100);

    const addonResult = await validateActiveAddonsForProCategory(
      supabase,
      proUserId,
      categorySlug,
      selectedAddonIds
    );
    if (!addonResult.ok) {
      if (selectedAddonIds.length > 0) {
        void recordServerErrorEvent({
          message: 'Booking create: add-on validation failed',
          severity: 'error',
          route: 'action:createBookingWithPayment',
          userId: user.id,
          meta: { proId, selectedAddonCount: selectedAddonIds.length, error: addonResult.error },
        });
      }
      return { success: false, error: addonResult.error };
    }
    const validatedAddons = addonResult.addons;

    let pkgRowForScope: Record<string, unknown> | null = null;
    const pkgIdTrim = selectedPackageId?.trim() ?? '';
    if (pkgIdTrim) {
      const { data: pkgRow, error: pkgErr } = await adminClient
        .from('service_packages')
        .select('*')
        .eq('id', pkgIdTrim)
        .eq('pro_user_id', proUserId)
        .eq('is_active', true)
        .maybeSingle();

      if (pkgErr || !pkgRow) {
        return { success: false, error: 'Selected package is not available. Choose another or continue without a package.' };
      }

      const pkg = pkgRow as Record<string, unknown>;
      const pkgBaseCents = Math.round(Number(pkg.base_price_cents ?? 0));
      if (!Number.isFinite(pkgBaseCents) || pkgBaseCents <= 0) {
        return { success: false, error: 'This package has an invalid price. Contact the pro or book without a package.' };
      }
      pkgRowForScope = pkg;
    }

    const scope = buildNotesAndPackageSnapshotForRequest({
      packageRow: pkgRowForScope,
      customerNotes: notes,
      validatedAddons,
      startingPriceCents,
    });
    const notesForBooking = scope.notesForBooking;
    const selectedPackageIdOut = scope.selectedPackageId;
    const selectedPackageSnapshotOut = scope.selectedPackageSnapshot;
    const basePriceCents = scope.basePriceCents;
    const durationMinutes = scope.durationMinutes;

    const addonsTotalCents = validatedAddons.reduce((sum, a) => sum + a.price_cents, 0);

    const initialStatusHistory = [{ status: 'requested', at: new Date().toISOString() }];
    const requestedAt = new Date().toISOString();
    const urgency = resolveUrgency({
      requestedAt,
      scheduledStartAt: `${date}T${time}:00`,
    });

    // 4) Calculate total server-side (base price + add-ons) — pro subtotal in cents
    const rawSubtotalCents = basePriceCents + addonsTotalCents;
    const minApply = applyMinimumBookingSubtotal({
      rawSubtotalCents,
      occupationSlug: occupationSlug ?? null,
    });
    if (!minApply.ok) {
      return { success: false, error: minApply.error };
    }

    const occForIntel = occupationSlug?.trim() || 'cleaner';
    const suggestedPriceCents = getSuggestedPriceCents({
      occupationSlug: occForIntel,
      estimatedDurationMinutes: durationMinutes,
      urgency,
    });
    const wasBelowMinimum = minApply.adjusted;
    const wasBelowSuggestion = rawSubtotalCents < suggestedPriceCents;

    const marketplaceFees = computeMarketplaceFees(
      minApply.enforcedSubtotalCents,
      resolveMarketplacePricingVersionForBooking({ customerId: user.id }),
      getFeeProfileForOccupationSlug(occupationSlug)
    );
    const totalDollars = marketplaceFees.subtotalCents / 100;

    const feeRuleForStamp = getFeeRuleForBooking({
      serviceSubtotalCents: minApply.enforcedSubtotalCents,
      categoryName: categoryDisplayName,
      occupationSlug,
      categorySlug,
    });

    const { data: proProfileSnap } = await adminClient
      .from('pro_profiles')
      .select(
        'pricing_model, hourly_rate, min_hours, deposit_percent_default, deposit_percent_min, deposit_percent_max'
      )
      .eq('user_id', proUserId)
      .maybeSingle();
    const pm = String((proProfileSnap as { pricing_model?: string } | null)?.pricing_model ?? 'flat');
    const chargeModelSnapshot =
      pm === 'hourly' ? 'hourly' : pm === 'hybrid' ? 'flat_hourly' : 'flat';
    const hourlySnap = Number((proProfileSnap as { hourly_rate?: number })?.hourly_rate ?? 0);
    const minHoursSnap = Number((proProfileSnap as { min_hours?: number })?.min_hours ?? 0);
    const hourlyRateCentsSnap = hourlySnap > 0 ? Math.round(hourlySnap * 100) : null;
    const minimumJobCentsSnap =
      (chargeModelSnapshot === 'hourly' || chargeModelSnapshot === 'flat_hourly') &&
      minHoursSnap > 0 &&
      hourlyRateCentsSnap != null &&
      hourlyRateCentsSnap > 0
        ? Math.round(minHoursSnap * hourlyRateCentsSnap)
        : null;
    const baseFeeCentsSnap = chargeModelSnapshot === 'flat_hourly' ? startingPriceCents : null;
    const includedHoursSnap = chargeModelSnapshot === 'flat_hourly' ? 2 : null;
    const actualHoursEstimate = durationMinutes / 60;

    const pricingSnapshotPatch = buildCanonicalBookingPricingSnapshotPatchFromMarketplaceFees({
      marketplaceFees,
      chargeModel: chargeModelSnapshot,
      feeProfile: feeRuleForStamp.profile,
      proDepositPercents: proProfileSnap as {
        deposit_percent_default?: number | null;
        deposit_percent_min?: number | null;
        deposit_percent_max?: number | null;
      } | null,
      flatFeeCents: rawSubtotalCents,
      hourlyRateCents: hourlyRateCentsSnap,
      baseFeeCents: baseFeeCentsSnap,
      includedHours: includedHoursSnap,
      actualHoursEstimate,
      overageHourlyRateCents: hourlyRateCentsSnap,
      minimumJobCents: minimumJobCentsSnap,
      demandMultiplier: null,
    });

    // 4b) Geocode address for arrival verification (best-effort)
    let addressLat: number | null = null;
    let addressLng: number | null = null;
    try {
      const coords = await geocodeAddress(address);
      if (coords) {
        addressLat = coords.lat;
        addressLng = coords.lng;
      }
    } catch {
      // ignore geocode failures
    }

    let ctxAvail: Awaited<ReturnType<typeof loadComputeContextForProRange>> = null;
    try {
      ctxAvail = await loadComputeContextForProRange(adminClient, proId, date, date);
    } catch (availErr) {
      void recordServerErrorEvent({
        message: 'Booking create: availability context load failed',
        severity: 'error',
        route: 'action:createBookingWithPayment',
        userId: user.id,
        meta: { proId, availErr: availErr instanceof Error ? availErr.message : String(availErr) },
      });
      return { success: false, error: 'Unable to verify availability. Please try again shortly.' };
    }
    if (!ctxAvail) {
      return { success: false, error: 'Unable to verify availability. Please try again.' };
    }
    const firstCheck = assertSlotBookable(date, time, durationMinutes, ctxAvail);
    if (!firstCheck.ok) {
      return { success: false, error: firstCheck.reason };
    }
    const ctxAvail2 = await loadComputeContextForProRange(adminClient, proId, date, date);
    if (!ctxAvail2) {
      return { success: false, error: 'Unable to verify availability. Please try again.' };
    }
    const secondCheck = assertSlotBookable(date, time, durationMinutes, ctxAvail2);
    if (!secondCheck.ok) {
      return { success: false, error: 'That time was just taken. Please pick another slot.' };
    }

    const bookingTimezone = ctxAvail.zone;
    const windowUtc = proposedBookingUtcWindow(date, time, bookingTimezone, durationMinutes);
    if (!windowUtc) {
      return { success: false, error: 'Invalid date or time for booking.' };
    }

    const { data: conflict, error: rpcErr } = await adminClient.rpc('booking_has_schedule_conflict', {
      p_pro_id: proId,
      p_start_utc: windowUtc.startUtcIso,
      p_end_utc: windowUtc.endUtcIso,
      p_exclude_booking_id: null,
    });
    if (rpcErr) {
      void recordServerErrorEvent({
        message: 'Booking create: schedule conflict RPC failed',
        severity: 'error',
        route: 'action:createBookingWithPayment',
        userId: user.id,
        meta: { proId, rpcErr: (rpcErr as { message?: string }).message },
      });
      return { success: false, error: 'Unable to confirm schedule. Please try again.' };
    }
    if (conflict === true) {
      return {
        success: false,
        error: 'That time conflicts with an active booking. Please pick another slot.',
      };
    }

    // 5) Create booking
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert({
        customer_id: user.id,
        pro_id: proId,
        service_date: date,
        service_time: time,
        booking_timezone: bookingTimezone,
        scheduled_start_at: windowUtc.startUtcIso,
        scheduled_end_at: windowUtc.endUtcIso,
        estimated_duration_minutes: durationMinutes,
        address,
        notes: notesForBooking || null,
        status: 'requested' satisfies BookingStatus,
        status_history: initialStatusHistory,
        price: totalDollars,
        urgency,
        pricing_occupation_slug: occupationSlug ?? null,
        pricing_category_slug: categorySlug ?? null,
        original_subtotal_cents: minApply.originalSubtotalCents,
        ...pricingSnapshotPatch,
        subcategory_id: validatedSubcategoryId,
        address_lat: addressLat,
        address_lng: addressLng,
        duration_hours: durationMinutes / 60,
        selected_package_id: selectedPackageIdOut,
        selected_package_snapshot: selectedPackageSnapshotOut,
        suggested_price_cents: suggestedPriceCents,
        was_below_suggestion: wasBelowSuggestion,
        was_below_minimum: wasBelowMinimum,
      })
      .select('id')
      .single();

    if (booking && !bookingErr) {
      logIfBookingPricingSnapshotPatchIncomplete(
        'createBookingWithPayment',
        booking.id as string,
        pricingSnapshotPatch
      );
    }

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

    // 5b) Record rebook event when customer rebooks from previous booking
    if (previousBookingId?.trim()) {
      const { data: prev } = await supabase
        .from('bookings')
        .select('id, customer_id, pro_id')
        .eq('id', previousBookingId.trim())
        .eq('customer_id', user.id)
        .in('status', ['completed', 'paid', 'awaiting_customer_confirmation'])
        .maybeSingle();
      if (prev && prev.pro_id === proId) {
        await supabase.from('rebook_events').insert({
          customer_id: user.id,
          pro_id: proId,
          previous_booking_id: prev.id,
          new_booking_id: booking.id,
        });
      }
    }

    // 6) Notify Customer: in-app confirmation only (no push)
    void createNotificationEvent({
      userId: user.id,
      type: NOTIFICATION_TYPES.BOOKING_REQUESTED,
      bookingId: booking.id,
      basePath: 'customer',
    });

    // 7) Notify Pro: New booking request
    if (proUserId) {
      void createNotificationEvent({
        userId: proUserId,
        type: NOTIFICATION_TYPES.BOOKING_REQUESTED,
        actorUserId: user.id,
        bookingId: booking.id,
        titleOverride: 'New booking request',
        bodyOverride: `A customer requested a booking for ${date} at ${time}.`,
        basePath: 'pro',
      });
    }

    // 8) Snapshot selected add-ons (same validated list as pricing/notes)
    if (validatedAddons.length > 0) {
      await supabase.from('booking_addons').insert(bookingAddonsInsertRows(booking.id, validatedAddons));
    }

    return {
      success: true,
      bookingId: booking.id,
      minimumSubtotalApplied: minApply.adjusted,
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






