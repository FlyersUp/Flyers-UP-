-- Deposit / operations validation reads service_pros.same_day_enabled (062).
-- Settings and discovery use same_day_available; it was not always mirrored → false negatives on same-day pay.
UPDATE public.service_pros
SET same_day_enabled = COALESCE(same_day_available, same_day_enabled, false);

COMMENT ON COLUMN public.service_pros.same_day_enabled IS
  'Allow same-day bookings (keep in sync with same_day_available; deposit validation reads this column).';
