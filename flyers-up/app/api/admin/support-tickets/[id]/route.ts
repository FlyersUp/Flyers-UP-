/**
 * PATCH /api/admin/support-tickets/[id]
 * Admin: update ticket status and internal notes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { appendTrustSafetyAudit } from '@/lib/trust-safety/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TICKET_STATUSES = ['open', 'in_progress', 'resolved'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ticketId = normalizeUuidOrNull(id);
  if (!ticketId) {
    return NextResponse.json({ error: 'Invalid ticket id' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { status?: string; internal_notes?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status !== undefined) {
    const s = String(body.status).trim();
    if (!TICKET_STATUSES.includes(s as (typeof TICKET_STATUSES)[number])) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    update.status = s;
  }

  if (body.internal_notes !== undefined) {
    const n =
      body.internal_notes === null
        ? null
        : String(body.internal_notes).trim().slice(0, 8000) || null;
    update.internal_notes = n;
  }

  if (Object.keys(update).length <= 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: before, error: beforeErr } = await admin
    .from('support_tickets')
    .select('id, status, internal_notes')
    .eq('id', ticketId)
    .maybeSingle();

  if (beforeErr || !before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: row, error: upErr } = await admin
    .from('support_tickets')
    .update(update)
    .eq('id', ticketId)
    .select('id, status, internal_notes, updated_at')
    .maybeSingle();

  if (upErr) {
    console.error('[admin/support-tickets] update failed', upErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const actorId = user.id;
  if (body.status !== undefined && before.status !== row.status) {
    await appendTrustSafetyAudit(admin, {
      resource_type: 'support_ticket',
      resource_id: ticketId,
      action: 'status_changed',
      actor_user_id: actorId,
      details: { from: before.status, to: row.status },
    });
  }
  if (body.internal_notes !== undefined) {
    const prevN = before.internal_notes ?? null;
    const nextN = row.internal_notes ?? null;
    if (prevN !== nextN) {
      await appendTrustSafetyAudit(admin, {
        resource_type: 'support_ticket',
        resource_id: ticketId,
        action: 'internal_notes_updated',
        actor_user_id: actorId,
        details: { previous_length: prevN?.length ?? 0, new_length: nextN?.length ?? 0 },
      });
    }
  }

  return NextResponse.json({ ok: true, ticket: row });
}
