import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { isProMatchableForOccupationBorough } from '@/lib/marketplace/proMatchable';
import { fetchSupplyTrustByProId } from '@/lib/marketplace/supplyTrustContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  proId: z.string().uuid(),
  bookingId: z.string().uuid().optional().nullable(),
  /** When true, sets status matched; otherwise candidate_selected for follow-up */
  finalize: z.boolean().optional(),
});

/**
 * POST — assign matched pro (+ optional booking link) for audit trail.
 * Idempotent when the same pro is already matched; blocks reassignment to a different pro.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: matchRequestId } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: mr, error: mrErr } = await admin.from('match_requests').select('*').eq('id', matchRequestId).maybeSingle();
  if (mrErr || !mr) {
    return Response.json({ ok: false, error: 'Match request not found' }, { status: 404 });
  }

  const row = mr as Record<string, unknown>;
  const existingStatus = String(row.status ?? '');
  const existingMatched = row.matched_pro_id != null ? String(row.matched_pro_id) : null;

  if (existingStatus === 'matched' && existingMatched && existingMatched !== parsed.data.proId) {
    return Response.json({ ok: false, error: 'Request already matched to another pro' }, { status: 409 });
  }
  if (existingStatus === 'matched' && existingMatched === parsed.data.proId) {
    return Response.json({ ok: true, status: 'matched', idempotent: true });
  }

  const boroughSlug = String(row.borough_slug ?? '').trim();

  const { data: pro, error: proErr } = await admin
    .from('service_pros')
    .select(
      `id, is_verified, is_paused, is_active_this_week, available, closed_at,
       last_confirmed_available_at, last_matched_at, recent_response_score,
       service_area_mode, service_area_values`
    )
    .eq('id', parsed.data.proId)
    .maybeSingle();

  if (proErr || !pro) {
    return Response.json({ ok: false, error: 'Pro not found' }, { status: 400 });
  }

  const p = pro as Record<string, unknown>;
  const trustMap = await fetchSupplyTrustByProId(admin, [parsed.data.proId]);
  const trust = trustMap.get(parsed.data.proId);
  const matchable = isProMatchableForOccupationBorough(
    {
      is_verified: Boolean(p.is_verified),
      is_paused: Boolean(p.is_paused),
      is_active_this_week: p.is_active_this_week != null ? Boolean(p.is_active_this_week) : false,
      available: p.available != null ? Boolean(p.available) : true,
      closed_at: p.closed_at != null ? String(p.closed_at) : null,
      last_confirmed_available_at: p.last_confirmed_available_at != null ? String(p.last_confirmed_available_at) : null,
      last_matched_at: p.last_matched_at != null ? String(p.last_matched_at) : null,
      recent_response_score: p.recent_response_score as number | string | null,
      service_area_mode: p.service_area_mode != null ? String(p.service_area_mode) : null,
      service_area_values: Array.isArray(p.service_area_values)
        ? (p.service_area_values as unknown[]).map((x) => String(x))
        : null,
    },
    boroughSlug,
    trust
  );

  if (!matchable) {
    return Response.json(
      {
        ok: false,
        error:
          'Pro is not matchable for this occupation/borough (paused, unverified, inactive, ghost/unresponsive, or area).',
      },
      { status: 400 }
    );
  }

  const bookingId = parsed.data.bookingId?.trim() || null;
  if (bookingId) {
    const { data: b } = await admin.from('bookings').select('id').eq('id', bookingId).maybeSingle();
    if (!b) {
      return Response.json({ ok: false, error: 'Booking not found' }, { status: 400 });
    }
  }

  const status = parsed.data.finalize === false ? 'candidate_selected' : 'matched';
  const nowIso = new Date().toISOString();

  const { data: updatedRows, error } = await admin
    .from('match_requests')
    .update({
      matched_pro_id: parsed.data.proId,
      booking_id: bookingId,
      matched_by_user_id: user.id,
      status,
      matched_at: status === 'matched' ? nowIso : (row.matched_at as string | null) ?? null,
      updated_at: nowIso,
    })
    .eq('id', matchRequestId)
    .neq('status', 'matched')
    .select('id, status, matched_pro_id')
    .maybeSingle();

  if (error) {
    console.error('[assign POST]', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!updatedRows) {
    const { data: cur } = await admin.from('match_requests').select('status, matched_pro_id').eq('id', matchRequestId).maybeSingle();
    const curRow = cur as { status?: string; matched_pro_id?: string | null } | null;
    if (curRow?.matched_pro_id === parsed.data.proId) {
      return Response.json({ ok: true, status: curRow.status ?? 'matched', idempotent: true });
    }
    return Response.json({ ok: false, error: 'Request was already matched or updated elsewhere' }, { status: 409 });
  }

  const { data: existingLog } = await admin
    .from('match_outreach_log')
    .select('id')
    .eq('match_request_id', matchRequestId)
    .eq('pro_id', parsed.data.proId)
    .maybeSingle();

  if (!existingLog) {
    const { error: logErr } = await admin.from('match_outreach_log').insert({
      match_request_id: matchRequestId,
      pro_id: parsed.data.proId,
      outreach_channel: 'manual',
      outreach_status: 'accepted',
      notes: bookingId ? `Assigned with booking ${bookingId}` : 'Direct assign',
      created_by_user_id: user.id,
      sent_at: nowIso,
      responded_at: nowIso,
    });
    if (logErr) {
      console.error('[assign POST] outreach log', logErr);
    }
  }

  return Response.json({ ok: true, status });
}
