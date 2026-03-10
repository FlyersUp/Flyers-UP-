/**
 * POST /api/users/report
 * Report a user for inappropriate behavior (content moderation).
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_REASONS = [
  'harassment',
  'spam',
  'inappropriate_content',
  'fraud',
  'safety_concern',
  'other',
] as const;

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { reportedUserId?: string; reason?: string; context?: string; bookingId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const reportedUserId = normalizeUuidOrNull(body?.reportedUserId);
    if (!reportedUserId) return NextResponse.json({ error: 'Invalid reportedUserId' }, { status: 400 });

    const reason = body?.reason;
    if (!reason || !VALID_REASONS.includes(reason as typeof VALID_REASONS[number])) {
      return NextResponse.json(
        { error: 'Invalid reason', allowed: VALID_REASONS },
        { status: 400 }
      );
    }

    if (reportedUserId === user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { error } = await admin.from('user_reports').insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      reason,
      context: typeof body?.context === 'string' ? body.context.trim().slice(0, 1000) : null,
      booking_id: body?.bookingId ? normalizeUuidOrNull(body.bookingId) : null,
    });

    if (error) {
      console.error('user_reports insert failed:', error);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('User report API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
