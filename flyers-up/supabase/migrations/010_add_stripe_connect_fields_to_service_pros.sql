-- ============================================
-- MIGRATION: Stripe Connect fields for service_pros
-- ============================================
-- Purpose:
-- - Store Stripe Connect account reference + onboarding status flags
-- - Keep Connect onboarding routes compatible with DB schema
-- Safe to re-run (idempotent).

ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;

