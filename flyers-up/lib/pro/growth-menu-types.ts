export type GrowthMenuItemId =
  | 'insights'
  | 'visibility'
  | 'education'
  | 'reviews'
  | 'disputes'
  | 'trust'
  | 'policies';

export type GrowthMenuItemState = 'available' | 'locked' | 'empty';

/** i18n key under sidebar.pro.* for the row title */
export type GrowthMenuTitleKey =
  | 'sidebar.pro.insights'
  | 'sidebar.pro.improveVisibility'
  | 'sidebar.pro.educationBestPractices'
  | 'sidebar.pro.reviewsRatings'
  | 'sidebar.pro.disputes'
  | 'sidebar.pro.trustStanding'
  | 'sidebar.pro.platformPolicies';

export type GrowthMenuItemDto = {
  id: GrowthMenuItemId;
  titleKey: GrowthMenuTitleKey;
  state: GrowthMenuItemState;
  subtitle: string;
  href: string;
  progressCurrent?: number;
  progressRequired?: number;
  meta?: {
    avgRating?: number | null;
    reviewCount?: number;
    disputesTotalCount?: number;
    completedJobsCount?: number;
    engagedJobsCount?: number;
    totalJobsCount?: number;
    insightsUnlocked?: boolean;
    reliabilityScore?: number | null;
    payoutsReady?: boolean;
    openDisputesCount?: number;
  };
};

export type ProfileStrengthBreakdownItem = {
  id: string;
  label: string;
  pointsEarned: number;
  pointsMax: number;
  done: boolean;
};

export type ProfileStrengthDto = {
  score: number;
  maxScore: 100;
  items: ProfileStrengthBreakdownItem[];
};

export type GrowthMenuResponseDto = {
  ok: true;
  items: GrowthMenuItemDto[];
  profileStrength: ProfileStrengthDto;
  insights: {
    unlocked: boolean;
    completedJobsCount: number;
    /** All bookings for this pro (any status) */
    totalJobsCount: number;
    /** Bookings excluding cancelled / declined / expired-unpaid, etc. */
    engagedJobsCount: number;
    unlockRequiresCompleted: number;
    /** Raw total bookings needed to unlock when paid completion path not met */
    unlockRequiresTotalBookings: number;
  };
};
