# Pro-Side Product Audit & Implementation Plan

**Date:** March 2025  
**Goal:** Audit, redesign, and tighten the Pro-side product to solve TaskRabbit pain points: algorithm dependence, unpaid labor, chaotic messaging, weak earnings clarity, unfair penalties, weak customer ownership, and lack of business-building tools.

---

## Product Philosophy to Enforce

1. **Reduce chaos** — structured booking-first over message-first
2. **Increase Pro control** — business ownership, not algorithm dependence
3. **Protect Pro earnings** — transparent pricing, minimums, travel fees
4. **Build long-term ownership** — repeat customers, shareable profile, direct booking

**Positioning:** *Flyers Up is where service pros become real businesses.*

---

## AUDIT FINDINGS

### CRITICAL

| Issue | Location | Description |
|-------|----------|-------------|
| **Onboarding overload** | `onboarding/pro/page.tsx` | 6 steps crammed into one flow; no Welcome/Value prop; no clear phase split (identity → pricing → trust → launch); verification/payouts dumped in "Almost there" |
| **No Welcome screen** | Role → Pro onboarding | Missing value proposition differentiating from TaskRabbit; no "Build my Pro profile" CTA |
| **Service area too late** | Onboarding Step 6 | ZIP only in final step; no travel radius, travel fee, or neighborhood explanation |
| **No availability in onboarding** | Onboarding | Weekly schedule, lead time, buffer, booking window all missing — forced to settings later |
| **No pricing in onboarding** | Onboarding | Min job price, starting price, travel fee, add-ons not set during onboarding — Pro launches with no pricing protection |
| **Profile/trust step missing** | Onboarding | No photo, business name, intro, portfolio before launch |
| **Payout setup hidden** | Connect page | Redirect-only; no plain-language explanation or save-and-return option |
| **No Policies/Rules screen** | Onboarding | Cancellation, no-show, reschedule rules never explained; Pro doesn't know what happens on edge cases |
| **No Launch Readiness check** | Onboarding | No checklist, profile preview, or public link before going live |
| **My Business page non-functional** | `pro/my-business/page.tsx` | Form fields don't persist; SAVE does nothing; duplicates profile/settings |
| **Earnings lacks clarity** | `pro/earnings/page.tsx` | No gross vs platform fee vs net; no deposit/remaining breakdown; no payout timing; "Pending" vague |
| **Requests/jobs disconnect** | `pro/jobs`, `pro/requests` | Requests redirect to jobs; "Incoming" tab shows placeholder; no structured request summary before Pro accepts |

### HIGH

| Issue | Location | Description |
|-------|----------|-------------|
| **Pricing-availability not in onboarding** | Settings only | Pro must find settings to set pricing; no earnings preview during setup |
| **Profile public link not prominent** | Pro profile | Shareable link exists (`/book/[proId]`) but not surfaced in dashboard or onboarding |
| **Repeat customer tools missing** | App-wide | No rebook flow, favorite Pro (customer), direct profile booking CTA |
| **Cancellation rules not surfaced** | `lib/operations/cancellationPolicy.ts` | Policy exists but Pro never sees plain-language summary |
| **No "what happens next" guidance** | Booking detail | Status transitions lack clear next-step copy |
| **Pro copy generic** | Multiple | "I offer services. Create a profile and start taking bookings" — not ownership-oriented |
| **SideMenu inconsistent** | `SideMenu.tsx` | PRO_SECTIONS mix profile, earnings, settings; no "My Business" or "Profile Link" prominence |
| **Demand board vs direct requests** | Jobs page | "Incoming" empty; "Open Jobs" shows demand board; claim flow exists but no structured incoming request view |

### MEDIUM

| Issue | Location | Description |
|-------|----------|-------------|
| **Travel radius in settings only** | Pricing-availability | Service radius exists but not emphasized in onboarding |
| **Consultation fee missing** | Pricing | No optional scoping/consultation fee |
| **Earnings "You keep what you earn"** | Earnings | Vague; no platform fee breakdown |
| **Profile page duplicates** | Profile vs settings | Business profile, pricing, availability spread across profile + settings |
| **job_requests vs demand** | Data model | Two request systems; job_requests open/expired vs demand board |
| **Dark mode in profile** | Profile page | Odd placement; not a business field |

### NICE-TO-HAVE

| Issue | Location | Description |
|-------|----------|-------------|
| **Portfolio/before-after** | Profile | `beforeAfterPhotos` in type but limited UI |
| **Verified credentials** | Profile | Self-reported checkboxes; no real verification flow |
| **Business insights** | Dashboard | No trend charts, repeat rate, etc. |
| **Multi-day booking** | Availability | Not clearly supported in copy |

---

## PRIORITIZED IMPLEMENTATION PLAN

### Phase 1 — Onboarding Redesign (CRITICAL)
1. Add Screen 1: Welcome / Value Proposition
2. Restructure to 10-screen flow per spec
3. Split: Occupation → Services → Service Area + Travel → Availability → Pricing → Profile/Trust → Payout → Policies → Launch Check
4. Progressive disclosure; no dump of verification/payouts upfront

### Phase 2 — Earnings & Payment Clarity (CRITICAL)
5. Earnings breakdown: gross, platform fee, travel, add-ons, net, payout timing
6. Deposit/remaining balance clarity in booking detail
7. Idempotent payment safeguards

### Phase 3 — Pro Control & Ownership (HIGH)
8. Shareable profile link in dashboard and onboarding
9. Repeat customer rebook (if customer has prior booking)
10. Favorite/save Pro for customers
11. Direct booking from profile

### Phase 4 — Fair Rules UX (HIGH)
12. Policies screen in onboarding
13. Plain-language cancellation/no-show/reschedule summary
14. "What happens next" panels in booking detail

### Phase 5 — Copy & UI Polish (MEDIUM)
15. Replace generic copy with ownership-oriented language
16. Fix My Business or remove; consolidate with profile
17. Consistent card patterns, spacing, premium tone

---

## QA CHECKLIST (Core Pro Flows)

- [ ] New Pro completes onboarding without confusion
- [ ] Pro can set minimum price, travel fee, add-ons before first booking
- [ ] Pro sees earnings breakdown (gross, fee, net)
- [x] Pro can share profile link (dashboard "Share your profile" card)
- [x] Pro understands cancellation rules before accepting (Step 9 Policies)
- [ ] Booking acceptance shows clear scope summary
- [ ] No dead routes, broken CTAs, or missing payment paths
- [ ] Mobile layout works; no nav overlap
- [ ] Status transitions have clear "what happens next"

## IMPLEMENTATION STATUS (March 2025)

**Done:**
- 10-step Pro onboarding (Welcome, Occupation, Services, Service Area, Availability, Pricing, Profile, Payout, Policies, Launch)
- Ownership-oriented copy (role page, welcome screen, earnings)
- Shareable profile link on Pro dashboard (View + Copy link)
- Policies screen with cancellation/no-show/payout summaries
- Service area + travel radius + travel fee in onboarding
- Pricing (starting price, min job, deposit) in onboarding

---

## ROUTE & SCHEMA NOTES

- **Onboarding:** `/app/(app)/onboarding/role/page.tsx`, `onboarding/pro/page.tsx`
- **Pro routes:** `/pro` (dashboard), `/pro/jobs`, `/pro/bookings`, `/pro/earnings`, `/pro/profile`, `/pro/connect`, `/pro/settings/*`
- **Public profile:** `/book/[proId]`, `/customer/pros/[id]` (check which is canonical)
- **Payout:** Stripe Connect via `/pro/connect` → `/api/stripe/connect-v2/onboard`
- **Cancellation policy:** `lib/operations/cancellationPolicy.ts` — engine exists; needs Pro-facing summary

---

## UNRESOLVED TRADEOFFS

1. **job_requests vs demand board:** Two systems; may need consolidation or clear mapping.
2. **My Business vs Profile vs Settings:** Overlap; recommend consolidating into Profile + Settings (pricing, availability).
3. **Verification timing:** "Verified later" path reduces friction but may delay trust signals.
