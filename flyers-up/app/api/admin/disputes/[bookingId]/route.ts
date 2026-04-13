/**
 * GET /api/admin/disputes/[bookingId]
 * Fetch full dispute evidence for admin case view.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { isAdminUser } from '@/lib/admin/server-admin-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isAdminUser(supabase, user))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminSupabaseClient();

  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(`
      id, status, customer_id, pro_id, service_date, service_time, address,
      created_at, accepted_at, en_route_at, arrived_at, started_at, completed_at, cancelled_at,
      paid_deposit_at, paid_remaining_at, amount_deposit, amount_remaining, total_amount_cents,
      cancellation_reason_code, canceled_by_user_id, canceled_at, refund_type, refund_amount_cents,
      policy_decision_snapshot, policy_explanation, strike_applied, manual_review_required,
      late_status, no_show_status, wait_timer_started_at, wait_timer_expires_at,
      evidence_bundle_id, status_history
    `)
    .eq('id', id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const { data: dispute } = await admin
    .from('booking_disputes')
    .select(
      'id, booking_id, dispute_reason_code, customer_claim, pro_claim, risk_flags, admin_decision, admin_notes, admin_user_id, resolved_at, created_at, updated_at'
    )
    .eq('booking_id', id)
    .maybeSingle();

  const { data: evidence } = booking.evidence_bundle_id
    ? await admin
        .from('evidence_bundles')
        .select(
          'id, booking_id, bundle_type, gps_arrival_lat, gps_arrival_lng, gps_arrival_at, chat_attempts, call_attempts, photo_urls, status_changes, completeness_score, created_at, updated_at'
        )
        .eq('id', booking.evidence_bundle_id)
        .maybeSingle()
    : { data: null };

  const { data: arrivals } = await admin
    .from('job_arrivals')
    .select(
      'id, booking_id, pro_id, arrival_lat, arrival_lng, arrival_timestamp, arrival_photo_url, location_verified, created_at'
    )
    .eq('booking_id', id)
    .maybeSingle();
  const { data: completions } = await admin
    .from('job_completions')
    .select(
      'id, booking_id, pro_id, after_photo_urls, completion_note, completed_at, share_count, created_at'
    )
    .eq('booking_id', id)
    .maybeSingle();
  const { data: contactAttempts } = await admin
    .from('contact_attempts')
    .select('id, booking_id, initiated_by, attempt_type, created_at')
    .eq('booking_id', id);
  const { data: events } = await admin
    .from('booking_events')
    .select('id, booking_id, type, data, created_at, actor_type, actor_id, old_status, new_status')
    .eq('booking_id', id)
    .order('created_at', { ascending: true });
  const { data: issues } = await admin
    .from('booking_issues')
    .select(
      'id, booking_id, user_id, issue_type, notes, created_at, status, description, evidence_urls, requested_resolution, resolution_outcome, status_reason, resolved_at, updated_at'
    )
    .eq('booking_id', id);

  const { data: customer } = booking.customer_id
    ? await admin.from('profiles').select('id, full_name, email').eq('id', booking.customer_id).maybeSingle()
    : { data: null };
  const { data: proRow } = booking.pro_id
    ? await admin.from('service_pros').select('id, display_name, user_id').eq('id', booking.pro_id).maybeSingle()
    : { data: null };
  const { data: proProfile } = proRow?.user_id
    ? await admin.from('profiles').select('id, full_name, email').eq('id', proRow.user_id).maybeSingle()
    : { data: null };

  const completenessScore = evidence?.completeness_score ?? 0;
  const missingEvidence: string[] = [];
  if (!arrivals && (booking.status === 'pro_en_route' || booking.status === 'arrived' || booking.status === 'in_progress')) missingEvidence.push('GPS arrival');
  if (!evidence?.chat_attempts?.length && booking.no_show_status) missingEvidence.push('Chat attempts');
  if (!evidence?.call_attempts?.length && booking.no_show_status) missingEvidence.push('Call attempts');

  return NextResponse.json({
    booking,
    dispute: dispute ?? null,
    evidence: evidence ?? null,
    arrivals: arrivals ?? null,
    completions: completions ?? null,
    contactAttempts: contactAttempts ?? [],
    events: events ?? [],
    issues: issues ?? [],
    customer: customer ?? null,
    pro: proRow ? { ...proRow, profile: proProfile } : null,
    completenessScore,
    missingEvidence,
  });
}
