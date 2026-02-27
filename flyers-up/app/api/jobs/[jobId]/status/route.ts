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
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import {
  apiNextStatusToDb,
  isValidTransition,
  type NextStatusAction,
} from '@/components/jobs/jobStatus';

export const runtime = 'nodejs';
export const preferredRegion = ['cle1'];
export const dynamic = 'force-dynamic';

const VALID_NEXT_STATUSES: NextStatusAction[] = [
  'ACCEPTED',
  'ON_THE_WAY',
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

    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select(
        'id, status, status_history, pro_id, payment_intent_id, accepted_at, en_route_at, on_the_way_at, started_at, completed_at, status_updated_at, status_updated_by'
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
    else if (nextDbStatus === 'in_progress') update.started_at = now;
    else if (nextDbStatus === 'completed_pending_payment') update.completed_at = now;

    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update(update)
      .eq('id', id)
      .eq('pro_id', proId)
      .select()
      .single();

    if (updateErr) {
      console.error('Job status update failed:', updateErr);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    if (nextDbStatus === 'completed_pending_payment') {
      const piId = (booking as { payment_intent_id?: string }).payment_intent_id;
      if (piId && stripe) {
        try {
          const pi = await stripe.paymentIntents.capture(piId);
          if (pi.status === 'succeeded') {
            const admin = createAdminSupabaseClient();
            const paidNow = new Date().toISOString();
            const paidHistory = [...newHistory, { status: 'paid', at: paidNow }];
            await admin
              .from('bookings')
              .update({
                status: 'paid',
                status_history: paidHistory,
                paid_at: paidNow,
                payment_status: 'PAID',
              })
              .eq('id', id);
            const { data: final } = await admin.from('bookings').select('id, status, status_history, completed_at, paid_at').eq('id', id).single();
            return NextResponse.json(
              {
                job: {
                  id: final?.id ?? updated.id,
                  status: final?.status ?? 'paid',
                  status_history: final?.status_history ?? paidHistory,
                  accepted_at: updated.accepted_at,
                  en_route_at: updated.en_route_at ?? updated.on_the_way_at,
                  started_at: updated.started_at,
                  completed_at: final?.completed_at ?? updated.completed_at,
                  paid_at: final?.paid_at ?? paidNow,
                  status_updated_at: updated.status_updated_at,
                  status_updated_by: updated.status_updated_by,
                },
              },
              { status: 200 }
            );
          }
        } catch (captureErr) {
          console.error('Job status: Payment capture failed', captureErr);
        }
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
    console.error('Job status API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getAllowedNext(current: string): NextStatusAction | null {
  const map: Record<string, NextStatusAction> = {
    requested: 'ACCEPTED',
    pending: 'ACCEPTED',
    accepted: 'ON_THE_WAY',
    pro_en_route: 'IN_PROGRESS',
    on_the_way: 'IN_PROGRESS',
    in_progress: 'COMPLETED',
  };
  return map[current] ?? null;
}
