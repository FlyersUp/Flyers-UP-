-- ============================================
-- ACCOUNT DELETION: retain booking rows for finance / disputes
-- ============================================
-- When auth.users is deleted, bookings must NOT cascade away (audit, payouts,
-- pro-side history). Scrub PII in app, then deleteUser → customer_id becomes NULL.
--
-- If DROP CONSTRAINT fails (non-default name), inspect:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.bookings'::regclass AND contype = 'f';
-- ============================================

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;

ALTER TABLE public.bookings
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.bookings.customer_id IS
  'Set NULL when the customer auth user is deleted; address/notes scrubbed first. Financial columns retained.';
