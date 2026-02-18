# Flyers Up – Route map (conversion refactor)

Post-refactor route flow and key entry points. Flow, messaging, and UI only; no tech stack or pricing changes.

---

## 1. Customer flow

| Step | Route | Notes |
|------|--------|------|
| Landing | `/` | Outcome copy: “Book a trusted pro in under 2 minutes”, trust metrics placeholders, “Book a Pro” CTA. |
| Sign in / up | `/auth`, `/signin`, `/signup?role=customer` | Pre-auth copy is outcome-driven. |
| Role | `/onboarding/role` | Choose Customer or Pro. |
| **Request flow (primary)** | **`/customer/request/start`** | **New.** After role = customer, users with missing name are sent here (not full onboarding first). Steps: (1) Select service, (2) Enter zip, (3) See 3–5 pros (API: `/api/customer/pros?categorySlug=&zip=`), (4) If needed, enter first + last name, then continue to booking. |
| Optional full profile | `/onboarding/customer` | First + last name, zip, phone. Used when resuming or when profile is incomplete and not going through request/start. |
| Customer home | `/customer` | Dashboard after name is set. |
| Browse categories | `/customer/categories` | Category grid. |
| Category pros | `/customer/categories/[id]` | Pros in category (ProCard shows “Completed X jobs”, “Available today”). |
| Pro profile (IG-style) | `/customer/pros/[id]` | Message button always works (chat or book flow). |
| Start booking | `/book/[proId]` | Booking form for a specific pro. |
| Past bookings (post-job) | Account `/account` | Past list shows “Rebook this pro”, “Save this pro”, “Schedule recurring” for completed items. |

**Routing rule (customer):**  
If `role === 'customer'` and (first name or last name missing) → redirect to **`/customer/request/start`** (with optional `?next=…`).  
Once name is set → `roleSafeNext ?? '/customer'`.

---

## 2. Pro flow

| Step | Route | Notes |
|------|--------|------|
| Landing (Pro section) | `/#pros` | Copy: “Earn more. No monthly fee.”, “NYC pros earn $800–$1,400/week”, “Only pay when you get paid. No monthly subscription.” |
| Sign in / up | `/auth`, `/signup?role=pro` | Same as customer. |
| Role | `/onboarding/role` | Choose Pro. |
| Pro onboarding | `/onboarding/pro` | **Step progress:** 1) Identity (first + last name), 2) Primary (and optional secondary) category, 3) Service area zip, 4) Review & go live. After save → “You’re live. Customers in [zip] are requesting [category].” → Go to dashboard. |
| Pro dashboard | `/pro` | **Demand banner:** If open requests > 0: “🔥 N customers looking for [service] near you right now” + “View requests”. **Post-job:** If any completed job: “Earnings & repeat work” card with “Earnings summary” CTA. |
| Requests | `/pro/requests` | Review and accept/decline. |
| Earnings | `/pro/earnings` | Earnings summary (surfaced after completed jobs). |

**Routing rule (pro):**  
If `role === 'pro'` and (onboarding_step, first name, last name, or zip missing) → **`/onboarding/pro`**.  
Else → `roleSafeNext ?? '/pro'`.

---

## 3. Admin

| Route | Purpose |
|-------|--------|
| `/admin` | Gate; links to Command Center, **Marketplace density**, Users, Bookings, Errors. |
| `/admin/command-center` | KPIs, burn, runway, targets & alerts. |
| **`/admin/density`** | **New.** Pros per category per zip; open requests per category per zip; “Shortage” / “High demand” notes. |

---

## 4. API (relevant to refactor)

| Method + path | Purpose |
|---------------|--------|
| `GET /api/customer/pros?categorySlug=&zip=` | Returns up to 5 pros for category, optionally filtered by zip (for `/customer/request/start` step 3). |

---

## 5. UI / copy principles (applied)

- Outcome-focused copy (speed, results, earnings) on landing and pre-auth.
- Trust and speed signals on hero (placeholders: Fulfillment rate %, Avg time to accept, Active pros in zip).
- Pro cards: “Completed X jobs”, “Available today”.
- Customer: minimal required info (first + last name) collected in request flow before booking confirmation; optional fields after.
- Pro: step progress and “You’re live” confirmation; demand banner and earnings/repeat CTAs on dashboard.
- Post-job: Rebook, Save pro, Schedule recurring (customer); Earnings summary and repeat messaging (pro).
- No new pricing models, subscriptions, or satisfaction guarantees; routing and UI/copy only.
