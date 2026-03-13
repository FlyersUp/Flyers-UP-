/**
 * Server-side booking status transition logic.
 * Used by PATCH /api/jobs/[jobId]/status and POST /api/bookings/[bookingId]/* endpoints.
 * Enforces: in_progress requires job_arrivals; awaiting_remaining_payment requires job_completions (2+ photos).
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from './supabaseServer';
import { isValidTransition } from '@/components/jobs/jobStatus';

type AllowedDbStatus = 'accepted' | 'pro_en_route' | 'in_progress' | 'awaiting_remaining_payment';

export async function transitionBookingStatus(
  bookingId: string,
  nextDbStatus: AllowedDbStatus
): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'unauthenticated' },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'pro') {
    return NextResponse.json(
      { error: 'Forbidden', code: 'not_authorized' },
      { status: 403 }
    );
  }

  const { data: proRow } = await supabase
    .from('service_pros')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!proRow?.id) {
    return NextResponse.json(
      { error: 'Pro profile not found' },
      { status: 403 }
    );
  }

  const proId = String(proRow.id);

  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select(
      'id, status, status_history, pro_id, accepted_at, en_route_at, on_the_way_at, started_at, completed_at'
    )
    .eq('id', bookingId)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json(
      { error: 'Booking not found' },
      { status: 404 }
    );
  }

  if (booking.pro_id !== proId) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'not_authorized' },
      { status: 403 }
    );
  }

  const currentDbStatus = String(booking.status);

  // in_progress: require job_arrivals (arrival verification) for pro_en_route/arrived
  if (nextDbStatus === 'in_progress' && ['pro_en_route', 'on_the_way', 'arrived'].includes(currentDbStatus)) {
    const admin = createAdminSupabaseClient();
    const { data: arrival } = await admin
      .from('job_arrivals')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (!arrival) {
      return NextResponse.json(
        {
          error: 'Arrival verification required before starting job',
          code: 'arrival_required',
          hint: 'Call POST /api/bookings/[id]/arrive with GPS coordinates first',
        },
        { status: 409 }
      );
    }
  }

  // awaiting_remaining_payment: require job_completions with 2+ photos
  if (nextDbStatus === 'awaiting_remaining_payment') {
    const admin = createAdminSupabaseClient();
    const { data: completion } = await admin
      .from('job_completions')
      .select('after_photo_urls')
      .eq('booking_id', bookingId)
      .maybeSingle();
    const urls = (completion as { after_photo_urls?: string[] } | null)?.after_photo_urls ?? [];
    if (!completion || urls.length < 2) {
      return NextResponse.json(
        {
          error: 'Job completion photos required before marking complete',
          code: 'completion_photos_required',
          hint: 'Call POST /api/bookings/[id]/complete with at least 2 after photos',
        },
        { status: 409 }
      );
    }
  }

  if (!isValidTransition(currentDbStatus, nextDbStatus)) {
    return NextResponse.json(
      {
        error: 'Invalid transition',
        code: 'invalid_transition',
        currentStatus: currentDbStatus,
        message: `Cannot transition to ${nextDbStatus} from ${currentDbStatus}.`,
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const history = (booking.status_history as { status: string; at: string }[]) ?? [];
  const newHistory = [...history, { status: nextDbStatus, at: now }];

  const update: Record<string, unknown> = {
    status: nextDbStatus,
    status_history: newHistory,
    status_updated_at: now,
    status_updated_by: user.id,
  };

  if (nextDbStatus === 'accepted') update.accepted_at = now;
  else if (nextDbStatus === 'pro_en_route') update.en_route_at = now;
  else if (nextDbStatus === 'in_progress') update.started_at = now;
  else if (nextDbStatus === 'awaiting_remaining_payment') update.completed_at = now;

  const { data: updated, error: updateErr } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', bookingId)
    .eq('pro_id', proId)
    .select()
    .single();

  if (updateErr) {
    console.error('Booking status update failed:', updateErr);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      booking: {
        id: updated.id,
        status: updated.status,
        status_history: updated.status_history,
        accepted_at: updated.accepted_at,
        en_route_at: updated.en_route_at ?? updated.on_the_way_at,
        started_at: updated.started_at,
        completed_at: updated.completed_at,
      },
    },
    { status: 200 }
  );
}
