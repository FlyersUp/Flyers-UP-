/**
 * POST /api/bookings/[bookingId]/issues
 * Report a booking issue (pro late, work incomplete, wrong service, contact support).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ISSUE_TYPES = ['pro_late', 'work_incomplete', 'wrong_service', 'contact_support', 'dispute'] as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = normalizeUuidOrNull(bookingId);
    if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { issueType?: string; notes?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const issueType = body?.issueType;
    if (!issueType || !VALID_ISSUE_TYPES.includes(issueType as typeof VALID_ISSUE_TYPES[number])) {
      return NextResponse.json(
        { error: 'Invalid issueType', allowed: VALID_ISSUE_TYPES },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: booking } = await admin
      .from('bookings')
      .select('id, customer_id, pro_id, service_pros(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const proUserId = (booking.service_pros as { user_id?: string })?.user_id;
    const isCustomer = booking.customer_id === user.id;
    const isPro = proUserId === user.id;

    if (!isCustomer && !isPro) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await admin.from('booking_issues').insert({
      booking_id: id,
      user_id: user.id,
      issue_type: issueType,
      notes: typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : null,
    });

    if (error) {
      console.error('booking_issues insert failed:', error);
      return NextResponse.json({ error: 'Failed to report issue' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Booking issues API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
