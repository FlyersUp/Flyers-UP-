/**
 * POST /api/users/report
 * Report a user for inappropriate behavior (content moderation).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { isValidUserReportReason } from '@/lib/moderation/report-reasons';
import { appendTrustSafetyAudit } from '@/lib/trust-safety/auditLog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { reportedUserId?: string; reason?: string; context?: string; bookingId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const reportedUserId = normalizeUuidOrNull(body?.reportedUserId);
    if (!reportedUserId) return NextResponse.json({ error: 'Invalid reportedUserId' }, { status: 400 });

    const reasonRaw = String(body?.reason ?? '').trim();
    if (!isValidUserReportReason(reasonRaw)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    if (reportedUserId === user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    const contextRaw = typeof body?.context === 'string' ? body.context.trim().slice(0, 1000) : '';
    const context = contextRaw.length > 0 ? contextRaw : null;

    const admin = createAdminSupabaseClient();
    const { data: inserted, error } = await admin
      .from('user_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason: reasonRaw,
        context,
        booking_id: body?.bookingId ? normalizeUuidOrNull(body.bookingId) : null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error || !inserted?.id) {
      console.error('user_reports insert failed:', error);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    try {
      await appendTrustSafetyAudit(admin, {
        resource_type: 'user_report',
        resource_id: inserted.id as string,
        action: 'report_submitted',
        actor_user_id: user.id,
        details: { reason: reasonRaw, has_booking_id: Boolean(body?.bookingId) },
      });
    } catch (e) {
      console.error('[users/report] audit failed (report saved):', e);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('User report API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
