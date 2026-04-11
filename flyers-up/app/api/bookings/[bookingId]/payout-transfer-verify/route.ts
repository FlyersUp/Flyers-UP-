/**
 * GET /api/bookings/[bookingId]/payout-transfer-verify
 * Live Stripe Transfer.status for pro/customer payout UI (no DB-only "paid").
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { verifyTransferStatus } from '@/lib/stripe/verify-transfer-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function trimId(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = normalizeUuidOrNull(bookingId);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createSupabaseAdmin();
    const { data: booking } = await admin
      .from('bookings')
      .select('customer_id, pro_id, payout_released, payout_transfer_id')
      .eq('id', id)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: pro } = await admin
      .from('service_pros')
      .select('user_id')
      .eq('id', booking.pro_id)
      .maybeSingle();

    const proUserId = (pro as { user_id?: string })?.user_id;
    const isCustomer = booking.customer_id === user.id;
    const isPro = proUserId === user.id;
    if (!isCustomer && !isPro) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const released = booking.payout_released === true;
    if (!released) {
      return NextResponse.json({
        payoutTransferStripeStatus: null,
        payoutTransferStripeLiveChecked: false,
        payoutTransferIdPresent: false,
      });
    }

    let transferId = trimId(booking.payout_transfer_id);
    if (!transferId) {
      const { data: bp } = await admin
        .from('booking_payouts')
        .select('stripe_transfer_id')
        .eq('booking_id', id)
        .maybeSingle();
      transferId = trimId((bp as { stripe_transfer_id?: string | null } | null)?.stripe_transfer_id);
    }

    if (!transferId) {
      return NextResponse.json({
        payoutTransferStripeStatus: null,
        payoutTransferStripeLiveChecked: true,
        payoutTransferIdPresent: false,
      });
    }

    const { status } = await verifyTransferStatus(transferId);
    return NextResponse.json({
      payoutTransferStripeStatus: status,
      payoutTransferStripeLiveChecked: true,
      payoutTransferIdPresent: true,
    });
  } catch (err) {
    console.error('[payout-transfer-verify]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
