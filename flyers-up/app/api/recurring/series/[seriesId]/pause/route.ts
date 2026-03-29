import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireProService } from '@/lib/recurring/api-auth';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId: raw } = await params;
  const seriesId = normalizeUuidOrNull(raw);
  if (!seriesId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: { pause_reason?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const reason = z.string().max(2000).optional().safeParse(body?.pause_reason).data;

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const { data: f } = await admin
    .from('recurring_series')
    .select('customer_user_id, pro_user_id, status')
    .eq('id', seriesId)
    .maybeSingle();

  if (!f || (f as { pro_user_id: string }).pro_user_id !== pr.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (String((f as { status: string }).status) !== 'approved') {
    return NextResponse.json({ error: 'Only approved series can pause' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('recurring_series')
    .update({ status: 'paused', paused_at: now, pause_reason: reason ?? null, updated_at: now })
    .eq('id', seriesId)
    .eq('pro_user_id', pr.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin
    .from('recurring_occurrences')
    .update({ status: 'canceled', cancel_reason: 'series_paused', updated_at: now })
    .eq('recurring_series_id', seriesId)
    .in('status', ['scheduled', 'pending_confirmation', 'reschedule_requested']);

  const cid = (f as { customer_user_id: string }).customer_user_id;
  if (cid) {
    void createNotificationEvent({
      userId: cid,
      type: NOTIFICATION_TYPES.RECURRING_SERIES_PAUSED,
      actorUserId: pr.userId,
      entityType: 'recurring_series',
      entityId: seriesId,
      basePath: 'customer',
    });
  }

  return NextResponse.json({ ok: true });
}
