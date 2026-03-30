import type {
  GrowthMenuItemDto,
  GrowthMenuResponseDto,
  ProfileStrengthDto,
} from '@/lib/pro/growth-menu-types';

export type BuildGrowthMenuContext = {
  completedJobsCount: number;
  /** All bookings rows for this pro (any status) — used for Insights unlock */
  totalJobsCount: number;
  engagedJobsCount: number;
  reviewCount: number;
  avgRating: number | null;
  disputesTotalCount: number;
  openDisputesCount: number;
  reliabilityScore: number | null;
  payoutsReady: boolean;
  profileStrength: ProfileStrengthDto;
};

const UNLOCK_COMPLETED = 1;
const UNLOCK_TOTAL_BOOKINGS = 3;

export function insightsUnlocked(completed: number, totalBookings: number): boolean {
  return completed >= UNLOCK_COMPLETED || totalBookings >= UNLOCK_TOTAL_BOOKINGS;
}

export function buildGrowthMenuResponse(ctx: BuildGrowthMenuContext): GrowthMenuResponseDto {
  const unlocked = insightsUnlocked(ctx.completedJobsCount, ctx.totalJobsCount);

  const items: GrowthMenuItemDto[] = [];

  items.push({
    id: 'insights',
    titleKey: 'sidebar.pro.insights',
    state: unlocked ? 'available' : 'locked',
    subtitle: unlocked
      ? 'Response time, acceptance, and earnings — tracking improves as you complete more jobs.'
      : 'Complete 1 paid job or reach 3 bookings to unlock',
    href: '/pro/growth/insights',
    progressCurrent: unlocked ? undefined : Math.min(ctx.totalJobsCount, UNLOCK_TOTAL_BOOKINGS),
    progressRequired: unlocked ? undefined : UNLOCK_TOTAL_BOOKINGS,
    meta: {
      completedJobsCount: ctx.completedJobsCount,
      engagedJobsCount: ctx.engagedJobsCount,
      totalJobsCount: ctx.totalJobsCount,
      insightsUnlocked: unlocked,
    },
  });

  items.push({
    id: 'visibility',
    titleKey: 'sidebar.pro.improveVisibility',
    state: 'available',
    subtitle: 'Boost profile strength and ranking',
    href: '/pro/growth/visibility',
    meta: { reviewCount: ctx.reviewCount },
  });

  items.push({
    id: 'education',
    titleKey: 'sidebar.pro.educationBestPractices',
    state: 'available',
    subtitle: 'Learn pricing, reviews, and dispute prevention',
    href: '/pro/growth/education',
  });

  const reviewsEmpty = ctx.reviewCount === 0;
  items.push({
    id: 'reviews',
    titleKey: 'sidebar.pro.reviewsRatings',
    state: reviewsEmpty ? 'empty' : 'available',
    subtitle: reviewsEmpty
      ? 'No reviews yet'
      : `${ctx.avgRating?.toFixed(1) ?? '—'} avg · ${ctx.reviewCount} review${ctx.reviewCount === 1 ? '' : 's'}`,
    href: '/pro/growth/reviews',
    meta: { avgRating: ctx.avgRating, reviewCount: ctx.reviewCount },
  });

  const disputesEmpty = ctx.disputesTotalCount === 0;
  const disputesSubtitle = disputesEmpty
    ? 'No disputes on record'
    : ctx.openDisputesCount > 0
      ? `${ctx.disputesTotalCount} on record · ${ctx.openDisputesCount} open`
      : `${ctx.disputesTotalCount} on record — none open`;
  items.push({
    id: 'disputes',
    titleKey: 'sidebar.pro.disputes',
    state: disputesEmpty ? 'empty' : 'available',
    subtitle: disputesSubtitle,
    href: '/pro/growth/disputes',
    meta: { disputesTotalCount: ctx.disputesTotalCount, openDisputesCount: ctx.openDisputesCount },
  });

  const rel = ctx.reliabilityScore ?? 100;
  const trustParts: string[] = [`Reliability ${Math.round(rel)}`];
  if (ctx.payoutsReady) trustParts.push('payouts ready');
  else trustParts.push('finish payout setup');

  items.push({
    id: 'trust',
    titleKey: 'sidebar.pro.trustStanding',
    state: 'available',
    subtitle: trustParts.join(' · '),
    href: '/pro/growth/trust',
    meta: {
      reliabilityScore: ctx.reliabilityScore,
      payoutsReady: ctx.payoutsReady,
      openDisputesCount: ctx.openDisputesCount,
    },
  });

  items.push({
    id: 'policies',
    titleKey: 'sidebar.pro.platformPolicies',
    state: 'available',
    subtitle: 'Terms, privacy, and dispute policies',
    href: '/pro/growth/policies',
  });

  return {
    ok: true,
    items,
    profileStrength: ctx.profileStrength,
    insights: {
      unlocked,
      completedJobsCount: ctx.completedJobsCount,
      totalJobsCount: ctx.totalJobsCount,
      engagedJobsCount: ctx.engagedJobsCount,
      unlockRequiresCompleted: UNLOCK_COMPLETED,
      unlockRequiresTotalBookings: UNLOCK_TOTAL_BOOKINGS,
    },
  };
}
