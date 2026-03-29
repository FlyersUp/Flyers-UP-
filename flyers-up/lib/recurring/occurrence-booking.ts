import type { SupabaseClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import { getOccupationFeeProfile } from '@/lib/bookings/fee-rules';
import { resolveUrgency } from '@/lib/bookings/urgency';
import { findScheduleConflict } from '@/lib/recurring/conflicts';

const GENERATABLE_OCCURRENCE_STATUSES = new Set(['scheduled', 'pending_confirmation', 'confirmed']);

export type GenerateOccurrenceBookingResult =
  | { ok: true; bookingId: string; alreadyExisted?: boolean }
  | { ok: false; code: string; message: string };

/**
 * Creates a one-off booking row for a recurring occurrence (idempotent via unique recurring_occurrence_id).
 * Safe when series is inactive: returns a clear error without writing.
 */
export async function generateBookingFromOccurrence(
  admin: SupabaseClient,
  occurrenceId: string
): Promise<GenerateOccurrenceBookingResult> {
  const { data: occRow, error: occErr } = await admin
    .from('recurring_occurrences')
    .select(
      `
      id,
      recurring_series_id,
      customer_user_id,
      pro_user_id,
      scheduled_start_at,
      scheduled_end_at,
      status,
      booking_id,
      recurring_series (
        id,
        status,
        occupation_slug,
        timezone,
        duration_minutes,
        end_date
      )
    `
    )
    .eq('id', occurrenceId)
    .maybeSingle();

  if (occErr || !occRow) {
    return { ok: false, code: 'not_found', message: 'Occurrence not found' };
  }

  const occ = occRow as Record<string, unknown>;
  const series = occ.recurring_series as Record<string, unknown> | null;
  if (!series) {
    return { ok: false, code: 'no_series', message: 'Series missing' };
  }

  if (String(series.status) !== 'approved') {
    return { ok: false, code: 'series_inactive', message: 'Recurring plan is not active' };
  }

  if (!GENERATABLE_OCCURRENCE_STATUSES.has(String(occ.status))) {
    return { ok: false, code: 'occurrence_ineligible', message: 'Occurrence cannot be booked' };
  }

  const existingBid = occ.booking_id as string | null;
  if (existingBid) {
    return { ok: true, bookingId: existingBid, alreadyExisted: true };
  }

  const { data: dup } = await admin.from('bookings').select('id').eq('recurring_occurrence_id', occurrenceId).maybeSingle();
  if (dup?.id) {
    await admin.from('recurring_occurrences').update({ booking_id: dup.id, updated_at: new Date().toISOString() }).eq('id', occurrenceId);
    return { ok: true, bookingId: dup.id as string, alreadyExisted: true };
  }

  const endDate = series.end_date as string | null | undefined;
  const startUtc = String(occ.scheduled_start_at);
  if (endDate) {
    const endBoundary = DateTime.fromISO(`${endDate}T23:59:59.999`, {
      zone: String(series.timezone ?? 'America/New_York'),
    });
    const occStart = DateTime.fromISO(startUtc, { zone: 'utc' });
    if (endBoundary.isValid && occStart.isValid && occStart > endBoundary.toUTC()) {
      return { ok: false, code: 'past_series_end', message: 'Occurrence is after series end date' };
    }
  }

  const now = new Date();
  if (new Date(String(occ.scheduled_end_at)).getTime() <= now.getTime()) {
    return { ok: false, code: 'occurrence_past', message: 'Occurrence is in the past' };
  }

  const proUserId = String(occ.pro_user_id);
  const customerUserId = String(occ.customer_user_id);
  const { data: proRow } = await admin
    .from('service_pros')
    .select('id, user_id, starting_price, category_id')
    .eq('user_id', proUserId)
    .maybeSingle();

  if (!proRow?.id) {
    return { ok: false, code: 'no_pro', message: 'Service pro not found' };
  }

  const proId = proRow.id as string;
  const conflict = await findScheduleConflict(admin, {
    proServiceId: proId,
    proUserId,
    startUtcIso: String(occ.scheduled_start_at),
    endUtcIso: String(occ.scheduled_end_at),
    excludeOccurrenceId: occurrenceId,
  });
  if (conflict) {
    return { ok: false, code: 'conflict', message: conflict.message };
  }

  let categorySlug: string | undefined;
  let categoryDisplayName: string | undefined;
  const catId = proRow.category_id as string | null | undefined;
  if (catId) {
    const { data: cat } = await admin.from('service_categories').select('slug, name').eq('id', catId).maybeSingle();
    categorySlug = cat?.slug ?? undefined;
    categoryDisplayName = typeof (cat as { name?: string } | null)?.name === 'string' ? String((cat as { name: string }).name).trim() : undefined;
  }

  const occupationSlug = String(series.occupation_slug ?? '').trim() || undefined;
  const feeProfile = getOccupationFeeProfile({
    occupationSlug,
    categorySlug,
    categoryName: categoryDisplayName,
  });

  const zone = String(series.timezone ?? 'America/New_York');
  const startLocal = DateTime.fromISO(startUtc, { zone: 'utc' }).setZone(zone);
  if (!startLocal.isValid) {
    return { ok: false, code: 'bad_time', message: 'Invalid occurrence time' };
  }
  const serviceDate = startLocal.toISODate()!;
  const serviceTime = startLocal.toFormat('HH:mm');
  const durationMinutes = Number(series.duration_minutes ?? 60);
  const estimatedEnd = DateTime.fromISO(String(occ.scheduled_end_at), { zone: 'utc' });

  const { data: lastAddr } = await admin
    .from('bookings')
    .select('address')
    .eq('customer_id', customerUserId)
    .eq('pro_id', proId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const address =
    typeof (lastAddr as { address?: string } | null)?.address === 'string' && (lastAddr as { address: string }).address.trim()
      ? (lastAddr as { address: string }).address.trim()
      : 'Address on file — please confirm with customer before visit';

  const basePriceCents = Math.round(Number((proRow as { starting_price?: number }).starting_price ?? 0) * 100);
  const totalDollars = basePriceCents / 100;
  const requestedAt = now.toISOString();
  const urgency = resolveUrgency({
    requestedAt,
    scheduledStartAt: startUtc,
  });

  const insertRow = {
    customer_id: customerUserId,
    pro_id: proId,
    service_date: serviceDate,
    service_time: serviceTime,
    booking_timezone: zone,
    scheduled_start_at: startUtc,
    scheduled_end_at: estimatedEnd.isValid ? estimatedEnd.toISO()! : DateTime.fromISO(startUtc, { zone: 'utc' }).plus({ minutes: durationMinutes }).toISO()!,
    estimated_duration_minutes: durationMinutes,
    duration_hours: durationMinutes / 60,
    address,
    notes: 'Recurring visit (generated from your approved plan)',
    status: 'requested' as const,
    status_history: [{ status: 'requested', at: requestedAt }],
    price: totalDollars,
    urgency,
    fee_profile: feeProfile,
    pricing_occupation_slug: occupationSlug ?? null,
    pricing_category_slug: categorySlug ?? null,
    is_recurring: true,
    recurring_series_id: String(series.id),
    recurring_occurrence_id: occurrenceId,
  };

  const { data: inserted, error: insErr } = await admin.from('bookings').insert(insertRow).select('id').maybeSingle();

  if (insErr) {
    if (insErr.code === '23505') {
      const { data: row } = await admin.from('bookings').select('id').eq('recurring_occurrence_id', occurrenceId).maybeSingle();
      if (row?.id) {
        await admin.from('recurring_occurrences').update({ booking_id: row.id, updated_at: requestedAt }).eq('id', occurrenceId);
        return { ok: true, bookingId: row.id as string, alreadyExisted: true };
      }
    }
    return { ok: false, code: 'insert_failed', message: insErr.message };
  }

  const bookingId = inserted?.id as string | undefined;
  if (!bookingId) {
    return { ok: false, code: 'no_id', message: 'Insert did not return id' };
  }

  await admin.from('recurring_occurrences').update({ booking_id: bookingId, updated_at: requestedAt }).eq('id', occurrenceId);

  return { ok: true, bookingId };
}
