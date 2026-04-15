/**
 * POST: resolve or waive pro clawback remediation after a post–payout customer refund.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { isAdminUser } from '@/lib/admin/server-admin-access';
import { recordClawbackRemediationResolution } from '@/lib/bookings/refund-remediation';
import { logBookingPaymentEvent } from '@/lib/bookings/payment-lifecycle-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId: raw } = await params;
  const bookingId = normalizeUuidOrNull(raw);
  if (!bookingId) {
    return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { action?: string; internalNote?: string | null };
  try {
    body = (await req.json()) as { action?: string; internalNote?: string | null };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action === 'waive' ? 'waive' : body.action === 'resolve' ? 'resolve' : null;
  if (!action) {
    return NextResponse.json({ error: 'action must be resolve or waive' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: b } = await admin
    .from('bookings')
    .select('id, pro_clawback_remediation_status')
    .eq('id', bookingId)
    .maybeSingle();

  const row = b as { pro_clawback_remediation_status?: string } | null;
  if (!row) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
  if (row.pro_clawback_remediation_status !== 'open') {
    return NextResponse.json(
      { error: 'No open clawback remediation for this booking' },
      { status: 409 }
    );
  }

  const out = await recordClawbackRemediationResolution(admin, {
    bookingId,
    action,
    actorUserId: user.id,
    internalNote: body.internalNote ?? null,
  });

  if (!out.ok) {
    return NextResponse.json({ error: out.error ?? 'update_failed' }, { status: 500 });
  }

  await logBookingPaymentEvent(admin, {
    bookingId,
    eventType: 'pro_clawback_remediation_resolved',
    phase: 'refund',
    status: action,
    actorType: 'admin',
    actorUserId: user.id,
    metadata: { internal_note: body.internalNote ?? null },
  });

  return NextResponse.json({ ok: true, action });
}
