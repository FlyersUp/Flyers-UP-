# Booking Calendar System

## Overview

In-app calendar for Pros and Customers to track time-committed bookings. Works alongside Jobs/Bookings/Notifications. Bookings are the source of truth; calendar events are derived views.

## Calendar Visibility

**Committed states** (bookings appear in calendar):

- deposit_paid
- accepted
- scheduled
- pro_en_route
- on_the_way
- arrived
- in_progress
- completed_pending_payment
- awaiting_payment
- awaiting_remaining_payment
- awaiting_customer_confirmation

**Excluded**: draft, quote_sent, awaiting_deposit_payment, cancelled, declined, expired.

## Routes & Components

| Route | Purpose |
|-------|---------|
| `/pro/calendar` | Pro Work Calendar |
| `/customer/calendar` | Customer My Schedule |

| Component | Purpose |
|-----------|---------|
| `CalendarView` | Agenda/day/week/month views |
| `CalendarEventCard` | Event display with status, link to detail |
| `MiniScheduleWidget` | Compact next-booking on dashboards |
| `AddToCalendarButton` | Google Calendar + .ics download |

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/calendar/events?role=pro|customer&from=&to=` | Role-safe calendar events |
| `GET /api/bookings/[bookingId]/ics` | .ics file download (role-safe) |

## Database

- **077_pro_calendar_buffer_prep.sql**: Adds `service_pros.buffer_minutes` for future travel/prep buffer.

## Reminders

**Triggered by** cron: `/api/cron/reminders` (CRON_SECRET).

| Timing | Event type | Notification |
|--------|------------|--------------|
| 24h before | BOOKING_REMINDER_24H | "Booking tomorrow" / "Job tomorrow" |
| 2h before | BOOKING_REMINDER_2H | "Booking in 2 hours" |
| 1h before | BOOKING_REMINDER_1H | "Booking in 1 hour" |
| 30m before | BOOKING_REMINDER_30M | "Booking in 30 minutes" |
| At start | BOOKING_REMINDER_NOW | "Booking starting now" |
| Final payment due | REMAINING_REMINDER_SOON | "Remaining payment due soon" |

Timing config: `lib/calendar/reminders.ts`.

## External Calendar Export

**Google Calendar**: Opens pre-filled event via `https://calendar.google.com/calendar/render?action=TEMPLATE&...`

**.ics download**: Standards-compliant iCalendar with TZID for local time. Includes title, date/time, address, notes, booking reference, URL to detail page.

## Reschedule & Cancel

- **Reschedule accepted**: `service_date`/`service_time` updated → calendar event moves; `revalidatePath` for calendar routes.
- **Cancel**: Status → cancelled → booking no longer in committed states → disappears from calendar.

## Post-Deposit Flow

1. Webhook sets `status: deposit_paid`, `paid_deposit_at`
2. `revalidatePath` for `/pro`, `/pro/today`, `/pro/jobs`, `/pro/calendar`, `/customer`, `/customer/calendar`
3. Booking appears in calendar (committed status)
4. Reminders cron will fire at configured offsets

## Entry Points

- **Pro**: Sidebar "Calendar", Pro dashboard "Schedule" widget, Job detail "View in calendar" + "Add to calendar"
- **Customer**: Sidebar "Calendar", Customer dashboard "Schedule" widget, Booking detail "Add to calendar"

## Tests

- `lib/calendar/__tests__/calendar-visibility.test.ts`
- `lib/bookings/__tests__/pro-visible-statuses.test.ts`

Run: `npm run test`
