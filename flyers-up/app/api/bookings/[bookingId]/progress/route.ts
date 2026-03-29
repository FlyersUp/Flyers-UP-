/**
 * GET /api/bookings/[bookingId]/progress
 * Customer or assigned pro: multi-day milestones + final confirmation summary.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { buildBookingProgressSummary } from '@/lib/bookings/milestone-workflow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const id = normalizeUuidOrNull(bookingId);
  if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select(
      'id, customer_id, pro_id, dispute_open, is_multi_day, progress_status, auto_confirm_window_hours, current_milestone_index, final_completion_requested_at, final_auto_confirm_at, final_confirmed_at, final_confirmation_source'
    )
    .eq('id', id)
    .maybeSingle();

  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  const customerId = (booking as { customer_id?: string }).customer_id;
  const proId = (booking as { pro_id?: string }).pro_id;
  const { data: proRow } = await admin.from('service_pros').select('user_id').eq('id', proId).maybeSingle();
  const proUserId = (proRow as { user_id?: string } | null)?.user_id;

  const isCustomer = customerId === user.id;
  const isPro = proUserId === user.id;
  if (!isCustomer && !isPro) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: milestones } = await admin
    .from('booking_milestones')
    .select(
      'milestone_index, title, description, amount_cents, status, started_at, completed_at, confirmation_due_at, confirmed_at, confirmation_source, proof_photos, proof_notes, dispute_open'
    )
    .eq('booking_id', id)
    .order('milestone_index', { ascending: true });

  const { data: events } = await admin
    .from('booking_progress_events')
    .select('id, milestone_id, actor_user_id, event_type, event_payload, created_at')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(30);

  const b = booking as {
    is_multi_day?: boolean;
    progress_status?: string | null;
    auto_confirm_window_hours?: number;
    current_milestone_index?: number | null;
    final_completion_requested_at?: string | null;
    final_auto_confirm_at?: string | null;
    final_confirmed_at?: string | null;
    final_confirmation_source?: string | null;
    dispute_open?: boolean;
  };

  const summary = buildBookingProgressSummary({
    isMultiDay: b.is_multi_day === true,
    progressStatus: b.progress_status ?? null,
    autoConfirmWindowHours: Number(b.auto_confirm_window_hours ?? 24) || 24,
    currentMilestoneIndex: b.current_milestone_index ?? null,
    milestones: milestones ?? [],
    finalCompletionRequestedAt: b.final_completion_requested_at ?? null,
    finalAutoConfirmAt: b.final_auto_confirm_at ?? null,
    finalConfirmedAt: b.final_confirmed_at ?? null,
    finalConfirmationSource: b.final_confirmation_source ?? null,
    disputeOpen: b.dispute_open === true,
  });

  return NextResponse.json({ summary, events: events ?? [] });
}
