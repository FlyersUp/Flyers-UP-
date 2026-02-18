# Pro and Customer: Steps to Become Live

This doc summarizes the flows a **Pro** and a **Customer** go through to become “live” (able to use the app and, for pros, appear in the marketplace).

---

## Customer: Steps to become live

1. **Sign in**  
   Go to `/auth` (or `/signin`) and sign in with **email (6-digit code)** or **Google**.

2. **Role**  
   If the account has no role yet, you’re sent to **`/onboarding/role`**. Choose **Customer**.

3. **Customer profile (minimal)**  
   You’re sent to **`/onboarding/customer`**. Enter:
   - **First name** (required)
   - Zip (optional)
   - Phone (optional)  
   Submit → `onboarding_step` is cleared and role is set to `customer`.

4. **Live**  
   You’re redirected to **`/customer`** (customer home). You can:
   - Browse categories and pros
   - Open pro profiles (IG-style at `/customer/pros/[id]`)
   - **Book** a pro (starts at `/book/[proId]`)
   - **Message** (after at least one booking with that pro; otherwise Message links to the booking flow)

**Summary:** Auth → Role = Customer → Customer onboarding (name) → `/customer`.

---

## Pro: Steps to become live

1. **Sign in**  
   Same as customer: `/auth` with email code or Google.

2. **Role**  
   On **`/onboarding/role`** choose **Pro**.

3. **Pro profile (minimal)**  
   On **`/onboarding/pro`** you must complete:
   - **First name**
   - **Primary category**
   - **Secondary category** (optional)
   - **Service area zip**  
   On submit:
   - `profiles`: `role = 'pro'`, `first_name`, `zip_code`, `onboarding_step = null`
   - `service_pros`: row created/updated with `display_name`, `category_id`, `secondary_category_id`, `service_area_zip`

4. **Pro dashboard gate**  
   When you hit **`/pro`**, the server checks:
   - User is signed in and `profiles.role === 'pro'`.
   - `profiles`: `first_name` and `zip_code` are set; `onboarding_step` is not `pro_profile`.
   - `service_pros`: there is a row for this user with `display_name`, `category_id`, and `service_area_zip` set.  
   If any of that is missing, you’re redirected to **`/onboarding/pro`**.

5. **Visible in marketplace**  
   The public pro profile (e.g. `/customer/pros/[id]` or `/pro/[proId]`) is loaded from **`getPublicProProfileByIdServer(proId)`**, which:
   - Looks up **`service_pros`** by `id` (the UUID used in the URL).
   - If **`service_pros.available === false`**, the pro is **not** returned (not found). So a pro is “live” in browse/search when `available` is not set to `false` (default is typically true).

**Summary:** Auth → Role = Pro → Pro onboarding (name, category, service zip + `service_pros` row) → `/pro`; profile is visible as long as `service_pros.available !== false`.

---

## Routes reference

| Step              | Customer route              | Pro route                |
|------------------|-----------------------------|---------------------------|
| Sign in           | `/auth`                     | `/auth`                   |
| Choose role       | `/onboarding/role`          | `/onboarding/role`        |
| Profile onboarding| `/onboarding/customer`     | `/onboarding/pro`         |
| Home / dashboard  | `/customer`                 | `/pro`                    |
| Pro profile (IG)  | `/customer/pros/[id]`       | `/pro/[proId]` (public)   |

---

## Resuming and role switch

- **Resume:** If `profiles.onboarding_step` is set (`role`, `customer_profile`, or `pro_profile`) or required fields are missing, **`routeAfterAuth`** sends the user back to the right onboarding page after sign-in.
- **Role switch:** From the side menu, “Switch role” goes to **`/onboarding/role?switch=1&next=…`**, so a signed-in user can change role and then complete the other role’s onboarding.
