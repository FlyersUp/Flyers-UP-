/**
 * POST /api/recurring/request — customer creates recurring series (pending; may auto-approve)
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { requireCustomerUser } from '@/lib/recurring/api-auth';
import { buildEligibilityForNewRequest, approveRecurringSeries } from '@/lib/recurring/series-actions';
import { createNotificationEvent } from '@/lib/notifications';
import { NOTIFICATION_TYPES } from '@/lib/notifications/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  pro_id: z.string().uuid(),
  occupation_slug: z.string().min(1).max(120),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'custom']),
  interval_count: z.number().int().min(1).max(52).optional().default(1),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  preferred_start_time: z.string().min(4).max(12),
  duration_minutes: z.number().int().min(15).max(24 * 60),
  timezone: z.string().min(3).max(80),
  customer_note: z.string().max(2000).optional(),
  /** When set, must belong to this pro; stored on the series for per-package recurring caps. */
  package_id: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const auth = await requireCustomerUser(supabase);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: proRow } = await admin.from('service_pros').select('id, user_id').eq('id', parsed.data.pro_id).maybeSingle();
  if (!proRow?.user_id) return NextResponse.json({ error: 'Pro not found' }, { status: 404 });

  const proUserId = proRow.user_id as string;

  let requestedPackageId: string | null = null;
  if (parsed.data.package_id) {
    const { data: pkg } = await admin
      .from('service_packages')
      .select('id, pro_user_id')
      .eq('id', parsed.data.package_id)
      .maybeSingle();
    if (!pkg || (pkg as { pro_user_id: string }).pro_user_id !== proUserId) {
      return NextResponse.json({ error: 'Invalid package for this pro' }, { status: 400 });
    }
    requestedPackageId = parsed.data.package_id;
  }

  const eligibility = await buildEligibilityForNewRequest({
    admin,
    customerUserId: auth.userId,
    proUserId,
    proServiceId: parsed.data.pro_id,
    occupationSlug: parsed.data.occupation_slug,
    timezone: parsed.data.timezone,
    startDate: parsed.data.start_date,
    preferredStartTime: parsed.data.preferred_start_time,
    durationMinutes: parsed.data.duration_minutes,
    daysOfWeek: parsed.data.days_of_week,
    frequency: parsed.data.frequency,
    intervalCount: parsed.data.interval_count,
    requestedPackageId,
  });

  if (!eligibility.recurringRequestAllowed) {
    return NextResponse.json(
      { error: 'Recurring request not allowed', reasons: eligibility.reasonsBlocked, eligibility },
      { status: 403 }
    );
  }

  const now = new Date().toISOString();
  const insertRow = {
    customer_user_id: auth.userId,
    pro_user_id: proUserId,
    occupation_slug: parsed.data.occupation_slug,
    frequency: parsed.data.frequency,
    interval_count: parsed.data.interval_count,
    days_of_week: parsed.data.days_of_week,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date ?? null,
    preferred_start_time: parsed.data.preferred_start_time,
    duration_minutes: parsed.data.duration_minutes,
    timezone: parsed.data.timezone,
    status: 'pending',
    requested_by_user_id: auth.userId,
    customer_note: parsed.data.customer_note ?? null,
    requested_package_id: requestedPackageId,
    recurring_slot_locked: true,
    is_flexible: false,
    created_at: now,
    updated_at: now,
  };

  const { data: series, error: insErr } = await admin.from('recurring_series').insert(insertRow).select('id, status').single();
  if (insErr || !series) {
    console.error('[recurring/request]', insErr);
    return NextResponse.json({ error: 'Could not create request' }, { status: 500 });
  }

  const seriesId = series.id as string;

  if (eligibility.autoApprovalAllowed) {
    const approved = await approveRecurringSeries({
      admin,
      seriesId,
      proUserId,
      proServiceId: parsed.data.pro_id,
      autoApproved: true,
    });
    if (approved.ok) {
      void createNotificationEvent({
        userId: auth.userId,
        type: NOTIFICATION_TYPES.RECURRING_SERIES_APPROVED,
        actorUserId: proUserId,
        entityType: 'recurring_series',
        entityId: seriesId,
        basePath: 'customer',
        titleOverride: 'Recurring plan auto-approved',
        bodyOverride: 'Your recurring schedule was approved automatically.',
      });
      return NextResponse.json({ ok: true, seriesId, status: 'approved', autoApproved: true, eligibility });
    }
  }

  void createNotificationEvent({
    userId: proUserId,
    type: NOTIFICATION_TYPES.RECURRING_REQUEST_NEW,
    actorUserId: auth.userId,
    entityType: 'recurring_series',
    entityId: seriesId,
    basePath: 'pro',
  });

  return NextResponse.json({ ok: true, seriesId, status: 'pending', autoApproved: false, eligibility });
}
