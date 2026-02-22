# Flyers Up — Launch To-Do List

Pre-launch checklist for www.flyersup.app.

---

## Done (implemented in code)

| Area | Status |
|------|--------|
| **Stripe Checkout** | Customer payment flow at `/customer/booking/pay` → `/api/stripe/checkout` |
| **Stripe Connect** | Onboard at `/pro/connect`, return at `/api/stripe/connect/return` |
| **Stripe Webhook** | Handles `payment_intent.succeeded`, `payment_intent.payment_failed`; creates pro_earnings |
| **Auth** | Email OTP (6-digit), Google; `/auth`, `/auth/callback` |
| **Onboarding** | Customer + Pro flows; role selection; Stripe Connect required for pros |
| **Booking flow** | Request → accept → pay; radius search for pros |
| **Legal pages** | Terms, Privacy, Refund Policy; `/api/legal/acceptance` |
| **Error handling** | `error.tsx`, `global-error.tsx`; onboard route error handling |
| **PWA** | `manifest.json`, layout metadata; next-pwa |
| **Migrations** | 23 migrations including phase 1 categories, zipcodes, Stripe Connect |
| **Build** | `npm run build --webpack` succeeds |

---

## Not done / needs verification

### Stripe

- [ ] **Platform account activated** — Complete [Stripe account onboarding](https://dashboard.stripe.com/account/onboarding) (verify if done)
- [ ] **Production API keys** — Set live `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel
- [ ] **Production webhook** — Add `https://www.flyersup.app/api/stripe/webhook` in [Stripe Webhooks](https://dashboard.stripe.com/webhooks); events: `payment_intent.succeeded`, `payment_intent.payment_failed`
- [ ] **Webhook secret** — Add `STRIPE_WEBHOOK_SECRET` to Vercel
- [ ] **Connect flow** — End-to-end test: pro completes Connect, receives payout

### Supabase

- [ ] **Production env vars** — `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel
- [ ] **Redirect URLs** — Add `https://www.flyersup.app/auth/callback`, `https://www.flyersup.app/**`
- [ ] **Site URL** — `https://www.flyersup.app`
- [ ] **Email OTP** — Supabase template uses `{{ .Token }}`
- [ ] **Google OAuth** — Enabled for production domain
- [ ] **Migrations** — All 23 migrations applied to production Supabase

### Deployment (Vercel)

- [ ] **Domain** — `www.flyersup.app` pointed to Vercel
- [ ] **Env vars** — All production env vars set
- [ ] **Preview test** — Deploy preview, smoke test before production

### Database & Content

- [ ] **Categories** — Migration 019 seeds Phase 1; run on production
- [ ] **Zipcodes** — Table populated for radius search
- [ ] **Feature flags** — ITIN, etc., if needed

### PWA Icons (missing)

- [ ] **Add icons** — `public/icons/icon-192.png` and `icon-512.png` are referenced in manifest but **do not exist** (only `safety-check.svg` in icons folder)

### Manual QA

- [x] **Customer signup** — Email OTP + Google → role → onboarding → dashboard
- [x] **Pro signup** — Role → pro onboarding → Stripe Connect → dashboard
- [x] **Full booking** — Request → accept → pay → webhook → earnings

### Post-Launch

- [ ] **Rotate keys** — If any keys were exposed (e.g. in chat), rotate in Stripe/Supabase
- [ ] **Monitor** — First real booking; Stripe Dashboard; Vercel logs
- [ ] **Support** — Help/support contact for users
