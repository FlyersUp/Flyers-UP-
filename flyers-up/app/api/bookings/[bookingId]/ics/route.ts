/**
 * GET /api/bookings/[bookingId]/ics
 * Returns .ics file for the booking. Role-safe: customer or pro must own the booking.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { generateIcs } from '@/lib/calendar/ics';
import { bookingToCalendarEvent } from '@/lib/calendar/event-from-booking';
import { isCalendarCommittedStatus } from '@/lib/calendar/committed-states';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });

  try {
    const authed = await createServerSupabaseClient();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminSupabaseClient();
    const { data: booking, error } = await admin
      .from('bookings')
      .select(
        'id, customer_id, pro_id, service_date, service_time, address, notes, status, price, duration_hours, payment_status'
      )
      .eq('id', bookingId)
      .maybeSingle();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Ownership: must be customer or pro
    const { data: proRow } = await admin
      .from('service_pros')
      .select('user_id')
      .eq('id', booking.pro_id)
      .maybeSingle();
    const proUserId = (proRow as { user_id?: string } | null)?.user_id;

    const isCustomer = booking.customer_id === user.id;
    const isPro = proUserId === user.id;
    if (!isCustomer && !isPro) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isCalendarCommittedStatus(booking.status)) {
      return NextResponse.json({ error: 'Booking not available for calendar' }, { status: 400 });
    }

    const basePath = isPro ? 'pro' : 'customer';
    const event = bookingToCalendarEvent(
      {
        ...booking,
        customer: null,
        pro: { displayName: null, serviceName: 'Service' },
      },
      basePath
    );

    if (!event) {
      return NextResponse.json({ error: 'Could not generate calendar event' }, { status: 400 });
    }

    const baseUrl = req.nextUrl.origin;
    const icsContent = generateIcs(event, baseUrl);
    const filename = `flyers-up-booking-${bookingId.slice(0, 8)}.ics`;

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
