/**
 * Deterministic concierge candidate ranking for admin review.
 * Keep weights in one place; tune after launch based on ops feedback.
 */

import {
  computeEffectiveActiveThisWeek,
  proServesBoroughForRanking,
  type ProMatchableSignals,
} from '@/lib/marketplace/proMatchable';

export interface MatchCandidateProRow {
  id: string;
  display_name: string;
  occupation_id: string | null;
  occupation_slug: string | null;
  service_area_mode: string | null;
  service_area_values: string[] | null;
  is_verified: boolean | null;
  is_active_this_week: boolean | null;
  is_paused: boolean | null;
  recent_response_score: number | string | null;
  jobs_completed: number | null;
  manual_match_priority: number | null;
  last_matched_at: string | null;
  last_confirmed_available_at?: string | null;
  available: boolean | null;
  closed_at: string | null;
}

export interface RankedMatchCandidate {
  proId: string;
  displayName: string;
  score: number;
  breakdown: {
    boroughMatch: number;
    occupationMatch: number;
    activeThisWeek: number;
    verified: number;
    response: number;
    loadPenalty: number;
    overloadPenalty: number;
    experience: number;
    manualPriority: number;
    fairnessPenalty: number;
    urgencyBoost: number;
  };
}

const W = {
  borough: 35,
  occupation: 40,
  activeWeek: 15,
  verified: 20,
  response: 15,
  loadPerJob: 2.4,
  completedPer10: 3,
  manualPriority: 4,
  fairnessPerDay: 0.18,
  /** Extra penalty when matched very recently (overload / fairness) */
  overloadRecentMatch: 22,
  urgencyAsapBoost: 18,
  urgencyTodayBoost: 8,
};

function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (Date.now() - t) / (1000 * 60 * 60 * 24));
}

function rowSignals(r: MatchCandidateProRow): ProMatchableSignals {
  return {
    is_verified: r.is_verified,
    is_paused: r.is_paused,
    is_active_this_week: r.is_active_this_week,
    available: r.available,
    closed_at: r.closed_at,
    last_confirmed_available_at: r.last_confirmed_available_at ?? null,
    last_matched_at: r.last_matched_at,
    recent_response_score: r.recent_response_score,
  };
}

export function rankMatchCandidates(
  rows: MatchCandidateProRow[],
  ctx: { occupationSlug: string; boroughSlug: string; urgency?: 'asap' | 'today' | 'flexible' },
  limit = 15
): RankedMatchCandidate[] {
  const occ = ctx.occupationSlug.trim();
  const boro = ctx.boroughSlug.trim();
  const urgency = ctx.urgency ?? 'flexible';

  const scored = rows.map((r): RankedMatchCandidate => {
    const boroughMatch = proServesBoroughForRanking(r.service_area_mode, r.service_area_values ?? [], boro)
      ? W.borough
      : 0;
    const occupationMatch = (r.occupation_slug ?? '').trim() === occ ? W.occupation : 0;
    const activeThisWeek = computeEffectiveActiveThisWeek(rowSignals(r)) ? W.activeWeek : 0;
    const verified = r.is_verified ? W.verified : 0;
    const rs = r.recent_response_score != null ? Number(r.recent_response_score) : null;
    let response = rs != null && !Number.isNaN(rs) ? Math.max(0, Math.min(1, rs)) * W.response : 0;
    if (urgency === 'asap') response *= 1.35;
    if (urgency === 'today') response *= 1.12;

    const jobs = Math.max(0, Number(r.jobs_completed ?? 0));
    const loadPenalty = Math.min(40, jobs) * W.loadPerJob;
    const experience = Math.min(30, Math.floor(jobs / 10) * W.completedPer10);
    const manualPriority = Math.max(0, Number(r.manual_match_priority ?? 0)) * W.manualPriority;
    const fairnessPenalty = Math.min(28, daysSince(r.last_matched_at) * W.fairnessPerDay);
    const daysSinceMatch = daysSince(r.last_matched_at);
    const overloadPenalty = daysSinceMatch < 2 ? W.overloadRecentMatch * (1 - daysSinceMatch / 2) : 0;

    let urgencyBoost = 0;
    if (urgency === 'asap' && boroughMatch > 0) urgencyBoost += W.urgencyAsapBoost;
    else if (urgency === 'today' && boroughMatch > 0) urgencyBoost += W.urgencyTodayBoost;

    const score =
      boroughMatch +
      occupationMatch +
      activeThisWeek +
      verified +
      response -
      loadPenalty -
      overloadPenalty +
      experience +
      manualPriority -
      fairnessPenalty +
      urgencyBoost;

    return {
      proId: r.id,
      displayName: r.display_name,
      score,
      breakdown: {
        boroughMatch,
        occupationMatch,
        activeThisWeek,
        verified,
        response,
        loadPenalty: -loadPenalty,
        overloadPenalty: -overloadPenalty,
        experience,
        manualPriority,
        fairnessPenalty: -fairnessPenalty,
        urgencyBoost,
      },
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
