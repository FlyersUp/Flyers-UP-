/**
 * Cron: compute-pro-reputation
 * Computes and upserts pro_reputation from bookings, job_arrivals, etc.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/cron/auth';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authErr = requireCronSecret(req);
  if (authErr) return authErr;

  const admin = createAdminSupabaseClient();

  const { data: pros } = await admin
    .from('service_pros')
    .select('id, rating, review_count');

  let updated = 0;
  for (const pro of pros ?? []) {
    const proId = pro.id;

    const { data: completed } = await admin
      .from('bookings')
      .select('id, customer_id, service_date, service_time, started_at, scope_confirmed_at')
      .eq('pro_id', proId)
      .in('status', ['completed', 'paid', 'awaiting_customer_confirmation']);

    const jobsCompleted = completed?.length ?? 0;
    const avgRating = Number(pro.rating ?? 0) || 0;

    const { data: arrivals } = await admin
      .from('job_arrivals')
      .select('arrival_timestamp, booking_id')
      .eq('pro_id', proId);

    const { data: bookingsWithTimes } = await admin
      .from('bookings')
      .select('id, service_date, service_time, started_at')
      .eq('pro_id', proId)
      .in('status', ['completed', 'paid', 'awaiting_customer_confirmation', 'in_progress']);

    let onTimeCount = 0;
    let onTimeTotal = 0;
    for (const b of bookingsWithTimes ?? []) {
      const started = (b as { started_at?: string | null }).started_at;
      if (!started) continue;
      const scheduled = `${(b as { service_date?: string }).service_date}T${(b as { service_time?: string }).service_time}`;
      const scheduledMs = new Date(scheduled).getTime();
      const startedMs = new Date(started).getTime();
      const diffMins = (startedMs - scheduledMs) / 60000;
      onTimeTotal++;
      if (diffMins >= -15 && diffMins <= 15) onTimeCount++;
    }
    const onTimeRate = onTimeTotal > 0 ? (onTimeCount / onTimeTotal) * 100 : 95;

    const { data: adjustments } = await admin
      .from('price_adjustments')
      .select('booking_id')
      .eq('pro_id', proId);

    const adjustedBookingIds = new Set((adjustments ?? []).map((a) => a.booking_id));
    const scopeAccuracyTotal = jobsCompleted;
    const scopeAccuracyMiss = [...(completed ?? [])].filter((b) => adjustedBookingIds.has(b.id)).length;
    const scopeAccuracyRate = scopeAccuracyTotal > 0
      ? ((scopeAccuracyTotal - scopeAccuracyMiss) / scopeAccuracyTotal) * 100
      : 96;

    const { data: rebooks } = await admin
      .from('rebook_events')
      .select('customer_id')
      .eq('pro_id', proId);

    const uniqueRebookCustomers = new Set((rebooks ?? []).map((r) => r.customer_id)).size;
    const uniqueCompletedCustomers = new Set((completed ?? []).map((c) => (c as { customer_id?: string }).customer_id)).size;
    const repeatCustomerRate = uniqueCompletedCustomers > 0
      ? (uniqueRebookCustomers / uniqueCompletedCustomers) * 100
      : 40;

    const { data: accepted } = await admin
      .from('bookings')
      .select('id')
      .eq('pro_id', proId)
      .in('status', ['accepted', 'accepted_pending_payment', 'in_progress', 'completed', 'paid', 'awaiting_customer_confirmation', 'pro_en_route', 'on_the_way', 'arrived']);
    const acceptedCount = accepted?.length ?? 0;
    const completionRate = acceptedCount > 0 ? (jobsCompleted / acceptedCount) * 100 : 98;

    const { error } = await admin
      .from('pro_reputation')
      .upsert(
        {
          pro_id: proId,
          jobs_completed: jobsCompleted,
          average_rating: avgRating,
          on_time_rate: Math.round(onTimeRate * 100) / 100,
          scope_accuracy_rate: Math.round(scopeAccuracyRate * 100) / 100,
          repeat_customer_rate: Math.round(repeatCustomerRate * 100) / 100,
          completion_rate: Math.round(completionRate * 100) / 100,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'pro_id' }
      );

    if (!error) updated++;
  }

  return NextResponse.json({ updated, total: pros?.length ?? 0 });
}
