/**
 * POST /api/bookings/[bookingId]/milestones/[milestoneIndex]/confirm
 * Delegates to booking_milestone_confirm_atomic; notifies pro on first success only.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { milestoneRpcHttpStatus, parseMilestoneAtomicRpc } from '@/lib/bookings/milestone-rpc';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ bookingId: string; milestoneIndex: string }> }) {
  const { bookingId, milestoneIndex: mi } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  const index = parseInt(mi, 10);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: 'Invalid milestone index' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: rpcData, error: rpcErr } = await admin.rpc('booking_milestone_confirm_atomic', {
    p_booking_id: id,
    p_customer_id: user.id,
    p_milestone_index: index,
    p_actor_user_id: user.id,
  });

  if (rpcErr) {
    console.error('[milestone confirm] rpc', rpcErr);
    return NextResponse.json({ error: 'Milestone update failed', code: 'rpc_error' }, { status: 500 });
  }

  const parsed = parseMilestoneAtomicRpc(rpcData);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error ?? 'failed', code: parsed.error },
      { status: milestoneRpcHttpStatus(parsed.error) }
    );
  }

  if (!parsed.idempotent) {
    const { data: booking } = await admin.from('bookings').select('pro_id').eq('id', id).maybeSingle();
    const proId = (booking as { pro_id?: string } | null)?.pro_id;
    if (proId) {
      const { data: proRow } = await admin.from('service_pros').select('user_id').eq('id', proId).maybeSingle();
      const proUserId = (proRow as { user_id?: string } | null)?.user_id;
      if (proUserId) {
        void createNotificationEvent({
          userId: proUserId,
          type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
          bookingId: id,
          actorUserId: user.id,
          titleOverride: 'Customer confirmed a milestone',
          bodyOverride: 'The customer confirmed a completed milestone.',
          basePath: 'pro',
        });
      }
    }
  }

  return NextResponse.json({ ok: true, idempotent: parsed.idempotent === true });
}
