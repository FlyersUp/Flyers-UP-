/**
 * POST /api/admin/disputes/[bookingId]/resolve
 * Admin resolves a dispute with decision and optional actions.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_DECISIONS = ['uphold_customer', 'uphold_pro', 'split_refund', 'request_evidence'] as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  let body: { decision: string; admin_notes?: string; issue_strike?: boolean; freeze_payout?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const decision = body.decision;
  if (!VALID_DECISIONS.includes(decision as (typeof VALID_DECISIONS)[number])) {
    return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data: booking } = await admin
    .from('bookings')
    .select('id, pro_id, status, customer_id')
    .eq('id', id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const now = new Date();

  const { data: existingDispute } = await admin
    .from('booking_disputes')
    .select('id, risk_flags')
    .eq('booking_id', id)
    .maybeSingle();

  const existingFlags = (existingDispute as { risk_flags?: string[] } | null)?.risk_flags ?? [];
  const riskFlags = body.freeze_payout && !existingFlags.includes('payout_frozen')
    ? [...existingFlags, 'payout_frozen']
    : existingFlags;
  const disputePayload = {
    admin_decision: decision,
    admin_notes: body.admin_notes?.trim() || null,
    admin_user_id: user.id,
    resolved_at: decision !== 'request_evidence' ? now.toISOString() : null,
    updated_at: now.toISOString(),
    risk_flags: riskFlags,
  };

  if (existingDispute) {
    await admin.from('booking_disputes').update(disputePayload).eq('id', existingDispute.id);
  } else {
    await admin.from('booking_disputes').insert({
      booking_id: id,
      ...disputePayload,
      created_at: now.toISOString(),
    });
  }

  if (body.issue_strike && booking.pro_id) {
    const { data: pro } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
    if (pro?.user_id) {
      const { data: existing } = await admin
        .from('pro_safety_compliance_settings')
        .select('strike_count')
        .eq('pro_user_id', pro.user_id)
        .maybeSingle();
      const newCount = ((existing as { strike_count?: number })?.strike_count ?? 0) + 1;
      if (existing) {
        await admin.from('pro_safety_compliance_settings').update({ strike_count: newCount, updated_at: now.toISOString() }).eq('pro_user_id', pro.user_id);
      } else {
        await admin.from('pro_safety_compliance_settings').insert({
          pro_user_id: pro.user_id,
          guidelines_acknowledged: false,
          strike_count: newCount,
          updated_at: now.toISOString(),
          created_at: now.toISOString(),
        });
      }
    }
  }

  if (body.freeze_payout && booking.pro_id) {
    const { data: pro } = await admin.from('service_pros').select('user_id').eq('id', booking.pro_id).maybeSingle();
    if (pro?.user_id) {
      await admin
        .from('pro_tax_profiles')
        .upsert({ pro_user_id: pro.user_id, payouts_on_hold: true }, { onConflict: 'pro_user_id' });
    }
  }

  return NextResponse.json({
    ok: true,
    decision,
    resolvedAt: disputePayload.resolved_at,
  });
}
