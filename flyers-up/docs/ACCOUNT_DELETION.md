# Account deletion (Flyers Up)

## What ships today

- **Customers** can permanently delete their account from **Settings → Privacy & Security** by typing the confirmation phrase and confirming.
- The server route is `POST /api/account/delete` (session cookie auth). It uses the **Supabase service role** to perform irreversible steps.

## Minimal compliant path

### 1. Why not only `auth.admin.deleteUser`?

Many tables reference `auth.users(id) ON DELETE CASCADE`. In particular, `bookings.customer_id` originally used **CASCADE**, which would **destroy booking rows** when the customer deleted their account—bad for:

- Stripe / payout reconciliation  
- Pro-side job history  
- Disputes and support  

So migration **`082_account_deletion_bookings_customer_nullable.sql`** changes `bookings.customer_id` to **nullable** with **`ON DELETE SET NULL`**. After deletion, the booking row remains with `customer_id = NULL` and scrubbed PII.

### 2. Order of operations (customer)

1. **Guards:** Must be logged in; must not have a `service_pros` row (pro); must not be `role = admin` on `profiles`.
2. **Messaging:** Delete `conversations` where `customer_id = user` (CASCADE removes `conversation_messages` for those threads).
3. **Booking chat:** Delete `booking_messages` where `sender_id = user` (removes the customer’s lines; pro messages stay unless you add redaction later).
4. **Bookings:** Update rows where `customer_id = user`: set `address` to `[removed]`, `notes` to `NULL` (extend this list if new PII columns are added).
5. **Stripe (optional):** If `profiles.stripe_customer_id` is set, call `stripe.customers.del` when Stripe is configured; failures are logged and do not block deletion.
6. **Auth:** `supabase.auth.admin.deleteUser(userId)` — removes `auth.users` and any rows that still **CASCADE** from auth (e.g. `profiles`, `user_app_preferences`, `notifications` where defined that way).

### 3. Hard delete vs anonymize

| Data | Approach |
|------|----------|
| **Bookings (financial / ops)** | **Retain row**, `customer_id` → `NULL` via FK, **scrub** address/notes in app before `deleteUser`. |
| **Auth + profile** | **Hard delete** user (Supabase removes `profiles` if CASCADE). |
| **Conversations (non-booking chat)** | **Hard delete** threads for that customer. |
| **Booking messages from customer** | **Hard delete** rows where `sender_id` = customer. |
| **Job requests, reviews, etc.** | Mostly **CASCADE** on auth delete; acceptable for “erase my participation” for customers. Revisit if you must retain anonymized reviews for pro stats. |

### 4. Service pros

**Not** self-service deleted in-app: deleting a pro’s `auth.users` row would CASCADE through `service_pros` and likely **remove or break bookings** tied to `pro_id`. Closure should be **manual** (support@flyersup.app): offboard Stripe Connect, settle payouts, then scripted anonymization or admin delete.

### 5. Store / regulator checklist

- [ ] Run migration `082` on production before enabling the button in a release.  
- [ ] Privacy Policy links to this flow and states retention for **transactions**.  
- [ ] Log deletions (optional): append-only `account_deletion_audit` table with `user_id`, `at`, `initiator`.  
- [ ] Re-generate Supabase types after migration (`bookings.customer_id` nullable).

### 6. QA

- Customer with **no** bookings → delete → cannot sign in again.  
- Customer with **past** booking → booking still listed for **pro** (no customer name from auth); `customer_id` null; address scrubbed.  
- **Pro** hitting API → `403` with support email.  
- Wrong confirmation phrase → `400`.
