/**
 * Apple App Review sandbox account (credentials shared with App Store Connect only).
 * All product behavior keyed off this email must stay scoped to this address only —
 * do not broaden to domains or patterns.
 */
export const APPLE_APP_REVIEW_ACCOUNT_EMAIL = 'reviewer@flyersup.app';

/** DB marker for rows created by scripts/seed-apple-app-review-account.ts (idempotent cleanup). */
export const APPLE_APP_REVIEW_BOOKING_NOTES_MARKER =
  'APPLE_APP_REVIEW_SEED: do not edit manually (Flyers Up App Store review demo data).';

export function normalizeAppReviewEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function isAppleAppReviewAccountEmail(email: string | null | undefined): boolean {
  return normalizeAppReviewEmail(email) === APPLE_APP_REVIEW_ACCOUNT_EMAIL;
}
