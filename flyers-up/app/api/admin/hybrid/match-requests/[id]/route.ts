import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabaseServer';
import { isAdminUser } from '@/app/(app)/admin/_admin';
import { loadRankedCandidatesForMatchRequest } from '@/lib/marketplace/loadMatchRequestCandidates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await isAdminUser(supabase, user))) {
    return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const { data: mr, error } = await admin.from('match_requests').select('*').eq('id', id).maybeSingle();
  if (error || !mr) {
    return Response.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const row = mr as Record<string, unknown>;
  const customerId = String(row.customer_id);
  const { data: prof } = await admin.from('profiles').select('full_name, email, phone').eq('id', customerId).maybeSingle();

  const occupationSlug = String(row.occupation_slug);
  const boroughSlug = String(row.borough_slug);
  const urgency = (row.urgency as 'asap' | 'today' | 'flexible' | undefined) ?? 'flexible';
  const ranked = await loadRankedCandidatesForMatchRequest(admin, { occupationSlug, boroughSlug, urgency, limit: 20 });

  const { data: prosDetail } = await admin
    .from('service_pros')
    .select(
      'id, display_name, service_area_mode, service_area_values, is_verified, is_active_this_week, jobs_completed, last_matched_at, recent_response_score, manual_match_priority'
    )
    .in(
      'id',
      ranked.map((c) => c.proId)
    );

  const proMap = new Map((prosDetail ?? []).map((p) => [String((p as { id: string }).id), p]));

  const candidates = ranked.map((c) => ({
    ...c,
    pro: proMap.get(c.proId) ?? null,
  }));

  return Response.json({
    ok: true,
    request: row,
    customer: prof ?? null,
    candidates,
  });
}
