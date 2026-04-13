/**
 * POST /api/admin/payout-review/[id]
 * Admin action: approve (releases payout), keep_on_hold, deny, or escalate.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import {
  runAdminApprovePayoutRelease,
  runAdminKeepPayoutOnHold,
} from '@/lib/bookings/payment-lifecycle-service';
import { PAYOUT_REVIEW_QUEUE_OPEN_STATUSES } from '@/lib/admin/payout-review-queue-status';
import { isAdminUser } from '@/lib/admin/server-admin-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isAdminUser(supabase, user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const notes = body.notes as string | undefined;
  const holdReason = body.holdReason as string | undefined;
  const internalNote = body.internalNote as string | undefined;

  if (!['approve', 'deny', 'escalate', 'keep_on_hold'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { data: row, error: fetchErr } = await admin
    .from('payout_review_queue')
    .select('id, booking_id, status')
    .eq('id', id)
    .in('status', [...PAYOUT_REVIEW_QUEUE_OPEN_STATUSES])
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Not found or not in an open review state' }, { status: 404 });
  }

  const bookingId = String((row as { booking_id: string }).booking_id);

  if (action === 'approve') {
    const out = await runAdminApprovePayoutRelease(admin, { bookingId, actorUserId: user.id });
    if (!out.ok) {
      return NextResponse.json(
        { ok: false, error: out.code ?? 'release_failed', transferId: out.transferId ?? null },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, status: 'approved' });
  }

  if (action === 'keep_on_hold') {
    const out = await runAdminKeepPayoutOnHold(admin, {
      bookingId,
      actorUserId: user.id,
      holdReason: holdReason ?? null,
      internalNote: internalNote ?? notes ?? null,
    });
    if (!out.ok) {
      return NextResponse.json({ ok: false, error: out.error ?? 'keep_on_hold_failed' }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      status: 'held',
      message: out.message ?? 'Payout remains on hold pending further review.',
    });
  }

  const newStatus = action === 'deny' ? 'rejected' : 'escalated';
  const detailsUpdate =
    action === 'escalate'
      ? { details: { escalated: true, escalated_at: new Date().toISOString(), notes: notes ?? '' } }
      : {};

  const { error: updateErr } = await admin
    .from('payout_review_queue')
    .update({
      status: newStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      ...detailsUpdate,
    })
    .eq('id', id);

  if (updateErr) {
    console.error('[admin/payout-review] update failed', updateErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  if (action === 'deny') {
    await admin.from('bookings').update({ requires_admin_review: false }).eq('id', bookingId);
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
