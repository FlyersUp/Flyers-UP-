/**
 * Shared Tailwind classes aligned with CSS vars in globals.css (`--fu-*`).
 * Source of truth for nav height: `FloatingBottomNav` (h-11 / sm:h-14) + marginBottom
 * matches `--fu-bottom-nav-inner` and `--fu-bottom-nav-margin`.
 * AppLayout applies `pb-fu-nav` on the main content column; use `pbNavAndStickyCta` / `pbStickyBarOnly`
 * when a sticky bar stacks above the nav.
 */
export const bottomChrome = {
  /** Main scroll padding when only the floating bottom nav is present */
  pbBelowNav: 'pb-fu-nav',
  /** Full padding when a single wrapper must clear nav + sticky (no AppLayout pb-fu-nav) */
  pbNavAndStickyCta: 'pb-fu-nav-sticky',
  /** Extra padding when AppLayout/PageLayout already applied pb-fu-nav and a sticky bar sits above the nav */
  pbStickyBarOnly: 'pb-fu-sticky-only',
  /** Position a fixed bar just above the floating bottom nav */
  fixedAboveNav: 'bottom-fu-above-nav',
} as const;
