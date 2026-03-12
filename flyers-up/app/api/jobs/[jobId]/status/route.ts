/**
 * PATCH /api/jobs/[jobId]/status
 *
 * Pro Job Progress Controls - single endpoint for status transitions.
 *
 * VALID TRANSITIONS (enforced in order):
 *   requested → ACCEPTED (accepted)
 *   accepted → ON_THE_WAY (pro_en_route)
 *   pro_en_route → IN_PROGRESS (in_progress)
 *   in_progress → COMPLETED (completed_pending_payment)
 * (paid status is set by payment capture flow)
 *
 * TIMESTAMP COLUMNS (set on each transition):
 *   accepted_at, en_route_at, started_at, completed_at, status_updated_at, status_updated_by
 *
 * UI: Pro job detail page (app/pro/jobs/[jobId]/page.tsx) and timeline page
 * (app/pro/jobs/[jobId]/timeline/page.tsx) render JobNextAction which calls this API.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import {
  apiNextStatusToDb,
  isValidTransition,
  type NextStatusAction,
} from '@/components/jobs/jobStatus';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';
import type { NotificationType } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const VALID_NEXT_STATUSES: NextStatusAction[] = [
  'ACCEPTED',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const id = normalizeUuidOrNull(jobId);
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid job ID' },
        { status: 400 }
      );
    }

    let body: { nextStatus?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const nextStatus = body?.nextStatus;
    if (
      !nextStatus ||
      !VALID_NEXT_STATUSES.includes(nextStatus as NextStatusAction)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid nextStatus',
          allowedNextStatus: VALID_NEXT_STATUSES,
        },
        { status: 400 }
      );
    }

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
    const admin = createAdminSupabaseClient();

    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select(
        'id, status, status_history, pro_id, customer_id, payment_intent_id, accepted_at, en_route_at, on_the_way_at, started_at, completed_at, status_updated_at, status_updated_by'
      )
      .eq('id', id)
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
    const nextDbStatus = apiNextStatusToDb(nextStatus as NextStatusAction);

    // Job completion: COMPLETED requires job_completions with 2+ photos (payment release gate)
    if (nextDbStatus === 'awaiting_remaining_payment') {
      const { data: completion } = await admin
        .from('job_completions')
        .select('id, after_photo_urls')
        .eq('booking_id', id)
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

    // Arrival verification: IN_PROGRESS requires job_arrivals record for pro_en_route/arrived
    if (nextDbStatus === 'in_progress') {
      const { data: arrival } = await admin
        .from('job_arrivals')
        .select('id')
        .eq('booking_id', id)
        .maybeSingle();
      if (!arrival && ['pro_en_route', 'on_the_way', 'arrived'].includes(currentDbStatus)) {
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

    if (!isValidTransition(currentDbStatus, nextDbStatus)) {
      return NextResponse.json(
        {
          error: 'Invalid transition',
          code: 'invalid_transition',
          currentStatus: currentDbStatus,
          allowedNextStatus: getAllowedNext(currentDbStatus),
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
    else if (nextDbStatus === 'arrived') update.arrived_at = now;
    else if (nextDbStatus === 'in_progress') update.started_at = now;
    else if (nextDbStatus === 'awaiting_remaining_payment') {
      const nowDate = new Date();
      const in24h = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
      update.completed_at = now;
      update.completed_by_pro_at = now;
      update.remaining_due_at = in24h;
      update.auto_confirm_at = in24h;
    }

    let result = await admin
      .from('bookings')
      .update(update)
      .eq('id', id)
      .eq('pro_id', proId)
      .select()
      .single();

    // Fallback: if update fails due to missing columns, retry with minimal update
    if (result.error) {
      const errMsg = (result.error as { message?: string }).message ?? '';
      const isColumnError = errMsg.includes('does not exist') || (result.error as { code?: string }).code === 'PGRST204';
      if (isColumnError) {
        const minimalUpdate: Record<string, unknown> = {
          status: nextDbStatus,
          status_history: update.status_history,
          status_updated_at: update.status_updated_at,
          status_updated_by: update.status_updated_by,
        };
        if (nextDbStatus === 'accepted') minimalUpdate.accepted_at = now;
        else if (nextDbStatus === 'pro_en_route') minimalUpdate.on_the_way_at = now;
        else if (nextDbStatus === 'arrived') minimalUpdate.arrived_at = now;
        else if (nextDbStatus === 'in_progress') minimalUpdate.started_at = now;
        else if (nextDbStatus === 'awaiting_remaining_payment') minimalUpdate.completed_at = now;
        result = await admin
          .from('bookings')
          .update(minimalUpdate)
          .eq('id', id)
          .eq('pro_id', proId)
          .select()
          .single();
      }
    }

    if (result.error) {
      const updateErr = result.error;
      console.error('Job status update failed:', {
        code: (updateErr as { code?: string }).code,
        message: (updateErr as { message?: string }).message,
        details: (updateErr as { details?: string }).details,
        jobId: id,
        nextDbStatus,
      });
      return NextResponse.json(
        {
          error: 'Failed to update status',
          code: (updateErr as { code?: string }).code,
          details: (updateErr as { message?: string }).message,
        },
        { status: 500 }
      );
    }

    const updated = result.data;
    if (!updated) {
      console.error('Job status update returned no data', { jobId: id });
      return NextResponse.json({ error: 'Update succeeded but no data returned' }, { status: 500 });
    }

    const customerId = (booking as { customer_id?: string }).customer_id;
    const statusToType: Record<string, string> = {
      pro_en_route: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
      arrived: NOTIFICATION_TYPES.BOOKING_ON_THE_WAY,
      in_progress: NOTIFICATION_TYPES.BOOKING_STARTED,
      awaiting_remaining_payment: NOTIFICATION_TYPES.BOOKING_COMPLETED,
    };
    const statusOverrides: Record<string, { title: string; body: string }> = {
      pro_en_route: { title: 'Pro is on the way', body: 'Your pro is heading to your location.' },
      arrived: { title: 'Pro arrived', body: 'Your pro has arrived at your location.' },
      in_progress: { title: 'Job started', body: 'Your pro has started the job.' },
      awaiting_remaining_payment: { title: 'Pro finished', body: 'Pro finished — pay remaining to confirm' },
    };
    const notifType = statusToType[nextDbStatus];
    const override = statusOverrides[nextDbStatus];
    if (customerId && notifType && override) {
      void createNotificationEvent({
        userId: customerId,
        type: notifType as NotificationType,
        actorUserId: user.id,
        bookingId: id,
        titleOverride: override.title,
        bodyOverride: override.body,
        basePath: 'customer',
      });
    }

    if (nextDbStatus === 'awaiting_remaining_payment') {
      try {
        await admin.from('booking_events').insert({
          booking_id: id,
          type: 'WORK_COMPLETED_BY_PRO',
          data: {},
        });
        const { data: proRow } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
        const proUserId = (proRow as { user_id?: string } | null)?.user_id;
        if (proUserId) {
          void createNotificationEvent({
            userId: proUserId,
            type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
            actorUserId: user.id,
            bookingId: id,
            titleOverride: 'Marked complete',
            bodyOverride: 'Marked complete — awaiting customer payment/confirmation',
            basePath: 'pro',
          });
        }
      } catch (postErr) {
        console.error('Post-update (events/notify) failed:', postErr, { jobId: id });
      }
    }

    return NextResponse.json(
      {
        job: {
          id: updated.id,
          status: updated.status,
          status_history: updated.status_history,
          accepted_at: updated.accepted_at,
          en_route_at: updated.en_route_at ?? updated.on_the_way_at,
          started_at: updated.started_at,
          completed_at: updated.completed_at,
          status_updated_at: updated.status_updated_at,
          status_updated_by: updated.status_updated_by,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('Job status API error:', msg, stack ? { stack } : {});
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 }
    );
  }
}

function getAllowedNext(current: string): NextStatusAction | null {
  const map: Record<string, NextStatusAction> = {
    requested: 'ACCEPTED',
    pending: 'ACCEPTED',
    accepted: 'ON_THE_WAY',
    pro_en_route: 'ARRIVED',
    on_the_way: 'ARRIVED',
    arrived: 'IN_PROGRESS',
    in_progress: 'COMPLETED',
  };
  return map[current] ?? null;
}
