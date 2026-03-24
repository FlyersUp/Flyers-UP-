# Booking, Payout, Lateness & Reliability System — Audit & Refactor

## 1. AUDIT SUMMARY

### Critical issues found

1. **Premature pro payout (FIXED)**
   - **Problem:** `pay/deposit` and `pay/final` used `transfer_data: { destination: connectedAccountId }`, sending funds directly to the pro's Stripe Connect account on payment. Pros were paid when the customer paid, not when the job was verified complete.
   - **Fix:** Removed `transfer_data` from both deposit and remaining payment. Charges go to the platform. Payout to pros happens only via the `release-payouts` cron after all eligibility checks.

2. **No payout guardrails**
   - **Problem:** `release-payouts` did not strictly enforce arrival, start, or completion. It relied on `status=completed` and 2+ photos, but did not require `arrived_at`, `started_at`, or `completed_at`.
   - **Fix:** Added `isPayoutEligible()` in `lib/bookings/state-machine.ts` and wired it into the cron. Payout is blocked if any of these are missing: `arrived_at`, `started_at`, `completed_at`, `customer_confirmed` or `auto_confirm_at` passed, and no `dispute_open` or `cancellation_reason='pro_no_show'`.

3. **No lateness / no-show protection**
   - **Problem:** No grace period or customer penalty-free cancellation when the pro was late or a no-show.
   - **Fix:** Added `app/api/cron/lateness/route.ts` (15/30/60 min thresholds), `no_show_eligible_at`, and `POST /api/bookings/[id]/cancel-due-to-pro-delay`.

4. **Pro reliability not tracked**
   - **Problem:** No penalties or reliability metrics for lateness or no-shows.
   - **Fix:** Added `pro_booking_incidents` and `pro_reliability` tables, and `lib/reliability/recalculate.ts`. No-show cancellations insert incidents.

---

## 2. FILES CHANGED

| File | Change |
|------|--------|
| `supabase/migrations/078_booking_payout_guardrails.sql` | New migration: schema updates, incidents, reliability |
| `lib/bookings/state-machine.ts` | New: state machine, transitions, `isPayoutEligible()` |
| `app/api/bookings/[bookingId]/pay/deposit/route.ts` | Removed `transfer_data`; platform holds deposit |
| `app/api/bookings/[bookingId]/pay/final/route.ts` | Removed `transfer_data`; platform holds remaining |
| `app/api/stripe/webhook/route.ts` | Deposit handler: set `awaiting_pro_arrival_at`; pro copy updated |
| `app/api/cron/release-payouts/route.ts` | Strict payout eligibility, uses `isPayoutEligible()` |
| `app/api/cron/lateness/route.ts` | New cron: 15/30/60 min lateness and no-show logic |
| `app/api/bookings/[bookingId]/cancel-due-to-pro-delay/route.ts` | New: customer penalty-free cancel for pro no-show |
| `lib/reliability/recalculate.ts` | New: pro reliability recalculation from incidents |
| `app/(app)/customer/bookings/[bookingId]/page.tsx` | Select `no_show_eligible_at`, `scheduled_start_at` |
| `app/(app)/customer/bookings/[bookingId]/BookingDetailContent.tsx` | `CancelDueToProDelayBanner` integration |
| `components/bookings/customer/CancelDueToProDelayBanner.tsx` | New component |
| `app/api/customer/bookings/[bookingId]/route.ts` | Include `noShowEligibleAt`, `scheduledStartAt` in response |

---

## 3. SCHEMA / MIGRATION

Migration `078_booking_payout_guardrails.sql` adds:

- **Bookings:** `scheduled_start_at`, `grace_period_minutes`, `late_warning_sent_at`, `severe_late_warning_sent_at`, `no_show_eligible_at`, `payout_eligible_at`, `payout_released_at`, `payout_block_reason`, `eta_minutes`, `eta_note`, `eta_updated_at`, `eta_update_count`, `canceled_by`, `cancellation_reason`, `dispute_open`, `checked_in_at`, `check_in_method`, `check_in_lat`, `check_in_lng`, `check_in_distance_meters`, `arrival_verified`, `completion_submitted_at`, `completion_notes`, `customer_confirmed_at`, `auto_confirm_at_explicit`
- **Statuses:** `canceled_no_show_pro`, `canceled_no_show_customer`, `customer_confirmed`, `auto_confirmed`, `payout_eligible`, `payout_released`, `refund_pending`, `refunded`, `disputed`, `awaiting_pro_arrival`
- **pro_booking_incidents:** `pro_id`, `booking_id`, `incident_type`, `incident_points`, `expires_at`
- **pro_reliability:** `on_time_rate`, `late_arrival_count_30d`, `no_show_count_30d`, etc.
- **booking_events:** `actor_type`, `actor_id`, `old_status`, `new_status`

---

## 4. BOOKING STATE MACHINE

- Centralized in `lib/bookings/state-machine.ts`
- `canTransition(from, to)` for valid status changes
- `isPayoutBlockedStatus(status)` for no-payout statuses
- `isPayoutEligible(input)` for strict payout checks

---

## 5. PAYMENT / PAYOUT GUARD LOGIC

- Deposit and remaining: platform-held charges (no `transfer_data`).
- Payout only after: `arrived_at`, `started_at`, `completed_at` set; `customer_confirmed` or `auto_confirm_at` passed; no dispute; no `pro_no_show`.
- `release-payouts` uses `createTransfer()` to move net amount to the pro’s Connect account.

---

## 6. LATENESS CRON

- Route: `GET /api/cron/lateness` (CRON_SECRET required)
- Runs on bookings with `deposit_paid`, no `arrived_at`, past `scheduled_start_at`
- +15 min: pro warning
- +30 min: stronger pro warning + customer notice
- +60 min (grace): set `no_show_eligible_at`; customer can cancel penalty-free

---

## 7. RELIABILITY SYSTEM

- `pro_booking_incidents`: `late_15`, `late_30`, `no_show`, etc.
- `recalculateProReliability(proId)` updates `pro_reliability` from incidents
- No-show cancel flow records a `no_show` incident
- Planned: wire lateness warnings into incidents and trigger recalculation

---

## 8. UI CHANGES

- **Customer:** `CancelDueToProDelayBanner` when `no_show_eligible_at` is set and pro has not arrived.
- **Pro:** Deposit notification updated to: “You will be paid after verified arrival, start, and completion.”

---

## 9. CRON SCHEDULE RECOMMENDATION

Add to Vercel cron or external scheduler:

```
# Lateness (every 5 min)
/api/cron/lateness

# Release payouts (every 15 min)
/api/cron/release-payouts

# Auto-confirm (every 5 min)
/api/cron/auto-confirm
```

---

## 10. RISKS & FOLLOW-UPS

1. **Platform balance:** With platform-held charges, Stripe balance must cover transfers. Ensure Connect setup and balance management.
2. **Backfill `scheduled_start_at`:** Migration backfills from `service_date` + `service_time`; timezone handling should be validated.
3. **Column errors:** Pages and APIs now select new columns; run migration before deploy.
4. **Tests:** Add tests for `isPayoutEligible`, cancel-due-to-pro-delay, lateness cron, and `release-payouts` eligibility.
