import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireProService } from '@/lib/recurring/api-auth';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const proposalSchema = z.object({
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'custom']).optional(),
  interval_count: z.number().int().min(1).max(52).optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  preferred_start_time: z.string().min(4).max(12).optional(),
  duration_minutes: z.number().int().min(15).max(24 * 60).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  timezone: z.string().min(3).max(80).optional(),
  pro_note: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId: raw } = await params;
  const seriesId = normalizeUuidOrNull(raw);
  if (!seriesId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = z
    .object({ counter_proposal: proposalSchema, pro_note: z.string().max(2000).optional() })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

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
  if (String((f as { status: string }).status) !== 'pending') {
    return NextResponse.json({ error: 'Only pending requests can be countered' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('recurring_series')
    .update({
      status: 'countered',
      counter_proposal: parsed.data.counter_proposal as Record<string, unknown>,
      pro_note: parsed.data.pro_note ?? null,
      updated_at: now,
    })
    .eq('id', seriesId)
    .eq('pro_user_id', pr.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cid = (f as { customer_user_id: string }).customer_user_id;
  if (cid) {
    void createNotificationEvent({
      userId: cid,
      type: NOTIFICATION_TYPES.RECURRING_SERIES_COUNTERED,
      actorUserId: pr.userId,
      entityType: 'recurring_series',
      entityId: seriesId,
      basePath: 'customer',
    });
  }

  return NextResponse.json({ ok: true });
}
