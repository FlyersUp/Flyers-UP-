/**
 * Server-side booking status transition logic.
 * Used by PATCH /api/jobs/[jobId]/status and POST /api/bookings/[bookingId]/* endpoints.
 * Enforces: in_progress requires job_arrivals; awaiting_remaining_payment requires a job_completions row
 * (from POST .../complete — after photos optional for Version B).
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from './supabaseServer';
import { isValidTransition } from '@/components/jobs/jobStatus';
import {
  canProMarkBookingEnRoute,
  evaluateEnRouteScheduleGate,
  proEnRouteDepositBlockedResponse,
  proEnRouteScheduleBlockedResponse,
} from '@/lib/bookings/pro-en-route-readiness';
import { hasJobCompletionRowForAwaitingRemaining } from '@/lib/bookings/job-completion-awaiting-remaining-gate';

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
      'id, status, status_history, pro_id, accepted_at, en_route_at, on_the_way_at, started_at, completed_at, is_multi_day, paid_deposit_at, payment_status, amount_deposit, service_date, service_time, booking_timezone'
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
          hint: 'Call POST /api/bookings/[id]/arrive to record arrival first',
        },
        { status: 409 }
      );
    }
  }

  // awaiting_remaining_payment: require job_completions row (POST .../complete; photos optional)
  if (nextDbStatus === 'awaiting_remaining_payment') {
    const admin = createAdminSupabaseClient();
    const { data: completion } = await admin
      .from('job_completions')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();
    if (!hasJobCompletionRowForAwaitingRemaining(completion)) {
      return NextResponse.json(
        {
          error: 'Job completion must be recorded before this status',
          code: 'completion_required',
          hint: 'Call POST /api/bookings/[id]/complete first',
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

  if (nextDbStatus === 'pro_en_route') {
    const b = booking as {
      paid_deposit_at?: string | null;
      payment_status?: string | null;
      amount_deposit?: number | null;
      service_date?: string | null;
      service_time?: string | null;
      booking_timezone?: string | null;
    };
    if (
      !canProMarkBookingEnRoute({
        status: currentDbStatus,
        paid_deposit_at: b.paid_deposit_at ?? null,
        payment_status: b.payment_status ?? null,
        amount_deposit: b.amount_deposit ?? null,
      })
    ) {
      return NextResponse.json(proEnRouteDepositBlockedResponse(), { status: 409 });
    }
    const scheduleGate = evaluateEnRouteScheduleGate({
      service_date: String(b.service_date ?? ''),
      service_time: b.service_time ?? null,
      booking_timezone: b.booking_timezone ?? null,
    });
    if (!scheduleGate.ok) {
      return NextResponse.json(proEnRouteScheduleBlockedResponse(scheduleGate), { status: 409 });
    }
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
  else if (nextDbStatus === 'in_progress') {
    update.started_at = now;
    update.progress_status = 'work_started';
  } else if (nextDbStatus === 'awaiting_remaining_payment') update.completed_at = now;

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
