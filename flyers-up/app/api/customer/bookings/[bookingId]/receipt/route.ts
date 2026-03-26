/**
 * GET /api/customer/bookings/[bookingId]/receipt
 * Unified booking receipt JSON (default) or ?format=html printable view.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { getBookingReceipt } from '@/lib/bookings/booking-receipt-service';
import { renderBookingReceiptPrintHtml } from '@/lib/bookings/receipt-print-html';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const format = req.nextUrl.searchParams.get('format') ?? 'json';
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) {
    return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const role = profile.role ?? 'customer';
  const admin = createAdminSupabaseClient();

  let q = admin.from('bookings').select('id').eq('id', id);
  if (role === 'customer') {
    q = q.eq('customer_id', user.id);
  } else if (role === 'pro') {
    const { data: proRow } = await admin
      .from('service_pros')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!proRow?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    q = q.or(`customer_id.eq.${user.id},pro_id.eq.${proRow.id}`);
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: allowed, error: allowErr } = await q.maybeSingle();
  if (allowErr || !allowed) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const receipt = await getBookingReceipt(admin, id);
  if (!receipt) {
    return NextResponse.json({ error: 'Receipt unavailable' }, { status: 500 });
  }

  if (format === 'html') {
    const html = renderBookingReceiptPrintHtml(receipt);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json(
    { receipt },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
