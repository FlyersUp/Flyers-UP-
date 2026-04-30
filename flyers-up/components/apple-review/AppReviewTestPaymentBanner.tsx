'use client';

/**
 * Apple App Review: visible reassurance that checkout runs in Stripe test mode
 * for the dedicated reviewer account only.
 */
export function AppReviewTestPaymentBanner() {
  return (
    <div
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      <p className="font-semibold">Test payment only — no real charge will occur</p>
      <p className="mt-1 text-xs opacity-90">
        This account is for App Store review. Use a Stripe test card (for example 4242 4242 4242 4242); the app is in
        Stripe test mode.
      </p>
    </div>
  );
}
