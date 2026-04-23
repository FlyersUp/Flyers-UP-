/**
 * Single definition of "matchable" for gate counts, admin assignment, and customer lists.
 * Keep aligned with SQL: `service_pro_effective_active_this_week`, `service_pro_serves_borough_for_gate`,
 * `count_matchable_pros_for_occupation_borough`.
 */

import type { SupplyTrustContext } from '@/lib/marketplace/supplyTrustContext';

export const MATCHABLE_CONFIRM_LOOKBACK_DAYS = 7;
export const MATCHABLE_BOOKING_LOOKBACK_DAYS = 7;
export const MATCHABLE_OUTREACH_RESPONSE_LOOKBACK_DAYS = 7;

export type ProMatchableSignals = {
  is_verified: boolean | null;
  is_paused: boolean | null;
  is_active_this_week: boolean | null;
  available: boolean | null;
  closed_at: string | null;
  last_confirmed_available_at: string | null;
  last_matched_at: string | null;
  recent_response_score: number | string | null;
  /** Optional: last outreach response for this pro (any request), ISO */
  last_outreach_response_at?: string | null;
  /** Optional: most recent booking created_at for this pro, ISO */
  last_booking_created_at?: string | null;
};

function withinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

/** True when the pro should count as "active this week" for supply / assignment. */
export function computeEffectiveActiveThisWeek(s: ProMatchableSignals): boolean {
  if (s.is_active_this_week === true) return true;
  if (withinDays(s.last_confirmed_available_at, MATCHABLE_CONFIRM_LOOKBACK_DAYS)) return true;
  if (withinDays(s.last_matched_at, MATCHABLE_CONFIRM_LOOKBACK_DAYS)) return true;
  if (withinDays(s.last_outreach_response_at, MATCHABLE_OUTREACH_RESPONSE_LOOKBACK_DAYS)) return true;
  if (withinDays(s.last_booking_created_at, MATCHABLE_BOOKING_LOOKBACK_DAYS)) return true;
  const rs = s.recent_response_score != null ? Number(s.recent_response_score) : null;
  if (rs != null && !Number.isNaN(rs) && rs >= 0.35) return true;
  return false;
}

export function normBoroughToken(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-');
}

/**
 * Borough slice for the category gate: only explicit borough list counts.
 * Radius / zip-only pros are excluded from per-borough supply (avoids NYC-wide double counting).
 */
export function proServesBoroughForGate(
  serviceAreaMode: string | null | undefined,
  serviceAreaValues: string[] | null | undefined,
  boroughSlug: string
): boolean {
  const mode = (serviceAreaMode ?? 'radius').toLowerCase();
  if (mode !== 'boroughs' || !serviceAreaValues?.length) return false;
  const b = normBoroughToken(boroughSlug);
  return serviceAreaValues.some((v) => normBoroughToken(v) === b);
}

/** For customer marketplace cards: any mode can serve (legacy NYC-wide listing). */
export function proServesBoroughForRanking(
  serviceAreaMode: string | null | undefined,
  serviceAreaValues: string[] | null | undefined,
  boroughSlug: string
): boolean {
  const mode = (serviceAreaMode ?? 'radius').toLowerCase();
  if (mode === 'boroughs' && serviceAreaValues && serviceAreaValues.length > 0) {
    const b = normBoroughToken(boroughSlug);
    return serviceAreaValues.some((v) => normBoroughToken(v) === b);
  }
  return true;
}

export function isProMatchableCore(s: ProMatchableSignals): boolean {
  if (!s.is_verified) return false;
  if (s.is_paused === true) return false;
  if (s.available === false) return false;
  if (s.closed_at) return false;
  if (!computeEffectiveActiveThisWeek(s)) return false;
  return true;
}

/** ≥2 no_response outreach rows in 30d — same bar as SQL gate. */
export function isProChronicNoResponseForGate(trust: SupplyTrustContext): boolean {
  return trust.no_response_count_30d >= 2;
}

/**
 * Dormant "verified zombie": stale profile + no recent confirmations / jobs / outreach replies + weak score.
 * Matches `137_hybrid_supply_trust_outreach.sql` gate predicate.
 */
export function isProDormantSupplyGhost(
  trust: SupplyTrustContext,
  s: Pick<ProMatchableSignals, 'last_confirmed_available_at' | 'last_matched_at' | 'recent_response_score'>
): boolean {
  if (!trust.profile_updated_at) return false;
  if (withinDays(trust.profile_updated_at, 75)) return false;
  if (withinDays(s.last_confirmed_available_at, 30)) return false;
  if (withinDays(s.last_matched_at, 30)) return false;
  if (trust.had_booking_60d) return false;
  if (trust.had_outreach_response_60d) return false;
  const rs = s.recent_response_score != null ? Number(s.recent_response_score) : 0;
  if (!Number.isNaN(rs) && rs >= 0.22) return false;
  return true;
}

/** Matchable for category x borough gate counts and concierge shortlist. */
export function isProMatchableForOccupationBorough(
  s: ProMatchableSignals & {
    service_area_mode: string | null;
    service_area_values: string[] | null;
  },
  boroughSlug: string,
  /** When set, applies ghost + no-response filters aligned with SQL gate. */
  trust?: SupplyTrustContext
): boolean {
  if (!isProMatchableCore(s)) return false;
  if (!proServesBoroughForGate(s.service_area_mode, s.service_area_values, boroughSlug)) return false;
  if (trust) {
    if (isProChronicNoResponseForGate(trust)) return false;
    if (isProDormantSupplyGhost(trust, s)) return false;
  }
  return true;
}

/** Bookable / visible on customer marketplace (borough-agnostic). */
export function isProMatchableForCustomerListing(s: ProMatchableSignals): boolean {
  return isProMatchableCore(s);
}

export type ResponseSpeedTier = 'fast' | 'medium' | 'slow' | 'unknown';

export function responseSpeedTierFromScore(score: number | null): ResponseSpeedTier {
  if (score == null || Number.isNaN(score)) return 'unknown';
  if (score >= 0.72) return 'fast';
  if (score >= 0.4) return 'medium';
  return 'slow';
}
