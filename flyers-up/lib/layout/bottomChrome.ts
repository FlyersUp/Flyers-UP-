/**
 * Shared Tailwind classes aligned with CSS vars in globals.css (`--fu-*`).
 * Use for app shells, sticky footers, and scroll areas that sit above fixed bottom UI.
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
