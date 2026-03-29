/**
 * POST /api/bookings/[bookingId]/milestones/[milestoneIndex]/start
 * Delegates to booking_milestone_start_atomic (row locks + single transaction).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { milestoneRpcHttpStatus, parseMilestoneAtomicRpc } from '@/lib/bookings/milestone-rpc';

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

  const { data: proRow } = await supabase.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  if (!proRow?.id) return NextResponse.json({ error: 'Pro not found' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: rpcData, error: rpcErr } = await admin.rpc('booking_milestone_start_atomic', {
    p_booking_id: id,
    p_service_pro_id: proRow.id,
    p_milestone_index: index,
    p_actor_user_id: user.id,
  });

  if (rpcErr) {
    console.error('[milestone start] rpc', rpcErr);
    return NextResponse.json({ error: 'Milestone update failed', code: 'rpc_error' }, { status: 500 });
  }

  const parsed = parseMilestoneAtomicRpc(rpcData);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error ?? 'failed', code: parsed.error },
      { status: milestoneRpcHttpStatus(parsed.error) }
    );
  }

  return NextResponse.json({ ok: true, milestoneIndex: index });
}
