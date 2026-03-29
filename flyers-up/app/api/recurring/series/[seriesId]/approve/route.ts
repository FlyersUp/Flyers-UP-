import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireProService } from '@/lib/recurring/api-auth';
import { approveRecurringSeries } from '@/lib/recurring/series-actions';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId: raw } = await params;
  const seriesId = normalizeUuidOrNull(raw);
  if (!seriesId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const pr = await requireProService(admin, supabase);
  if (!pr.ok) return NextResponse.json({ error: pr.error }, { status: pr.status });

  const r = await approveRecurringSeries({
    admin,
    seriesId,
    proUserId: pr.userId,
    proServiceId: pr.serviceId,
    autoApproved: false,
  });

  if (!r.ok) return NextResponse.json({ error: r.message, code: r.code }, { status: r.code === 'conflict' ? 409 : 400 });

  const { data: s } = await admin.from('recurring_series').select('customer_user_id').eq('id', seriesId).maybeSingle();
  const cid = (s as { customer_user_id?: string } | null)?.customer_user_id;
  if (cid) {
    void createNotificationEvent({
      userId: cid,
      type: NOTIFICATION_TYPES.RECURRING_SERIES_APPROVED,
      actorUserId: pr.userId,
      entityType: 'recurring_series',
      entityId: seriesId,
      basePath: 'customer',
    });
  }

  return NextResponse.json({ ok: true });
}
