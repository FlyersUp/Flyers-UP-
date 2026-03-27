export type OccupationFeeProfile = 'light' | 'standard' | 'premium_trust';

export type BookingSubtotalTier = 'under_25' | 'between_25_and_75' | 'over_75';

export type FeeRule = {
  serviceFeePercent: number;
  convenienceFeeCents: number;
  protectionFeeCents: number;
  demandFeeMode?: 'none' | 'supported_if_applicable';
};

export type ResolvedFeeRule = FeeRule & {
  profile: OccupationFeeProfile;
  tier: BookingSubtotalTier;
};

const RULES: Record<OccupationFeeProfile, Record<BookingSubtotalTier, FeeRule>> = {
  light: {
    under_25: { serviceFeePercent: 0.08, convenienceFeeCents: 50, protectionFeeCents: 50, demandFeeMode: 'none' },
    between_25_and_75: { serviceFeePercent: 0.1, convenienceFeeCents: 100, protectionFeeCents: 100, demandFeeMode: 'supported_if_applicable' },
    over_75: { serviceFeePercent: 0.12, convenienceFeeCents: 150, protectionFeeCents: 150, demandFeeMode: 'supported_if_applicable' },
  },
  standard: {
    under_25: { serviceFeePercent: 0.09, convenienceFeeCents: 75, protectionFeeCents: 75, demandFeeMode: 'supported_if_applicable' },
    between_25_and_75: { serviceFeePercent: 0.12, convenienceFeeCents: 150, protectionFeeCents: 150, demandFeeMode: 'supported_if_applicable' },
    over_75: { serviceFeePercent: 0.12, convenienceFeeCents: 250, protectionFeeCents: 200, demandFeeMode: 'supported_if_applicable' },
  },
  premium_trust: {
    under_25: { serviceFeePercent: 0.09, convenienceFeeCents: 100, protectionFeeCents: 100, demandFeeMode: 'supported_if_applicable' },
    between_25_and_75: { serviceFeePercent: 0.1, convenienceFeeCents: 150, protectionFeeCents: 200, demandFeeMode: 'supported_if_applicable' },
    over_75: { serviceFeePercent: 0.13, convenienceFeeCents: 300, protectionFeeCents: 250, demandFeeMode: 'supported_if_applicable' },
  },
};

function normalize(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isAny(s: string, tokens: string[]): boolean {
  return tokens.some((t) => s.includes(t));
}

export function getBookingSubtotalTier(serviceSubtotalCents: number): BookingSubtotalTier {
  if (serviceSubtotalCents < 2500) return 'under_25';
  if (serviceSubtotalCents < 7500) return 'between_25_and_75';
  return 'over_75';
}

export function getOccupationFeeProfile(input: {
  occupationSlug?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}): OccupationFeeProfile {
  const signals = [normalize(input.occupationSlug), normalize(input.categorySlug), normalize(input.categoryName)].filter(Boolean);
  const joined = signals.join(' ');

  if (isAny(joined, ['barber', 'tutor', 'dog walker', 'dog walker', 'pet care', 'car detailer'])) return 'light';
  if (isAny(joined, ['cleaner', 'cleaning', 'handyman', 'mover', 'moving', 'landscaper', 'lawn care', 'painter', 'home organizer'])) return 'standard';
  if (isAny(joined, ['plumber', 'plumbing', 'electrician', 'electrical', 'mechanic', 'event planner', 'photographer', 'videographer', 'dj', 'chef', 'makeup artist'])) return 'premium_trust';
  return 'standard';
}

/** Validates a stored booking.fee_profile string (identity only — not used to select fee rules). */
export function parseStampedFeeProfile(
  raw: string | null | undefined
): OccupationFeeProfile | null {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'light' || v === 'standard' || v === 'premium_trust') return v;
  return null;
}

export function getFeeRuleForBooking(input: {
  serviceSubtotalCents: number;
  occupationSlug?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}): ResolvedFeeRule {
  const tier = getBookingSubtotalTier(Math.max(0, Math.round(input.serviceSubtotalCents)));
  const profile = getOccupationFeeProfile({
    occupationSlug: input.occupationSlug,
    categorySlug: input.categorySlug,
    categoryName: input.categoryName,
  });
  const rule = RULES[profile][tier];
  return { ...rule, profile, tier };
}
