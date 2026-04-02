/**
 * GET /api/account/data-export
 * Authenticated JSON export: profile, recent bookings, payment-related fields (MVP).
 * Uses service role with explicit user/pro filters (same pattern as customer bookings API).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { recordServerErrorEvent } from '@/lib/serverError';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const BOOKING_FULL =
  'id, customer_id, pro_id, service_date, service_time, address, notes, status, price, created_at, duration_hours, payment_status, paid_at, final_payment_status, fully_paid_at, payment_due_at, remaining_due_at, paid_deposit_at, paid_remaining_at, payout_status, refund_status, customer_fees_retained_cents, refunded_total_cents, total_amount_cents, amount_subtotal, amount_deposit, amount_remaining, amount_total, booking_timezone';

const BOOKING_MIN =
  'id, customer_id, pro_id, service_date, service_time, address, notes, status, price, created_at, duration_hours';

const PROFILE_FIELDS =
  'id, role, first_name, full_name, phone, zip_code, language_preference, account_status, avatar_url, onboarding_step, created_at, updated_at';

const PRO_PUBLIC_FIELDS =
  'id, display_name, bio, category_id, service_area_zip, starting_price, location, service_radius, business_hours, years_experience, logo_url, created_at, closed_at';

type BookingRow = Record<string, unknown>;

function toPaymentHistoryRow(b: BookingRow, perspective: 'customer' | 'pro') {
  return {
    bookingId: b.id,
    serviceDate: b.service_date ?? null,
    serviceTime: b.service_time ?? null,
    bookingStatus: b.status ?? null,
    paymentStatus: b.payment_status ?? null,
    finalPaymentStatus: b.final_payment_status ?? null,
    fullyPaidAt: b.fully_paid_at ?? null,
    paidAt: b.paid_at ?? null,
    paidDepositAt: b.paid_deposit_at ?? null,
    paidRemainingAt: b.paid_remaining_at ?? null,
    totalAmountCents: b.total_amount_cents ?? null,
    amountSubtotalCents: b.amount_subtotal ?? null,
    amountDepositCents: b.amount_deposit ?? null,
    amountRemainingCents: b.amount_remaining ?? null,
    legacyPrice: b.price ?? null,
    refundedTotalCents: b.refunded_total_cents ?? null,
    ...(perspective === 'pro'
      ? {
          payoutStatus: b.payout_status ?? null,
          customerFeesRetainedCents: b.customer_fees_retained_cents ?? null,
        }
      : {}),
  };
}

async function fetchBookingsForExport(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  mode: 'customer' | 'pro',
  userId: string,
  proTableId: string | null
): Promise<BookingRow[]> {
  const limit = 100;
  const run = async (cols: string) => {
    let q = admin.from('bookings').select(cols).order('created_at', { ascending: false }).limit(limit);
    if (mode === 'customer') {
      q = q.eq('customer_id', userId);
    } else if (proTableId) {
      q = q.eq('pro_id', proTableId);
    }
    return q;
  };

  let { data, error } = await run(BOOKING_FULL);
  if (error) {
    const msg = error.message ?? '';
    const soft = msg.includes('does not exist') || error.code === 'PGRST204';
    if (soft) {
      const second = await run(BOOKING_MIN);
      data = second.data;
      error = second.error;
    }
  }
  if (error) {
    void recordServerErrorEvent({
      message: 'API data-export: bookings query failed',
      severity: 'error',
      route: 'api:GET /api/account/data-export',
      userId,
      meta: { code: (error as { code?: string }).code, message: (error as { message?: string }).message },
    });
    return [];
  }
  if (!data || !Array.isArray(data)) return [];
  return data as unknown as BookingRow[];
}

export async function GET() {
  try {
    const authed = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileErr } = await authed
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const role = profile.role ?? 'customer';
    const exportedAt = new Date().toISOString();

    if (role === 'admin') {
      return NextResponse.json(
        {
          ok: true as const,
          exportedAt,
          authEmail: user.email ?? null,
          role: 'admin',
          profile,
          servicePro: null,
          bookingsPerspective: 'customer' as const,
          bookings: [] as BookingRow[],
          paymentHistory: [],
          note: 'Admin role: export includes your profile only; use internal tools for operational data.',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    let servicePro: Record<string, unknown> | null = null;
    let proTableId: string | null = null;
    if (role === 'pro') {
      const { data: proRow } = await admin.from('service_pros').select(PRO_PUBLIC_FIELDS).eq('user_id', user.id).maybeSingle();
      if (proRow) {
        servicePro = proRow as Record<string, unknown>;
        proTableId = String(proRow.id);
      }
    }

    const bookingMode: 'customer' | 'pro' = role === 'pro' && proTableId ? 'pro' : 'customer';
    const bookings = await fetchBookingsForExport(admin, bookingMode, user.id, proTableId);
    const paymentHistory = bookings.map((b) => toPaymentHistoryRow(b, bookingMode === 'pro' ? 'pro' : 'customer'));

    return NextResponse.json(
      {
        ok: true as const,
        exportedAt,
        authEmail: user.email ?? null,
        role,
        profile,
        servicePro,
        bookingsPerspective: bookingMode,
        bookings,
        paymentHistory,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    void recordServerErrorEvent({
      message: 'API data-export: unexpected exception',
      severity: 'error',
      route: 'api:GET /api/account/data-export',
      meta: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json({ ok: false, error: 'Unexpected error' }, { status: 500 });
  }
}
