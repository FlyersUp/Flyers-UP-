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
import { calendarWallTimesWithPending, mapRescheduleRowToPending } from '@/lib/bookings/pending-reschedule';

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
        'id, customer_id, pro_id, service_date, service_time, booking_timezone, address, notes, status, price, duration_hours, payment_status'
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

    const { data: pendRow } = await admin
      .from('reschedule_requests')
      .select(
        'id, proposed_service_date, proposed_service_time, proposed_start_at, requested_by_role, message, expires_at'
      )
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const pending = mapRescheduleRowToPending(pendRow as Record<string, unknown> | null);
    const wall = calendarWallTimesWithPending(
      String(booking.service_date),
      String(booking.service_time),
      pending
    );

    const basePath = isPro ? 'pro' : 'customer';
    const event = bookingToCalendarEvent(
      {
        ...booking,
        service_date: wall.serviceDate,
        service_time: wall.serviceTime,
        notes: pending
          ? `${booking.notes ?? ''}\n(Requested reschedule — pending confirmation)`.trim()
          : booking.notes,
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
    if (!icsContent.trim()) {
      return NextResponse.json({ error: 'Could not build calendar file' }, { status: 500 });
    }
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
