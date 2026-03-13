# UI Launch Polish Report — Flyers Up

**Date:** March 12, 2025  
**Scope:** Mobile responsiveness, visual consistency, dark/light mode, premium polish

---

## A. UI Launch Polish Report

### Major Visual Fixes

| Fix | Purpose |
|-----|---------|
| **CustomerDashboard** | Replaced all hardcoded light colors (`text-black/60`, `#111`, `#B2FBA5`, `#F5F5F5`) with theme tokens (`text-text`, `text-text3`, `bg-accent`, `bg-bg`, `bg-surface2`) for dark mode support |
| **Occupations page** | Replaced `bg-[#F5F5F5]`, `text-zinc-*`, `bg-white` with `bg-bg`, `text-text`, `text-text2`, `bg-surface`, `border-border` |
| **OccupationCard** | Switched from `bg-white`, `text-zinc-*` to `bg-surface`, `text-text`, `text-text3`, `border-border` |
| **OccupationSearchBar** | Switched from `bg-white`, `text-zinc-*`, `focus:ring-[#B2FBA5]` to `bg-surface`, `text-text`, `focus:ring-accent` |
| **BookingsTabsLayout** | Replaced `text-black/70`, `border-[#111]` with `text-text2`, `border-text`, `text-text` |
| **StickyBookingBar** | Replaced `bg-[#F5F5F5]/95`, `border-black/5` with `bg-bg/95`, `border-border`; added dark shadow |
| **JobTimelineCard** | Replaced hardcoded GREEN/ORANGE with `hsl(var(--accent-customer/pro) / 0.35)`; `text-gray-900` → `text-text` |
| **CustomerSettings** | Replaced `text-gray-600 dark:text-gray-300`, `text-gray-900 dark:text-white` with `text-text3`, `text-text` |
| **CustomerPageShell / ProPageShell** | Replaced `text-gray-900 dark:text-white` with `text-text`; added `truncate max-w-[60vw]` for long titles on mobile |

### Mobile Fixes

| Fix | Purpose |
|-----|---------|
| **FloatingBottomNav** | Reduced active pill width (132→104px), inactive (56→48px), gap (12→8px on xs) so nav fits on 320px screens |
| **FloatingBottomNav** | Smaller nav height on xs (`h-12 sm:h-14`), label `text-xs sm:text-sm`, `maxWidth: 64` for active label |
| **AppLayout** | Reduced bottom padding from 8rem to 7rem for nav clearance |
| **CustomerDashboard** | Added `pb-6` to content, `scrollbar-hide` on horizontal scroll areas |
| **Page shells** | Added `safe-area-bottom` for devices with home indicator |

### Dark Mode Fixes

| Fix | Purpose |
|-----|---------|
| **CustomerDashboard** | All sections now use theme tokens; loading state uses `bg-bg`, `text-muted` |
| **Occupations** | Sticky search bar uses `bg-bg/95`, `border-border/50`; skeletons use `bg-surface`, `bg-muted` |
| **OccupationCard / SearchBar** | Full theme token usage for surfaces, text, borders, focus |
| **Settings** | Card labels and icons use `text-text`, `text-text3`, `text-muted` |
| **JobTimelineCard** | Status chip uses CSS variables for light/dark |

### Light Mode Fixes

| Fix | Purpose |
|-----|---------|
| Theme tokens used consistently so light mode inherits correct values from `:root` |
| No light-only hardcoded colors left in updated components |

### Premium Polish Improvements

| Fix | Purpose |
|-----|---------|
| Consistent section headers | `text-text2` uppercase tracking for hierarchy |
| Button/link states | `hover:opacity-95`, `hover:bg-surface2`, `transition-opacity` |
| Card spacing | `pb-6` on dashboard content for rhythm |
| Truncation | Long page titles truncate with `max-w-[60vw]` on mobile |

---

## B. Screens Improved

| Route / Component | Summary |
|-------------------|---------|
| `/customer` (CustomerDashboard) | Theme tokens throughout; dark mode support |
| `/occupations` | Theme tokens; sticky search bar; empty state |
| `OccupationCard` | Theme-aware card styling |
| `OccupationSearchBar` | Theme-aware input and focus |
| `CustomerPageShell` | Theme tokens; title truncation |
| `ProPageShell` | Theme tokens; title truncation |
| `/customer/settings` | Theme tokens for labels and icons |
| `BookingsTabsLayout` | Theme tokens for tabs |
| `StickyBookingBar` | Theme-aware sticky bar |
| `JobTimelineCard` | Theme-aware status chip |
| `FloatingBottomNav` | Mobile sizing; fits 320px |
| `AppLayout` | Adjusted bottom padding |

---

## C. Design System Tightening

| Area | Change |
|------|--------|
| **Spacing** | `pb-6` on dashboard; `gap-2 sm:gap-3` on nav; `px-3 sm:px-4` on nav |
| **Hierarchy** | Section headers: `text-text2` uppercase; body: `text-text`; secondary: `text-text3` |
| **Color/theme** | Prefer `text-text`, `text-text2`, `text-text3`, `text-muted`, `bg-bg`, `bg-surface`, `bg-surface2`, `border-border`, `bg-accent`, `text-accentContrast` |
| **Nav behavior** | Active pill 104×48px (was 132×56); fits 320px; label max 64px |
| **Chips/buttons** | Status chips use `hsl(var(--accent-*) / 0.35)`; primary buttons use `bg-accent text-accentContrast` |
| **Cards** | `bg-surface`, `border-border`; `DashboardCard` uses `Card` with theme tokens |

---

## D. Remaining Visual Risks

| Risk | Recommendation |
|------|----------------|
| **ProReputationCard** | Uses `text-[#111]`, `text-[#6A6A6A]`, etc.; should use theme tokens |
| **ProProfileCard** | Uses `text-black/*`, `bg-[#B2FBA5]`, `bg-[#FFC067]`; should use theme tokens |
| **JobDetailsForm** | Uses `bg-[#F2F2F0]`, `focus:ring-[#B2FBA5]`; should use theme tokens |
| **AddPaymentMethodModal** | Uses `bg-[#FFC067]`, `text-black`; consider theme tokens |
| **BookingTimeline** | Uses `GREEN`, `ORANGE` constants; consider theme tokens |
| **Landing page** | Intentionally light via `public-light`; no changes needed |
| **Admin screens** | Not audited; may need theme token pass |
| **Messages / chat** | Not audited; may need theme token pass |

---

## Success Definition

- Customer home, occupations, and settings work in dark and light mode.
- Mobile nav fits on 320px screens.
- Theme tokens used consistently in updated components.
- No obvious broken or unfinished screens in the updated set.
- Premium feel preserved with consistent hierarchy and spacing.
