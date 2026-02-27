/**
 * GET /api/customer/bookings/[bookingId]
 * Fetch a single booking for the authenticated customer or assigned pro.
 * Customers: must be the booking's customer. Pros: must be the assigned pro.
 * Returns fields needed for Track Booking page: status, timestamps, pro info, service info.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
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

    const admin = createAdminSupabaseClient();

    // Customer: fetch only their bookings. Pro: fetch only bookings assigned to them.
    let q = admin
      .from('bookings')
      .select(
        `
        id,
        customer_id,
        pro_id,
        payment_status,
        paid_at,
        service_date,
        service_time,
        address,
        notes,
        status,
        price,
        created_at,
        accepted_at,
        en_route_at,
        on_the_way_at,
        started_at,
        completed_at,
        cancelled_at,
        status_history,
        service_pros (
          id,
          display_name,
          service_categories (
            name
          )
        )
      `
      )
      .eq('id', id);

    if (profile.role === 'customer') {
      q = q.eq('customer_id', user.id);
    } else if (profile.role === 'pro') {
      const { data: proRow } = await admin
        .from('service_pros')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!proRow?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      q = q.eq('pro_id', proRow.id);
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: booking, error } = await q.maybeSingle();

    if (error) {
      console.error('Error fetching booking:', error);
      return NextResponse.json({ error: 'Failed to load booking' }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const sp = booking.service_pros as { display_name?: string; service_categories?: { name?: string } | null } | null;
    const cat = sp?.service_categories;
    const serviceName = (cat && typeof cat === 'object' && 'name' in cat && cat.name) || 'Service';
    const proName = sp?.display_name?.trim() || 'Pro';

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          customerId: booking.customer_id,
          proId: booking.pro_id,
          serviceDate: booking.service_date,
          serviceTime: booking.service_time,
          address: booking.address,
          notes: booking.notes,
          status: booking.status,
          paymentStatus: (booking as { payment_status?: string }).payment_status ?? 'UNPAID',
          paidAt: (booking as { paid_at?: string | null }).paid_at ?? null,
          price: booking.price,
          createdAt: booking.created_at,
          acceptedAt: booking.accepted_at,
          onTheWayAt: (booking as { en_route_at?: string | null }).en_route_at ?? booking.on_the_way_at,
          enRouteAt: (booking as { en_route_at?: string | null }).en_route_at ?? booking.on_the_way_at,
          startedAt: booking.started_at,
          completedAt: booking.completed_at,
          cancelledAt: (booking as { cancelled_at?: string | null }).cancelled_at ?? null,
          statusHistory: booking.status_history,
          serviceName,
          proName,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
