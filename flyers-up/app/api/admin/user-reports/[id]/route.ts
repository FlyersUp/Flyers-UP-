/**
 * PATCH /api/admin/user-reports/[id]
 * Admin: update report status and internal notes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { appendTrustSafetyAudit } from '@/lib/trust-safety/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPORT_STATUSES = ['pending', 'reviewed', 'escalated', 'dismissed'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const reportId = normalizeUuidOrNull(id);
  if (!reportId) {
    return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { status?: string; admin_notes?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    updated_at: now,
  };

  if (body.status !== undefined) {
    const s = String(body.status).trim();
    if (!REPORT_STATUSES.includes(s as (typeof REPORT_STATUSES)[number])) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    update.status = s;
    update.reviewed_at = s === 'pending' ? null : now;
  }

  if (body.admin_notes !== undefined) {
    const n =
      body.admin_notes === null
        ? null
        : String(body.admin_notes).trim().slice(0, 8000) || null;
    update.admin_notes = n;
  }

  if (Object.keys(update).length <= 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: before, error: beforeErr } = await admin
    .from('user_reports')
    .select('id, status, admin_notes')
    .eq('id', reportId)
    .maybeSingle();

  if (beforeErr || !before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: row, error: upErr } = await admin
    .from('user_reports')
    .update(update)
    .eq('id', reportId)
    .select('id, status, admin_notes, reviewed_at, updated_at')
    .maybeSingle();

  if (upErr) {
    console.error('[admin/user-reports] update failed', upErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const actorId = user.id;
  if (body.status !== undefined && before.status !== row.status) {
    await appendTrustSafetyAudit(admin, {
      resource_type: 'user_report',
      resource_id: reportId,
      action: 'status_changed',
      actor_user_id: actorId,
      details: { from: before.status, to: row.status },
    });
  }
  if (body.admin_notes !== undefined) {
    const prevN = before.admin_notes ?? null;
    const nextN = row.admin_notes ?? null;
    if (prevN !== nextN) {
      await appendTrustSafetyAudit(admin, {
        resource_type: 'user_report',
        resource_id: reportId,
        action: 'admin_notes_updated',
        actor_user_id: actorId,
        details: { previous_length: prevN?.length ?? 0, new_length: nextN?.length ?? 0 },
      });
    }
  }

  return NextResponse.json({ ok: true, report: row });
}
