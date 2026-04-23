import type { SupabaseClient } from '@supabase/supabase-js';
import { rankMatchCandidates, type MatchCandidateProRow, type RankedMatchCandidate } from '@/lib/marketplace/rankMatchCandidates';
import { isProMatchableForOccupationBorough } from '@/lib/marketplace/proMatchable';
import { fetchSupplyTrustByProId } from '@/lib/marketplace/supplyTrustContext';

export async function loadRankedCandidatesForMatchRequest(
  admin: SupabaseClient,
  params: { occupationSlug: string; boroughSlug: string; urgency?: 'asap' | 'today' | 'flexible'; limit?: number }
): Promise<RankedMatchCandidate[]> {
  const occSlug = params.occupationSlug.trim();
  const { data: occ, error: occErr } = await admin.from('occupations').select('id').eq('slug', occSlug).maybeSingle();
  if (occErr || !occ?.id) return [];

  const { data: pros, error } = await admin
    .from('service_pros')
    .select(
      `id, display_name, occupation_id, service_area_mode, service_area_values,
       is_verified, is_active_this_week, is_paused, recent_response_score,
       jobs_completed, manual_match_priority, last_matched_at, last_confirmed_available_at,
       available, closed_at`
    )
    .eq('occupation_id', occ.id)
    .eq('available', true)
    .is('closed_at', null)
    .eq('is_paused', false)
    .eq('is_verified', true);

  if (error || !pros?.length) return [];

  const raw = pros as Record<string, unknown>[];
  const trustByPro = await fetchSupplyTrustByProId(
    admin,
    raw.map((p) => String(p.id))
  );

  const rows: MatchCandidateProRow[] = raw.map((p) => ({
    id: String(p.id),
    display_name: String(p.display_name ?? 'Pro'),
    occupation_id: p.occupation_id != null ? String(p.occupation_id) : null,
    occupation_slug: occSlug,
    service_area_mode: p.service_area_mode != null ? String(p.service_area_mode) : null,
    service_area_values: Array.isArray(p.service_area_values)
      ? (p.service_area_values as unknown[]).map((x) => String(x))
      : null,
    is_verified: Boolean(p.is_verified),
    is_active_this_week: p.is_active_this_week != null ? Boolean(p.is_active_this_week) : false,
    is_paused: p.is_paused != null ? Boolean(p.is_paused) : false,
    recent_response_score: p.recent_response_score as number | string | null,
    jobs_completed: p.jobs_completed != null ? Number(p.jobs_completed) : 0,
    manual_match_priority: p.manual_match_priority != null ? Number(p.manual_match_priority) : 0,
    last_matched_at: p.last_matched_at != null ? String(p.last_matched_at) : null,
    last_confirmed_available_at: p.last_confirmed_available_at != null ? String(p.last_confirmed_available_at) : null,
    available: p.available != null ? Boolean(p.available) : true,
    closed_at: p.closed_at != null ? String(p.closed_at) : null,
  }));

  const matchable = rows.filter((r) =>
    isProMatchableForOccupationBorough(
      {
        ...r,
        service_area_mode: r.service_area_mode,
        service_area_values: r.service_area_values,
      },
      params.boroughSlug,
      trustByPro.get(r.id)
    )
  );

  return rankMatchCandidates(
    matchable,
    { occupationSlug: occSlug, boroughSlug: params.boroughSlug, urgency: params.urgency },
    params.limit ?? 15
  );
}
