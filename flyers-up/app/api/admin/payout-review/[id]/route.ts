/**
 * POST /api/admin/payout-review/[id]
 * Admin action: approve (releases payout via shared server path), deny, or escalate.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { runAdminApprovePayoutRelease } from '@/lib/bookings/payment-lifecycle-service';

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

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const notes = body.notes as string | undefined;

  if (!['approve', 'deny', 'escalate'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { data: row, error: fetchErr } = await admin
    .from('payout_review_queue')
    .select('id, booking_id, status')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Not found or already processed' }, { status: 404 });
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

  const newStatus = action === 'deny' ? 'rejected' : 'pending';
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
