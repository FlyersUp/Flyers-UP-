This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## ITIN onboarding feature flag (staging)

This repo includes **ITIN tax-identity scaffolding** for Service Providers. It is **OFF by default** and **does not store any raw SSN/ITIN values**.

### Enable ITIN option (staging-only)

1) **Set environment variable** (Vercel → Project → Settings → Environment Variables):
- `FEATURE_ITIN_ONBOARDING=true`

2) **Enable the DB flag** (Supabase SQL editor):

```sql
update public.feature_flags
set enabled = true
where key = 'FEATURE_ITIN_ONBOARDING';
```

3) **Run migrations** (Supabase):
- Apply `flyers-up/supabase/migrations/007_tax_payouts_scaffolding.sql`

### Notes
- ITIN option is shown only when **both** env and DB flag are enabled.
- The app stores only:
  - tax ID **type** (SSN/ITIN/OTHER)
  - tax forms **status**
  - Stripe Connect account references
  - payout hold controls (days/boolean)

## Auth + onboarding (magic link + Google)

### Supabase redirect URLs

To support **email magic links** and **Google OAuth**, add these URLs in Supabase:

- `http://localhost:3000/auth/callback`
- `https://www.flyersup.app/auth/callback`

For **Vercel preview deployments**, Supabase supports wildcard allow-list patterns. Add:

- `https://*-<your-vercel-team-or-account-slug>.vercel.app/**`

Where `<your-vercel-team-or-account-slug>` is the suffix in your preview URLs (example preview URL:
`https://flyers-up-git-main-your-slug.vercel.app` → slug is `your-slug`).

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: your primary domain (e.g. `https://www.flyersup.app`)
- **Redirect URLs**: include the callback URLs above (plus any preview domains you use)

### Required: Email + Google providers enabled/configured

If magic-link sign-in fails with **"Error sending magic link email"**, check Supabase Dashboard → **Authentication → Providers → Email**:
- If you configured a custom SMTP provider, make sure **SMTP Host** is a real SMTP hostname (for example `smtp.gmail.com`), not an email address.
- Also ensure Sender name/email, port, username/password are set correctly for your email provider.

If Google sign-in fails, check Supabase Dashboard → **Authentication → Providers → Google** and ensure the provider is enabled and configured.

### App routes

- `/auth`: entry screen (email + Google)
- `/auth/callback`: handles magic link/OAuth return
- `/onboarding/role`: required role selection when `profiles.role` is missing
- `/onboarding/customer`: minimal customer profile
- `/onboarding/pro`: minimal pro profile + category + service area zip

