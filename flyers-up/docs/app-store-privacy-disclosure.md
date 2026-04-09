# App Store / Play — privacy & data disclosure (working draft)

Use this when filling **App Store Connect → App Privacy** and Google Play’s **Data safety** form.  
Adjust wording to match your final production behavior and legal review.

## Public URLs (link from the app and in store listings)

| Purpose            | Path              |
|--------------------|-------------------|
| Privacy Policy     | `/legal/privacy`  |
| Terms of Service   | `/legal/terms`    |
| Support / contact  | `/support`        |

Apple expects the privacy policy URL in App Store Connect and **in-app access** to that policy.

## Data categories to disclose (verify against your live app)

Mark each as collected or not, and whether it is linked to the user’s identity.

- **Account / contact** — Name, email, phone, password (handled via your auth stack), profile fields for customers and pros.
- **User content** — Messages, booking details, photos or files uploaded for jobs, reviews.
- **Location** — If you collect addresses, service areas, or device location; specify approximate vs precise and purpose (e.g. matching, payouts).
- **Payment info** — Card/bank data is typically processed by **Stripe** (not stored on your servers in full PAN form); disclose payment processing and payouts.
- **Identifiers** — User IDs, device or push notification tokens, session cookies.
- **Diagnostics / analytics** — If you use **Google Analytics** (`NEXT_PUBLIC_GA_ID`) or similar, disclose usage analytics and crash data if applicable.
- **Push notifications** — If you use **OneSignal** (or similar), disclose notification tokens and messaging.

## Third-party partners (non-exhaustive — confirm in your dependencies and dashboards)

| Partner / area   | Typical data touched        | Your action                          |
|------------------|-----------------------------|--------------------------------------|
| **Supabase**     | Auth, database, storage     | List as infrastructure / backend     |
| **Stripe**       | Payments, Connect, payouts  | Stripe’s requirements + your DPA     |
| **OneSignal**    | Push tokens, delivery       | Match OneSignal dashboard + policies |
| **Google (GA4)** | Analytics, if enabled       | Only if loaded in production         |
| **Hosting (e.g. Vercel)** | Logs, IP (often as processor) | As applicable                 |

Update this table when you add or remove SDKs.

## Support & moderation ops (Phase 1)

- **Canonical config:** `lib/support/official-contact.ts` — `OFFICIAL_SUPPORT_EMAIL_DISPLAY` (client), `getSupportInboxEmail()` (server / notifications). Default **`support@flyersup.app`**; override with env (see `.env.example`).
- **Ticket email:** Optional until `RESEND_API_KEY` is set. Disable with `SUPPORT_TICKET_EMAIL_NOTIFICATIONS=0`. Rows always land in **`support_tickets`** even if email is skipped or fails.
- **Review queue (no in-app admin UI in Phase 1):** Use Supabase Table Editor (or SQL) on **`support_tickets`** and **`user_reports`** after migration **116**.

## Pre-submission QA (Capacitor WebView on real devices)

Run on **iOS and Android** shells with `CAPACITOR_SERVER_URL` set to **production** before store submission:

- Sign up, log in, log out  
- Customer booking flow  
- Pro accept / decline  
- Deposit payment, final payment  
- Role switching  
- Calendar interaction  
- Sidebar / bottom nav behavior  
- Password reset flow  
- File / photo upload (where used)  

Apple expects the app to behave predictably; broken web flows in the shell reflect poorly in review.

### Support & abuse (Phase 1)

- Submit a **support ticket** from customer and pro **Support & Legal** → confirm success message; verify row in Supabase **`support_tickets`** (after migration **116**).
- With **`RESEND_API_KEY`** set, confirm inbox receives email; with key unset, confirm ticket still saves and API response does **not** promise email delivery.
- **Report user** from pro profile, booking detail (customer), and chat headers (customer + pro) → row in **`user_reports`** with chosen reason and optional details.
- **Booking issue** link on booking detail still opens `/customer/bookings/[id]/issues/new` (separate from user report).
