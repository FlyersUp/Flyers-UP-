/**
 * POST /api/bookings/[bookingId]/accept-quote
 * Customer accepts the pro's quote.
 * Locks price_final, stamps immutable marketplace pricing snapshot, moves to payment flow.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import {
  getBookingMessagingParties,
  otherPartyUserIdForBooking,
  rejectIfMessagingBlocked,
} from '@/lib/messaging/blockEnforcement';
import { computeQuote, type BookingForQuote } from '@/lib/bookingQuote';
import { getFeeRuleForBooking } from '@/lib/bookings/fee-rules';
import {
  buildCanonicalBookingPricingSnapshotPatch,
  logIfBookingPricingSnapshotPatchIncomplete,
} from '@/lib/bookings/booking-pricing-snapshot';
import { computeMarketplaceFees, resolveMarketplacePricingVersionForBooking } from '@/lib/pricing/fees';
import { getFeeProfileForOccupationSlug } from '@/lib/pricing/category-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      'id, customer_id, pro_id, status, price_status, price_proposed, status_history, service_date, service_time, address, urgency, created_at, duration_hours, miles_distance, flat_fee_selected, hourly_selected, pricing_occupation_slug, pricing_category_slug, negotiation_round'
    )
    .eq('id', id)
    .single();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.customer_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parties = await getBookingMessagingParties(admin, {
    customer_id: booking.customer_id as string,
    pro_id: booking.pro_id as string,
  });
  if (!parties) return NextResponse.json({ error: 'Invalid booking' }, { status: 500 });
  const blockedRes = await rejectIfMessagingBlocked(
    admin,
    user.id,
    otherPartyUserIdForBooking(parties, user.id),
    'POST /api/bookings/[id]/accept-quote'
  );
  if (blockedRes) return blockedRes;

  if (booking.status !== 'requested' && (booking as { status?: string }).status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not in negotiation state' }, { status: 409 });
  }

  const priceStatus = (booking as { price_status?: string }).price_status ?? 'requested';
  if (priceStatus !== 'quoted') {
    return NextResponse.json({ error: 'No quote to accept' }, { status: 409 });
  }

  const proposed = Number((booking as { price_proposed?: number }).price_proposed ?? 0);
  if (!Number.isFinite(proposed) || proposed <= 0) {
    return NextResponse.json({ error: 'Invalid quote amount' }, { status: 400 });
  }

  const { data: proRow, error: proErr } = await admin
    .from('service_pros')
    .select('user_id, display_name, category_id, occupation_id, occupations(slug)')
    .eq('id', booking.pro_id as string)
    .maybeSingle();

  if (proErr || !proRow) {
    return NextResponse.json({ error: 'Failed to load service pro' }, { status: 500 });
  }

  const { data: proPricing } = await admin
    .from('pro_profiles')
    .select(
      'pricing_model, starting_price, starting_rate, hourly_rate, min_hours, travel_fee_enabled, travel_fee_base, travel_free_within_miles, travel_extra_per_mile, deposit_percent_default, deposit_percent_min, deposit_percent_max'
    )
    .eq('user_id', (proRow as { user_id: string }).user_id)
    .maybeSingle();

  let serviceName = 'Service';
  const catId = (proRow as { category_id?: string | null }).category_id;
  if (catId) {
    const { data: catRow } = await admin
      .from('service_categories')
      .select('name')
      .eq('id', catId)
      .maybeSingle();
    if (catRow && typeof (catRow as { name?: string }).name === 'string') {
      serviceName = String((catRow as { name: string }).name).trim() || 'Service';
    }
  }

  const occSlugFromPro =
    (proRow as { occupations?: { slug?: string } | null }).occupations?.slug?.trim() || null;
  const bRow = booking as {
    pricing_occupation_slug?: string | null;
    pricing_category_slug?: string | null;
    duration_hours?: number | null;
    miles_distance?: number | null;
    flat_fee_selected?: boolean | null;
    hourly_selected?: boolean | null;
    urgency?: string | null;
    created_at?: string | null;
  };

  const { count: completedPaidCount } = await admin
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', booking.customer_id as string)
    .in('status', ['fully_paid', 'completed', 'customer_confirmed', 'auto_confirmed', 'payout_released']);

  const bookingForQuote: BookingForQuote = {
    id: booking.id as string,
    customer_id: booking.customer_id as string,
    pro_id: booking.pro_id as string,
    service_date: String(booking.service_date ?? ''),
    service_time: String(booking.service_time ?? ''),
    address: (booking as { address?: string | null }).address ?? null,
    price: proposed,
    status: String(booking.status ?? ''),
    duration_hours: bRow.duration_hours ?? null,
    miles_distance: bRow.miles_distance ?? null,
    flat_fee_selected: bRow.flat_fee_selected ?? null,
    hourly_selected: bRow.hourly_selected ?? null,
    urgency: bRow.urgency ?? null,
    created_at: bRow.created_at ?? null,
    pricing_occupation_slug: bRow.pricing_occupation_slug ?? null,
    pricing_category_slug: bRow.pricing_category_slug ?? null,
    pricing_version: null,
    service_fee_cents: null,
    convenience_fee_cents: null,
    protection_fee_cents: null,
  };

  const quoteResult = computeQuote(bookingForQuote, proPricing, serviceName, (proRow as { display_name?: string }).display_name ?? 'Pro', {
    occupationSlug: bRow.pricing_occupation_slug ?? occSlugFromPro,
    completedOrPaidBookingCount: completedPaidCount ?? 0,
  });

  const occSlug = bRow.pricing_occupation_slug ?? occSlugFromPro ?? '';
  const feeProfileEngine = getFeeProfileForOccupationSlug(occSlug);
  const mf = computeMarketplaceFees(
    Math.max(0, quoteResult.pricing.serviceSubtotalCents),
    resolveMarketplacePricingVersionForBooking({ customerId: user.id }),
    feeProfileEngine
  );

  const feeRule = getFeeRuleForBooking({
    serviceSubtotalCents: quoteResult.pricing.serviceSubtotalCents,
    categoryName: serviceName,
    occupationSlug: occSlug || undefined,
    categorySlug: bRow.pricing_category_slug ?? undefined,
  });

  const pm = String((proPricing as { pricing_model?: string } | null)?.pricing_model ?? 'flat');
  const chargeModelSnapshot = pm === 'hourly' ? 'hourly' : pm === 'hybrid' ? 'flat_hourly' : 'flat';
  const hourlySnap = Number((proPricing as { hourly_rate?: number })?.hourly_rate ?? 0);
  const minHoursSnap = Number((proPricing as { min_hours?: number })?.min_hours ?? 0);
  const hourlyRateCentsSnap = hourlySnap > 0 ? Math.round(hourlySnap * 100) : null;
  const minimumJobCentsSnap =
    (chargeModelSnapshot === 'hourly' || chargeModelSnapshot === 'flat_hourly') &&
    minHoursSnap > 0 &&
    hourlyRateCentsSnap != null &&
    hourlyRateCentsSnap > 0
      ? Math.round(minHoursSnap * hourlyRateCentsSnap)
      : null;
  const baseFeeCentsSnap = chargeModelSnapshot === 'flat_hourly' ? Math.round(Number(proPricing?.starting_price ?? proPricing?.starting_rate ?? 0) * 100) : null;
  const includedHoursSnap = chargeModelSnapshot === 'flat_hourly' ? 2 : null;
  const durationMinutes = Math.max(1, Math.round(Number(bRow.duration_hours ?? 1) * 60));
  const actualHoursEstimate = durationMinutes / 60;

  const snapshotPatch = buildCanonicalBookingPricingSnapshotPatch({
    pricing: quoteResult.pricing,
    mf,
    chargeModel: chargeModelSnapshot,
    feeProfile: feeRule.profile,
    flatFeeCents: quoteResult.pricing.serviceSubtotalCents,
    hourlyRateCents: hourlyRateCentsSnap,
    baseFeeCents: baseFeeCentsSnap,
    includedHours: includedHoursSnap,
    actualHoursEstimate,
    overageHourlyRateCents: hourlyRateCentsSnap,
    minimumJobCents: minimumJobCentsSnap,
    demandMultiplier: null,
  });

  const now = new Date();
  const paymentDueAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const history = ((booking as { status_history?: { status: string; at: string }[] }).status_history ?? []) as {
    status: string;
    at: string;
  }[];
  const newHistory = [...history, { status: 'awaiting_deposit_payment', at: now.toISOString() }];

  const { data: updated, error: updateErr } = await admin
    .from('bookings')
    .update({
      price: proposed,
      price_final: proposed,
      price_status: 'accepted',
      status: 'awaiting_deposit_payment',
      payment_due_at: paymentDueAt,
      status_history: newHistory,
      original_subtotal_cents: Math.round(proposed * 100),
      ...snapshotPatch,
    })
    .eq('id', id)
    .in('status', ['requested', 'pending'])
    .eq('price_status', 'quoted')
    .select('id')
    .maybeSingle();

  if (updateErr) {
    console.error('Accept quote failed', updateErr);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { error: 'Quote was already accepted or booking is no longer available' },
      { status: 409 }
    );
  }

  logIfBookingPricingSnapshotPatchIncomplete('accept-quote', id, snapshotPatch);

  await admin.from('booking_quotes').insert({
    booking_id: id,
    sender_role: 'customer',
    sender_id: user.id,
    amount: proposed,
    message: 'Accepted',
    round: (booking as { negotiation_round?: number }).negotiation_round ?? 1,
    action: 'accepted',
  });

  const proId = (booking as { pro_id?: string }).pro_id;
  if (proId) {
    const proUserId = (proRow as { user_id?: string })?.user_id;
    if (proUserId) {
      void createNotificationEvent({
        userId: proUserId,
        type: NOTIFICATION_TYPES.BOOKING_ACCEPTED,
        bookingId: id,
        basePath: 'pro',
        titleOverride: 'Quote accepted',
        bodyOverride: 'Customer accepted your quote',
      });
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
