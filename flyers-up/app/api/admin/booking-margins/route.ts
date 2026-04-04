/**
 * GET /api/admin/booking-margins
 * Internal metrics: fee snapshot, Stripe fees from ledger, contribution margin (after final/legacy pay).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type MarginBookingRow = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string | null;
  final_payment_status: string | null;
  subtotal_cents: number | null;
  fee_total_cents: number | null;
  customer_total_cents: number | null;
  amount_platform_fee: number | null;
  stripe_estimated_fee_cents: number | null;
  stripe_actual_fee_cents: number | null;
  stripe_net_cents: number | null;
  platform_gross_margin_cents: number | null;
  contribution_margin_cents: number | null;
  effective_take_rate: number | null;
  pricing_version: string | null;
  pricing_band: string | null;
  refunded_total_cents: number | null;
};

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const limitRaw = Number(sp.get('limit') ?? DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT));

  const admin = createAdminSupabaseClient();

  const { data: bookingsRaw, error } = await admin
    .from('bookings')
    .select(
      'id, created_at, status, payment_status, final_payment_status, subtotal_cents, fee_total_cents, customer_total_cents, amount_platform_fee, stripe_estimated_fee_cents, stripe_actual_fee_cents, stripe_net_cents, platform_gross_margin_cents, contribution_margin_cents, effective_take_rate, pricing_version, pricing_band, refunded_total_cents'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[admin/booking-margins]', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }

  const bookings = (bookingsRaw ?? []) as unknown as MarginBookingRow[];
  const ids = bookings.map((b) => b.id).filter(Boolean);

  type LedgerRow = {
    booking_id: string;
    payment_intent_id: string;
    stripe_fee_cents: number;
    created_at: string;
  };
  let ledgerRows: LedgerRow[] = [];
  if (ids.length > 0) {
    const { data } = await admin
      .from('booking_payment_intent_stripe_fees')
      .select('booking_id, payment_intent_id, stripe_fee_cents, created_at')
      .in('booking_id', ids);
    ledgerRows = (data ?? []) as LedgerRow[];
  }

  const ledgerByBooking = new Map<string, LedgerRow[]>();
  for (const row of ledgerRows) {
    const bid = row.booking_id;
    const list = ledgerByBooking.get(bid) ?? [];
    list.push(row);
    ledgerByBooking.set(bid, list);
  }

  return NextResponse.json({
    bookings: bookings ?? [],
    stripeFeesByBooking: Object.fromEntries(ledgerByBooking),
  });
}
