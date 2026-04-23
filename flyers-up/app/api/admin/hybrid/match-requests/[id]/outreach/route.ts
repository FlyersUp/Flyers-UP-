import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { isProMatchableForOccupationBorough } from '@/lib/marketplace/proMatchable';
import { DEFAULT_OUTREACH_CAP, distinctProsContacted, type OutreachLogLite } from '@/lib/marketplace/matchOutreachGuards';
import { fetchSupplyTrustByProId } from '@/lib/marketplace/supplyTrustContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** One pro per request body — prevents spray-and-pray; use sequential outreach instead. */
const bodySchema = z.object({
  proIds: z.array(z.string().uuid()).length(1),
  channel: z.enum(['push', 'sms', 'manual']).default('manual'),
  initialStatus: z.enum(['push_sent', 'sms_sent', 'not_contacted']).default('push_sent'),
  notes: z.string().max(2000).optional().nullable(),
});

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
    return Response.json(
      {
        ok: false,
        error: 'Send exactly one pro per outreach call (spam guard).',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const admin = createAdminSupabaseClient();
  const { data: mr, error: mrErr } = await admin.from('match_requests').select('*').eq('id', matchRequestId).maybeSingle();
  if (mrErr || !mr) {
    return Response.json({ ok: false, error: 'Match request not found' }, { status: 404 });
  }

  const mrRow = mr as Record<string, unknown>;
  const boroughSlug = String(mrRow.borough_slug ?? '').trim();
  const cap = Math.max(1, Math.min(20, Number(mrRow.outreach_cap ?? DEFAULT_OUTREACH_CAP) || DEFAULT_OUTREACH_CAP));

  const { data: existingLog } = await admin
    .from('match_outreach_log')
    .select('pro_id, outreach_status, sent_at, responded_at')
    .eq('match_request_id', matchRequestId);

  const logRows = (existingLog ?? []) as OutreachLogLite[];

  const uniqueNew = [...new Set(parsed.data.proIds)];
  const already = new Set(logRows.map((r) => r.pro_id));
  const fresh = uniqueNew.filter((id) => !already.has(id));
  const projected = distinctProsContacted(logRows) + fresh.length;
  if (projected > cap) {
    return Response.json(
      {
        ok: false,
        error: `Outreach cap (${cap} pros) would be exceeded. Remaining slots: ${Math.max(0, cap - distinctProsContacted(logRows))}.`,
      },
      { status: 400 }
    );
  }

  if (fresh.length === 0) {
    return Response.json({ ok: false, error: 'This pro was already contacted on this request.' }, { status: 400 });
  }

  const proId = fresh[0]!;
  const { data: pros, error: proErr } = await admin
    .from('service_pros')
    .select(
      `id, is_verified, is_paused, is_active_this_week, available, closed_at,
       last_confirmed_available_at, last_matched_at, recent_response_score,
       service_area_mode, service_area_values`
    )
    .eq('id', proId)
    .maybeSingle();

  if (proErr || !pros) {
    return Response.json({ ok: false, error: `Pro not found: ${proId}` }, { status: 400 });
  }

  const trustByPro = await fetchSupplyTrustByProId(admin, [proId]);
  const trust = trustByPro.get(proId);
  const p = pros as Record<string, unknown>;
  const ok = isProMatchableForOccupationBorough(
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
  if (!ok) {
    return Response.json({ ok: false, error: `Pro is not matchable for outreach: ${proId}` }, { status: 400 });
  }

  const rows = [
    {
      match_request_id: matchRequestId,
      pro_id: proId,
      outreach_channel: parsed.data.channel,
      outreach_status: parsed.data.initialStatus,
      notes: parsed.data.notes ?? null,
      created_by_user_id: user.id,
      sent_at: new Date().toISOString(),
    },
  ];

  const { error } = await admin.from('match_outreach_log').insert(rows);
  if (error) {
    console.error('[outreach POST]', error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  await admin
    .from('match_requests')
    .update({ status: 'offer_sent', updated_at: new Date().toISOString() })
    .eq('id', matchRequestId);

  return Response.json({ ok: true, inserted: rows.length });
}
