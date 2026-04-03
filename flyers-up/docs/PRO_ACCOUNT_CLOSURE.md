# Service Pro account closure (self-serve)

## Summary

Soft-close for service pros: no hard deletes of auth, Stripe, bookings, or tax/payment rows. Closure sets `profiles.account_status = 'closed'`, timestamps, optional `closure_reason`, and `service_pros.available = false` plus `service_pros.closed_at`.

## Files

| Area | Path |
|------|------|
| Migration | `supabase/migrations/103_pro_account_closure.sql` |
| Closure logic | `lib/pro/account-closure-service.ts` |
| Status helpers | `lib/pro/account-status.ts` |
| Customer bookability | `lib/pro/pro-bookability.ts` |
| Marketplace filter | `lib/pro/filter-marketplace-pros.ts`, `lib/db/services.ts`, `app/api/customer/pros/route.ts` |
| API | `app/api/pro/account/close/route.ts` |
| Booking create guard | `app/actions/bookings.ts` (`isServiceProBookableByCustomers`) |
| Availability APIs | `app/api/pros/[proId]/availability/{month,day,check}/route.ts` |
| Pro accept eligibility | `lib/bookings/pro-booking-eligibility.ts` |
| Pro profile updates | `app/actions/servicePro.ts` |
| Public pro profile | `lib/profileData.ts` |
| Routing | `lib/authRouting.ts`, `app/page.tsx`, `app/(app)/pro/page.tsx`, `proxy.ts` |
| Deactivated landing | `app/(app)/account/deactivated/` (legacy `/pro/account-closed` redirects here) |
| UI | `app/(app)/settings/privacy-security/page.tsx`, `components/landing/PublicHomePage.tsx` (one-time closed banner) |
| Types | `types/database.ts` (`ProfileAccountStatusDb`, profile + `service_pros.closed_at`) |
| Tests | `lib/pro/__tests__/account-closure.test.ts` |

## Assumptions

- Blockers: non-terminal bookings (see `CLOSURE_TERMINAL_BOOKING_STATUSES`), pending `payout_review_queue`, unresolved `booking_disputes`.
- `closure_requested_at` is set on first close only; if already set (e.g. future `closure_requested` flow), it is preserved.
- Global `proxy` middleware must be enabled in Next for `/pro/*` closure redirects; `pro/page` also redirects as a backstop.

## Follow-ups

- Optional: expose `closure_requested` in product UI before final close.
- Regenerate Supabase types in CI if you prefer generated `database.ts` over hand-maintained columns.
