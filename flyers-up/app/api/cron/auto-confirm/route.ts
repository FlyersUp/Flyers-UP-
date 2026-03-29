/**
 * Cron: auto-confirm
 * Auto-confirms bookings when customer hasn't confirmed by auto_confirm_at
 * and remaining is paid. Uses isAutoConfirmAllowed for stricter rules.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createSupabaseAdmin } from '@/lib/supabase/server-admin';
import { createNotification } from '@/lib/notify/create-notification';
import { isAutoConfirmAllowed } from '@/lib/bookings/auto-confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: candidates, error } = await admin
    .from('bookings')
    .select(
      'id, customer_id, pro_id, dispute_open, cancellation_reason, suspicious_completion, arrived_at, arrival_verified, started_at, completed_at, is_multi_day, service_pros(user_id, category_id)'
    )
    .eq('status', 'awaiting_customer_confirmation')
    .is('confirmed_by_customer_at', null)
    .lt('auto_confirm_at', now)
    .not('paid_remaining_at', 'is', null);

  if (error) {
    console.error('[cron/auto-confirm] query failed', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  let confirmed = 0;
  for (const b of candidates ?? []) {
    let categorySlug: string | null = null;
    const catId = (b.service_pros as { category_id?: string } | null)?.category_id;
    if (catId) {
      const { data: cat } = await admin.from('service_categories').select('slug').eq('id', catId).maybeSingle();
      categorySlug = (cat as { slug?: string } | null)?.slug ?? null;
    }

    const { data: incidents } = await admin
      .from('pro_booking_incidents')
      .select('id')
      .eq('booking_id', b.id)
      .limit(1);
    const hasLatenessIncident = (incidents?.length ?? 0) > 0;

    const { data: rel } = await admin
      .from('pro_reliability')
      .select('reliability_score')
      .eq('pro_id', b.pro_id)
      .maybeSingle();

    const { data: jc } = await admin
      .from('job_completions')
      .select('after_photo_urls, before_photo_urls')
      .eq('booking_id', b.id)
      .maybeSingle();

    const allowed = isAutoConfirmAllowed({
      booking: {
        dispute_open: (b as { dispute_open?: boolean }).dispute_open,
        cancellation_reason: (b as { cancellation_reason?: string | null }).cancellation_reason ?? null,
        suspicious_completion: (b as { suspicious_completion?: boolean }).suspicious_completion,
        arrived_at: (b as { arrived_at?: string | null }).arrived_at ?? null,
        arrival_verified: (b as { arrival_verified?: boolean }).arrival_verified,
        started_at: (b as { started_at?: string | null }).started_at ?? null,
        completed_at: (b as { completed_at?: string | null }).completed_at ?? null,
        category_slug: categorySlug,
      },
      proReliability: rel,
      hasLatenessIncidentOnBooking: hasLatenessIncident,
      jobCompletion: jc,
    });

    if (!allowed.allowed) continue;

    const isMulti = (b as { is_multi_day?: boolean }).is_multi_day === true;
    const { error: updErr } = await admin
      .from('bookings')
      .update({
        status: 'completed',
        confirmed_by_customer_at: now,
        ...(isMulti
          ? {
              final_confirmed_at: now,
              final_confirmation_source: 'auto',
              progress_status: 'completed',
            }
          : {}),
      })
      .eq('id', b.id)
      .eq('status', 'awaiting_customer_confirmation');

    if (updErr) continue;

    await admin.from('booking_events').insert({
      booking_id: b.id,
      type: 'AUTO_CONFIRMED',
      data: {},
    });

    await createNotification({
      userId: b.customer_id,
      bookingId: b.id,
      type: 'booking_auto_confirmed',
      title: 'Booking auto-confirmed',
      body: 'Booking auto-confirmed after 24h — thanks!',
    });

    const proUserId = (b.service_pros as { user_id?: string })?.user_id;
    if (proUserId) {
      await createNotification({
        userId: proUserId,
        bookingId: b.id,
        type: 'booking_auto_confirmed',
        title: 'Booking auto-confirmed',
        body: 'Booking auto-confirmed — payout releasing',
      });
    }
    confirmed++;
  }

  return NextResponse.json({ confirmed, total: candidates?.length ?? 0 });
}
