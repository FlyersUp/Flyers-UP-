import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { requireCustomerUser } from '@/lib/recurring/api-auth';
import { customerAcceptCounterAndApprove } from '@/lib/recurring/series-actions';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId: raw } = await params;
  const seriesId = normalizeUuidOrNull(raw);
  if (!seriesId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminSupabaseClient();
  const { data: proSvc } = await admin
    .from('recurring_series')
    .select('pro_user_id')
    .eq('id', seriesId)
    .maybeSingle();
  const puid = (proSvc as { pro_user_id?: string } | null)?.pro_user_id;
  if (!puid) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: sp } = await admin.from('service_pros').select('id').eq('user_id', puid).maybeSingle();
  const proServiceId = sp?.id as string | undefined;
  if (!proServiceId) return NextResponse.json({ error: 'Pro service not found' }, { status: 500 });

  const r = await customerAcceptCounterAndApprove({
    admin,
    seriesId,
    customerUserId: auth.userId,
    proServiceId,
  });

  if (!r.ok) {
    return NextResponse.json({ error: r.message, code: r.code }, { status: r.code === 'conflict' ? 409 : 400 });
  }

  void createNotificationEvent({
    userId: puid,
    type: NOTIFICATION_TYPES.RECURRING_SERIES_APPROVED,
    actorUserId: auth.userId,
    entityType: 'recurring_series',
    entityId: seriesId,
    basePath: 'pro',
    titleOverride: 'Customer accepted your counter',
    bodyOverride: 'The recurring plan is now approved.',
  });

  return NextResponse.json({ ok: true });
}
