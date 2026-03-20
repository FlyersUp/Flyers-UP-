'use client';

/**
 * Premium error page — Apple/Uber/Airbnb style
 *
 * Apple: Calm, minimal, generous whitespace, clear hierarchy
 * Uber: Direct CTAs, helpful next steps
 * Airbnb: Warm copy, reassurance, trust
 */

import Link from 'next/link';

export interface BookingLoadErrorPageProps {
  /** Primary heading */
  title?: string;
  /** Supporting copy */
  message?: string;
  /** HTTP status for context-specific guidance */
  errorStatus?: number | null;
  /** Primary action destination */
  primaryHref: string;
  /** Primary action label */
  primaryLabel: string;
  /** Secondary action (optional) */
  secondaryHref?: string;
  secondaryLabel?: string;
  /** Sign-in href when 401 — shown as primary */
  signInHref?: string;
  /** Compact mode (e.g. inline vs full-page) */
  compact?: boolean;
  /** Optional retry callback — shows "Try again" button */
  onRetry?: () => void;
}

export function BookingLoadErrorPage({
  title = "Couldn't load this booking",
  message,
  errorStatus,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  signInHref,
  compact = false,
  onRetry,
}: BookingLoadErrorPageProps) {
  const showSignIn = errorStatus === 401 && signInHref;
  const subMessage = message ?? getDefaultMessage(errorStatus);

  return (
    <div
      className={
        compact
          ? 'rounded-2xl bg-white dark:bg-[#1a1d24] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
          : 'min-h-[60vh] flex flex-col items-center justify-center px-4 py-12'
      }
      role="alert"
    >
      {/* Icon — Apple-style soft circle */}
      <div
        className={`shrink-0 rounded-full bg-[#f5f5f5] dark:bg-white/10 flex items-center justify-center ${
          compact ? 'h-14 w-14 mb-4' : 'h-20 w-20 mb-6'
        }`}
        aria-hidden
      >
        <svg
          width={compact ? 28 : 40}
          height={compact ? 28 : 40}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#8e8e93] dark:text-white/50"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>

      {/* Title */}
      <h1
        className={`font-semibold text-[#1d1d1f] dark:text-white text-center ${
          compact ? 'text-lg mb-2' : 'text-xl md:text-2xl mb-2'
        }`}
      >
        {title}
      </h1>

      {/* Message */}
      <p
        className={`text-[#6e6e73] dark:text-white/60 text-center max-w-sm ${
          compact ? 'text-sm mb-4' : 'text-base mb-6'
        }`}
      >
        {subMessage}
      </p>

      {/* Status-specific hint */}
      {errorStatus === 409 && !compact && (
        <p className="text-sm text-[#8e8e93] dark:text-white/40 text-center max-w-xs mb-4">
          The booking may not be ready for payment yet, or the pro hasn&apos;t completed setup.
        </p>
      )}

      {/* Actions — Uber-style clear CTAs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-xs flex-wrap justify-center">
        {showSignIn && (
          <Link
            href={signInHref}
            className="inline-flex h-12 items-center justify-center rounded-xl text-base font-semibold text-white bg-[#222] dark:bg-white dark:text-[#222] hover:opacity-90 active:scale-[0.99] transition-all"
          >
            Sign in
          </Link>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-12 items-center justify-center rounded-xl text-base font-semibold text-white bg-[#058954] hover:bg-[#047a48] active:scale-[0.99] transition-all"
          >
            Try again
          </button>
        )}
        <Link
          href={primaryHref}
          className={`inline-flex h-12 items-center justify-center rounded-xl text-base font-semibold transition-all ${
            showSignIn || onRetry
              ? 'border-2 border-[#d1d1d6] dark:border-white/20 text-[#222] dark:text-white hover:bg-black/5 dark:hover:bg-white/5'
              : 'text-white bg-[#058954] hover:bg-[#047a48] active:scale-[0.99]'
          }`}
        >
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel && (
          <Link
            href={secondaryHref}
            className="inline-flex h-12 items-center justify-center rounded-xl text-base font-medium text-[#6e6e73] dark:text-white/60 hover:text-[#222] dark:hover:text-white transition-colors"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>

      {/* Airbnb-style reassurance */}
      {!compact && (
        <p className="mt-8 text-xs text-[#8e8e93] dark:text-white/40 text-center max-w-xs">
          Need help? <Link href="/customer/settings/help-support" className="underline hover:text-[#222] dark:hover:text-white">Contact support</Link>
        </p>
      )}
    </div>
  );
}

function getDefaultMessage(status: number | null | undefined): string {
  switch (status) {
    case 401:
      return "Your session may have expired. Sign in to continue.";
    case 404:
      return "This booking may not exist or you may not have access to it. Try signing in with the correct account or refreshing.";
    case 409:
      return "This booking isn't ready for payment right now.";
    default:
      return "Something went wrong. Please try again or return to your bookings.";
  }
}
