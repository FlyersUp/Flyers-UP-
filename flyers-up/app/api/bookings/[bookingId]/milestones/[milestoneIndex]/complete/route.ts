/**
 * POST /api/bookings/[bookingId]/milestones/[milestoneIndex]/complete
 * Delegates to booking_milestone_complete_atomic; notifies customer after success.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { parseProofPhotos } from '@/lib/bookings/milestone-workflow';
import { milestoneRpcHttpStatus, parseMilestoneAtomicRpc } from '@/lib/bookings/milestone-rpc';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ bookingId: string; milestoneIndex: string }> }) {
  const { bookingId, milestoneIndex: mi } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });
  const index = parseInt(mi, 10);
  if (!Number.isFinite(index) || index < 0) {
    return NextResponse.json({ error: 'Invalid milestone index' }, { status: 400 });
  }

  let body: { proof_photos?: unknown; proof_notes?: string | null };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const photos = parseProofPhotos(body.proof_photos);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: proRow } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  if (!proRow?.id) return NextResponse.json({ error: 'Pro not found' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: rpcData, error: rpcErr } = await admin.rpc('booking_milestone_complete_atomic', {
    p_booking_id: id,
    p_service_pro_id: proRow.id,
    p_milestone_index: index,
    p_proof_photos: photos,
    p_proof_notes: body.proof_notes?.trim() ?? null,
    p_actor_user_id: user.id,
  });

  if (rpcErr) {
    console.error('[milestone complete] rpc', rpcErr);
    return NextResponse.json({ error: 'Milestone update failed', code: 'rpc_error' }, { status: 500 });
  }

  const parsed = parseMilestoneAtomicRpc(rpcData);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error ?? 'failed', code: parsed.error },
      { status: milestoneRpcHttpStatus(parsed.error) }
    );
  }

  const { data: booking } = await admin.from('bookings').select('customer_id').eq('id', id).maybeSingle();
  const customerId = (booking as { customer_id?: string } | null)?.customer_id;
  if (customerId) {
    void createNotificationEvent({
      userId: customerId,
      type: NOTIFICATION_TYPES.BOOKING_COMPLETED,
      bookingId: id,
      actorUserId: user.id,
      titleOverride: 'Milestone ready for your confirmation',
      bodyOverride: 'Please confirm the completed step or report an issue.',
      basePath: 'customer',
    });
  }

  return NextResponse.json({
    ok: true,
    confirmationDueAt: parsed.confirmationDueAt ?? null,
  });
}
