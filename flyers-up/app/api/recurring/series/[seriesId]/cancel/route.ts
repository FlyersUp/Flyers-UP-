import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { normalizeUuidOrNull } from '@/lib/isUuid';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId: raw } = await params;
  const seriesId = normalizeUuidOrNull(raw);
  if (!seriesId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: { cancellation_reason?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const reason = z.string().max(2000).optional().safeParse(body?.cancellation_reason).data;

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  const { data: row } = await admin
    .from('recurring_series')
    .select('customer_user_id, pro_user_id, status')
    .eq('id', seriesId)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const customerId = (row as { customer_user_id: string }).customer_user_id;
  const proUserId = (row as { pro_user_id: string }).pro_user_id;
  const st = String((row as { status: string }).status);
  if (st === 'canceled' || st === 'completed') {
    return NextResponse.json({ error: 'Already terminal' }, { status: 409 });
  }

  const now = new Date().toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: proSelf } = await admin.from('service_pros').select('id').eq('user_id', user.id).maybeSingle();
  const isProOnSeries = Boolean(proSelf?.id) && proUserId === user.id;
  const isCustomerOnSeries = customerId === user.id;

  if (!isProOnSeries && !isCustomerOnSeries) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (isProOnSeries) {
    const { error } = await admin
      .from('recurring_series')
      .update({ status: 'canceled', canceled_at: now, cancellation_reason: reason ?? 'pro', updated_at: now })
      .eq('id', seriesId)
      .eq('pro_user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    void createNotificationEvent({
      userId: customerId,
      type: NOTIFICATION_TYPES.RECURRING_SERIES_CANCELED,
      actorUserId: user.id,
      entityType: 'recurring_series',
      entityId: seriesId,
      basePath: 'customer',
      titleOverride: 'Recurring plan canceled',
      bodyOverride: 'The pro ended this recurring plan.',
    });
  } else {
    const { error } = await admin
      .from('recurring_series')
      .update({ status: 'canceled', canceled_at: now, cancellation_reason: reason ?? 'customer', updated_at: now })
      .eq('id', seriesId)
      .eq('customer_user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    void createNotificationEvent({
      userId: proUserId,
      type: NOTIFICATION_TYPES.RECURRING_SERIES_CANCELED,
      actorUserId: user.id,
      entityType: 'recurring_series',
      entityId: seriesId,
      basePath: 'pro',
      titleOverride: 'Recurring plan canceled',
      bodyOverride: 'The customer canceled the recurring plan.',
    });
  }

  await admin
    .from('recurring_occurrences')
    .update({ status: 'canceled', cancel_reason: 'series_canceled', updated_at: now })
    .eq('recurring_series_id', seriesId)
    .in('status', ['scheduled', 'pending_confirmation', 'reschedule_requested']);

  return NextResponse.json({ ok: true });
}
