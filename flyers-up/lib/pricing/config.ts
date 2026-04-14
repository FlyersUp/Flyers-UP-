/**
 * Booking subtotal enforcement (server-side). Amounts in cents.
 * Occupation minimums live in {@link ./minimums}.
 */

import { getCategoryPricingConfigForOccupationSlug } from '@/lib/pricing/category-config';
import { DEFAULT_MIN_BOOKING_CENTS, getMinimumBookingCents } from '@/lib/pricing/minimums';

/** @deprecated Use DEFAULT_MIN_BOOKING_CENTS from ./minimums */
export const MIN_BOOKING_SUBTOTAL_CENTS = DEFAULT_MIN_BOOKING_CENTS;

export type MinBookingSubtotalMode = 'strict' | 'adjust';

export function resolveMinBookingSubtotalMode(): MinBookingSubtotalMode {
  const raw = (process.env.MIN_BOOKING_SUBTOTAL_MODE ?? 'adjust').trim().toLowerCase();
  if (raw === 'strict' || raw === 'reject') return 'strict';
  return 'adjust';
}

function formatUsdFromCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export type ApplyMinimumSubtotalResult =
  | {
      ok: true;
      originalSubtotalCents: number;
      enforcedSubtotalCents: number;
      adjusted: boolean;
      minimumCents: number;
    }
  | { ok: false; error: string; minimumCents: number };

/**
 * Enforce minimum pro subtotal using occupation-based floor.
 */
export function applyMinimumBookingSubtotal(options: {
  rawSubtotalCents: number;
  occupationSlug?: string | null;
}): ApplyMinimumSubtotalResult {
  const raw = Math.max(0, Math.round(options.rawSubtotalCents));
  const legacyMin = getMinimumBookingCents(options.occupationSlug);
  const categoryMin = getCategoryPricingConfigForOccupationSlug(options.occupationSlug)?.minPriceCents ?? 0;
  const minimumCents = Math.max(legacyMin, categoryMin);
  const mode = resolveMinBookingSubtotalMode();

  if (raw >= minimumCents) {
    return {
      ok: true,
      originalSubtotalCents: raw,
      enforcedSubtotalCents: raw,
      adjusted: false,
      minimumCents,
    };
  }

  if (mode === 'strict') {
    return {
      ok: false,
      error: `Minimum for this service is ${formatUsdFromCents(minimumCents)}.`,
      minimumCents,
    };
  }

  return {
    ok: true,
    originalSubtotalCents: raw,
    enforcedSubtotalCents: minimumCents,
    adjusted: true,
    minimumCents,
  };
}

export function shouldShowMinimumSubtotalAdjustment(booking: {
  original_subtotal_cents?: number | null;
  subtotal_cents?: number | null;
}): boolean {
  const o = booking.original_subtotal_cents;
  const s = booking.subtotal_cents;
  if (o == null || s == null) return false;
  return o < s;
}

/** Customer-facing copy when subtotal was raised to the occupation/service minimum. */
export function minimumBookingAdjustedNotice(enforcedSubtotalCents: number): string {
  return `Minimum for this service is ${formatUsdFromCents(enforcedSubtotalCents)}. Your request was adjusted.`;
}

export function minimumBookingNoticeFromBookingRow(booking: {
  original_subtotal_cents?: number | null;
  subtotal_cents?: number | null;
}): string | null {
  if (!shouldShowMinimumSubtotalAdjustment(booking)) return null;
  const s = Math.round(Number(booking.subtotal_cents ?? 0));
  if (!Number.isFinite(s) || s <= 0) return null;
  return minimumBookingAdjustedNotice(s);
}
