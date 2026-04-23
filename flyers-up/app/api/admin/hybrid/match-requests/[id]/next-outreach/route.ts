import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { loadRankedCandidatesForMatchRequest } from '@/lib/marketplace/loadMatchRequestCandidates';
import {
  DEFAULT_OUTREACH_CAP,
  pickNextOutreachProId,
  type OutreachLogLite,
} from '@/lib/marketplace/matchOutreachGuards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST — enqueue outreach for the next ranked pro (sequential, cap + pending TTL).
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: matchRequestId } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: mr, error: mrErr } = await admin.from('match_requests').select('*').eq('id', matchRequestId).maybeSingle();
  if (mrErr || !mr) {
    return Response.json({ ok: false, error: 'Match request not found' }, { status: 404 });
  }

  const row = mr as Record<string, unknown>;
  const occupationSlug = String(row.occupation_slug ?? '').trim();
  const boroughSlug = String(row.borough_slug ?? '').trim();
  const urgency = (row.urgency as 'asap' | 'today' | 'flexible' | undefined) ?? 'flexible';
  const cap = Math.max(1, Math.min(20, Number(row.outreach_cap ?? DEFAULT_OUTREACH_CAP) || DEFAULT_OUTREACH_CAP));

  const { data: log } = await admin
    .from('match_outreach_log')
    .select('pro_id, outreach_status, sent_at, responded_at')
    .eq('match_request_id', matchRequestId);

  const outreach = (log ?? []) as OutreachLogLite[];

  const ranked = await loadRankedCandidatesForMatchRequest(admin, {
    occupationSlug,
    boroughSlug,
    urgency,
    limit: 40,
  });
  const rankedIds = ranked.map((r) => r.proId);
  const nextId = pickNextOutreachProId(rankedIds, outreach, cap);
  if (!nextId) {
    return Response.json(
      { ok: false, error: 'No eligible next pro (cap reached, pending outreach, or exhausted list).' },
      { status: 409 }
    );
  }

  const nowIso = new Date().toISOString();
  const { error: insErr } = await admin.from('match_outreach_log').insert({
    match_request_id: matchRequestId,
    pro_id: nextId,
    outreach_channel: 'manual',
    outreach_status: 'push_sent',
    notes: 'Next best candidate (automated pick)',
    created_by_user_id: user.id,
    sent_at: nowIso,
  });

  if (insErr) {
    console.error('[next-outreach]', insErr);
    return Response.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  await admin
    .from('match_requests')
    .update({ status: 'offer_sent', updated_at: nowIso })
    .eq('id', matchRequestId);

  return Response.json({ ok: true, proId: nextId });
}
