/**
 * POST /api/bookings/[bookingId]/issues
 * Report a booking issue (customer dispute workflow).
 *
 * GET /api/bookings/[bookingId]/issues
 * List issues for a booking for participants.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ISSUE_TYPES = [
  'work_incomplete',
  'wrong_service',
  'pro_late',
  'damage_or_loss',
  'safety_concern',
  'billing_problem',
  'contact_support',
  'other',
] as const;

const VALID_REQUESTED_RESOLUTION = ['refund', 'partial_refund', 'redo_service', 'other'] as const;
const ELIGIBLE_STATUSES = [
  'completed',
  'completed_pending_payment',
  'awaiting_payment',
  'awaiting_remaining_payment',
  'awaiting_customer_confirmation',
  'paid',
  'fully_paid',
] as const;

function cleanText(input: unknown, max = 2000): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

async function getAuthedContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null as null };
  return { user };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = normalizeUuidOrNull(bookingId);
    if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

    const { user } = await getAuthedContext();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminSupabaseClient();
    const { data: booking } = await admin
      .from('bookings')
      .select('id, customer_id, pro_id, service_pros(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const proUserId = (booking.service_pros as { user_id?: string } | null)?.user_id ?? null;
    if (booking.customer_id !== user.id && proUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: issues, error } = await admin
      .from('booking_issues')
      .select('id, booking_id, issue_type, notes, description, status, requested_resolution, resolution_outcome, status_reason, evidence_urls, created_at, updated_at, resolved_at')
      .eq('booking_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to load issues' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, issues: issues ?? [] }, { status: 200 });
  } catch (err) {
    console.error('Booking issues GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const id = normalizeUuidOrNull(bookingId);
    if (!id) return NextResponse.json({ error: 'Invalid booking ID' }, { status: 400 });

    const { user } = await getAuthedContext();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: {
      issueType?: string;
      notes?: string;
      description?: string;
      evidenceUrls?: string[];
      requestedResolution?: string | null;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const issueType = body?.issueType;
    if (!issueType || !VALID_ISSUE_TYPES.includes(issueType as typeof VALID_ISSUE_TYPES[number])) {
      return NextResponse.json(
        { error: 'Invalid issueType', allowed: VALID_ISSUE_TYPES },
        { status: 400 }
      );
    }
    const requestedResolution = body?.requestedResolution ?? null;
    if (
      requestedResolution != null &&
      !VALID_REQUESTED_RESOLUTION.includes(
        requestedResolution as typeof VALID_REQUESTED_RESOLUTION[number]
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid requestedResolution', allowed: VALID_REQUESTED_RESOLUTION },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: booking } = await admin
      .from('bookings')
      .select('id, customer_id, pro_id, status, service_pros(user_id, display_name)')
      .eq('id', id)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const proUserId = (booking.service_pros as { user_id?: string } | null)?.user_id;
    const proDisplayName =
      (booking.service_pros as { display_name?: string } | null)?.display_name ?? 'your pro';
    const isCustomer = booking.customer_id === user.id;
    if (!isCustomer && proUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isCustomer) {
      return NextResponse.json({ error: 'Only customers can submit disputes' }, { status: 403 });
    }
    if (!ELIGIBLE_STATUSES.includes(booking.status as (typeof ELIGIBLE_STATUSES)[number])) {
      return NextResponse.json(
        { error: 'This booking is not eligible for dispute submission yet.' },
        { status: 400 }
      );
    }

    const notes = cleanText(body?.notes, 1000);
    const description = cleanText(body?.description, 3000);
    if (!description) {
      return NextResponse.json(
        { error: 'Please provide a short description of what happened.' },
        { status: 400 }
      );
    }
    const evidenceUrls = Array.isArray(body?.evidenceUrls)
      ? body.evidenceUrls
          .filter((u): u is string => typeof u === 'string')
          .map((u) => u.trim())
          .filter((u) => !!u)
          .slice(0, 8)
      : [];

    const { data: inserted, error } = await admin
      .from('booking_issues')
      .insert({
      booking_id: id,
      user_id: user.id,
      issue_type: issueType,
      notes,
      description,
      evidence_urls: evidenceUrls,
      requested_resolution: requestedResolution,
      status: 'submitted',
      status_reason: 'Case received. Our trust team will review shortly.',
      updated_at: new Date().toISOString(),
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.error('booking_issues insert failed:', error);
      return NextResponse.json({ error: 'Failed to report issue' }, { status: 500 });
    }

    await admin
      .from('booking_issue_updates')
      .insert({
        issue_id: inserted.id,
        booking_id: id,
        author_user_id: user.id,
        author_role: 'customer',
        message: description,
        attachment_urls: evidenceUrls,
      });

    await admin
      .from('booking_issue_updates')
      .insert({
        issue_id: inserted.id,
        booking_id: id,
        author_user_id: null,
        author_role: 'system',
        message: `We received your issue and will review it within 24-48 hours. We may reach out to ${proDisplayName} for context.`,
        attachment_urls: [],
      });

    const { data: existingDispute } = await admin
      .from('booking_disputes')
      .select('id')
      .eq('booking_id', id)
      .maybeSingle();

    if (!existingDispute) {
      await admin.from('booking_disputes').insert({
        booking_id: id,
        dispute_reason_code:
          issueType === 'work_incomplete' || issueType === 'wrong_service'
            ? 'work_quality'
            : issueType === 'pro_late'
              ? 'lateness'
              : issueType === 'billing_problem'
                ? 'payment'
                : 'other',
        customer_claim: description,
        admin_decision: 'pending',
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        ok: true,
        issueId: inserted.id,
        submittedAt: inserted.created_at,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Booking issues API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
