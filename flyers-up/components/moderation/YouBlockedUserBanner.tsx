'use client';

interface YouBlockedUserBannerProps {
  youBlocked: boolean;
  /** Shown while checking block state (optional; avoids layout jump if omitted) */
  loading?: boolean;
  onUnblock: () => Promise<boolean>;
  /** e.g. "this pro" / "this customer" */
  partyLabel?: string;
  className?: string;
}

export function YouBlockedUserBanner({
  youBlocked,
  loading = false,
  onUnblock,
  partyLabel = 'this user',
  className = '',
}: YouBlockedUserBannerProps) {
  if (loading || !youBlocked) return null;

  return (
    <div
      className={`mx-4 mt-3 px-4 py-2.5 rounded-xl border text-sm bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 ${className}`}
      role="status"
    >
      <p>
        You&apos;ve blocked {partyLabel}. You can&apos;t send new messages here until you unblock them. Blocking is
        separate from reporting someone to Flyers Up.
      </p>
      <button
        type="button"
        className="mt-2 text-sm font-semibold text-amber-950 dark:text-amber-50 underline hover:opacity-90"
        onClick={() => void onUnblock()}
      >
        Unblock
      </button>
    </div>
  );
}
