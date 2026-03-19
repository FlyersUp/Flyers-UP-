# Customer & Pro Dashboards — Design Document

## Customer Dashboard

### Goal
Help users quickly understand their current bookings and take action.

### Structure
| # | Section | Purpose |
|---|---------|---------|
| 1 | Active booking card | **Priority** — Current/upcoming booking with quick actions |
| 2 | Pending requests | Open job requests awaiting offers |
| 3 | Past bookings list | Recent completed bookings |
| 4 | Saved pros | Optional — Favorite pros for quick rebooking |

### Components
| Component | Purpose |
|-----------|---------|
| Active booking card | Service, pro, date/time, status, View details + Message |
| Pending request row | Title, budget, preferred date/time, link to requests |
| Past booking row | Pro, service, date, price, link to detail |
| Saved pro row | Pro avatar, name, service, Rebook CTA |

### States
| State | Behavior |
|-------|----------|
| Loading | Section skeletons, full-page "Loading…" before auth |
| Empty | "No active booking", "No pending requests", etc. with CTA |
| Error | Fetch failures fall back to empty; auth errors redirect |

### Mobile / Desktop
- Single column, max 4xl
- Touch-friendly cards (44px min)
- Sticky header with menu

### References
- Airbnb Trips — Trip cards, status clarity
- Uber Rides — Active ride prominence
- DoorDash Orders — Order status, quick actions

---

## Pro Dashboard

### Goal
Help pros manage jobs, accept work, and track earnings quickly.

### Structure
| # | Section | Purpose |
|---|---------|---------|
| 1 | Today's overview | **Earnings + jobs count** at a glance |
| 2 | Today's jobs | **Priority** — Jobs for today with status |
| 3 | Incoming requests | Open job requests to accept |
| 4 | Upcoming jobs | Future bookings |
| 5 | Earnings summary | This week, total, jobs completed |

### Components
| Component | Purpose |
|-----------|---------|
| Today overview card | Today's earnings $, jobs count |
| Today job row | Service, customer, time, status, price |
| Request row | Title, location, budget, link to requests |
| Upcoming job row | Service, customer, date, time, price |
| Earnings card | This week $, total earned, jobs completed |

### States
| State | Behavior |
|-------|----------|
| Loading | Section skeletons |
| Empty | "No jobs today", "No open requests", etc. with CTA |
| Error | Fetch failures fall back to empty |

### Mobile / Desktop
- Single column, max 4xl
- Fast decision making — status badges, clear CTAs
- Minimal friction — direct links to job detail, requests, earnings

### References
- Uber Driver — Today's earnings, trip list
- TaskRabbit — Job cards, accept flow
- Delivery driver apps — Earnings upfront, job queue
