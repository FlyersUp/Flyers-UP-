import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ADD_INFO_STATUSES = ['submitted', 'under_review', 'waiting_for_pro'] as const;

async function getAuthedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

function normalizeStatus(
  issueStatus: string | null,
  decision: string | null
): { status: 'submitted' | 'under_review' | 'waiting_for_pro' | 'resolved'; resolutionOutcome: 'refund' | 'partial_refund' | 'denied' | null } {
  if (issueStatus === 'resolved') {
    if (decision === 'split_refund') return { status: 'resolved', resolutionOutcome: 'partial_refund' };
    if (decision === 'uphold_customer') return { status: 'resolved', resolutionOutcome: 'refund' };
    return { status: 'resolved', resolutionOutcome: 'denied' };
  }
  if (decision === 'request_evidence') return { status: 'waiting_for_pro', resolutionOutcome: null };
  if (decision === 'uphold_customer') return { status: 'resolved', resolutionOutcome: 'refund' };
  if (decision === 'split_refund') return { status: 'resolved', resolutionOutcome: 'partial_refund' };
  if (decision === 'uphold_pro') return { status: 'resolved', resolutionOutcome: 'denied' };
  if (issueStatus === 'waiting_for_pro') return { status: 'waiting_for_pro', resolutionOutcome: null };
  if (issueStatus === 'submitted') return { status: 'submitted', resolutionOutcome: null };
  return { status: 'under_review', resolutionOutcome: null };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string; issueId: string }> }
) {
  try {
    const { bookingId, issueId } = await params;
    const bookingUuid = normalizeUuidOrNull(bookingId);
    const issueUuid = normalizeUuidOrNull(issueId);
    if (!bookingUuid || !issueUuid) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminSupabaseClient();
    const { data: booking } = await admin
      .from('bookings')
      .select('id, customer_id, service_date, service_time, status, address, service_pros(id, user_id, display_name, category_id)')
      .eq('id', bookingUuid)
      .maybeSingle();

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const proUserId = (booking.service_pros as { user_id?: string } | null)?.user_id ?? null;
    if (booking.customer_id !== user.id && proUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: issue } = await admin
      .from('booking_issues')
      .select('id, booking_id, user_id, issue_type, notes, description, status, requested_resolution, resolution_outcome, status_reason, evidence_urls, created_at, updated_at, resolved_at')
      .eq('id', issueUuid)
      .eq('booking_id', bookingUuid)
      .maybeSingle();

    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });

    const { data: dispute } = await admin
      .from('booking_disputes')
      .select('id, admin_decision, admin_notes, pro_claim, customer_claim, created_at, updated_at, resolved_at')
      .eq('booking_id', bookingUuid)
      .maybeSingle();

    const { data: updates } = await admin
      .from('booking_issue_updates')
      .select('id, issue_id, author_user_id, author_role, message, attachment_urls, created_at')
      .eq('issue_id', issueUuid)
      .order('created_at', { ascending: true });

    let categoryName: string | null = null;
    const categoryId = (booking.service_pros as { category_id?: string } | null)?.category_id;
    if (categoryId) {
      const { data: category } = await admin
        .from('service_categories')
        .select('name')
        .eq('id', categoryId)
        .maybeSingle();
      categoryName = category?.name ?? null;
    }

    const normalized = normalizeStatus(issue.status ?? null, dispute?.admin_decision ?? null);

    return NextResponse.json(
      {
        ok: true,
        booking: {
          id: booking.id,
          serviceDate: booking.service_date,
          serviceTime: booking.service_time,
          status: booking.status,
          address: booking.address,
          proName: (booking.service_pros as { display_name?: string } | null)?.display_name ?? 'Pro',
          categoryName,
        },
        issue: {
          ...issue,
          status: normalized.status,
          resolution_outcome: issue.resolution_outcome ?? normalized.resolutionOutcome,
        },
        dispute: dispute ?? null,
        updates: updates ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Issue detail GET failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ bookingId: string; issueId: string }> }
) {
  try {
    const { bookingId, issueId } = await params;
    const bookingUuid = normalizeUuidOrNull(bookingId);
    const issueUuid = normalizeUuidOrNull(issueId);
    if (!bookingUuid || !issueUuid) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json().catch(() => null)) as
      | { addInfoMessage?: string; evidenceUrls?: string[] }
      | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const addInfoMessage =
      typeof body.addInfoMessage === 'string' && body.addInfoMessage.trim()
        ? body.addInfoMessage.trim().slice(0, 2000)
        : null;
    const evidenceUrls = Array.isArray(body.evidenceUrls)
      ? body.evidenceUrls
          .filter((u): u is string => typeof u === 'string')
          .map((u) => u.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    if (!addInfoMessage && evidenceUrls.length === 0) {
      return NextResponse.json({ error: 'Please add details or evidence.' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: issue } = await admin
      .from('booking_issues')
      .select('id, booking_id, user_id, status, evidence_urls')
      .eq('id', issueUuid)
      .eq('booking_id', bookingUuid)
      .maybeSingle();

    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    if (issue.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!ALLOWED_ADD_INFO_STATUSES.includes((issue.status ?? 'submitted') as (typeof ALLOWED_ADD_INFO_STATUSES)[number])) {
      return NextResponse.json({ error: 'This case can no longer be updated.' }, { status: 400 });
    }

    const mergedEvidence = [
      ...(((issue.evidence_urls as string[] | null) ?? []).filter(Boolean)),
      ...evidenceUrls,
    ].slice(0, 20);

    const { error: updateErr } = await admin
      .from('booking_issues')
      .update({
        evidence_urls: mergedEvidence,
        updated_at: new Date().toISOString(),
      })
      .eq('id', issueUuid);

    if (updateErr) return NextResponse.json({ error: 'Failed to update case.' }, { status: 500 });

    if (addInfoMessage || evidenceUrls.length > 0) {
      await admin.from('booking_issue_updates').insert({
        issue_id: issueUuid,
        booking_id: bookingUuid,
        author_user_id: user.id,
        author_role: 'customer',
        message: addInfoMessage ?? 'Added more evidence.',
        attachment_urls: evidenceUrls,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('Issue detail PATCH failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

