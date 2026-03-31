-- Per-package recurring client cap + link recurring requests to a package when applicable

ALTER TABLE public.service_packages
  ADD COLUMN IF NOT EXISTS max_recurring_customer_slots INTEGER NULL
  CHECK (max_recurring_customer_slots IS NULL OR (max_recurring_customer_slots >= 0 AND max_recurring_customer_slots <= 100));

COMMENT ON COLUMN public.service_packages.max_recurring_customer_slots IS
  'Max distinct recurring customers for this package; NULL = no extra cap beyond pro recurring settings.';

ALTER TABLE public.recurring_series
  ADD COLUMN IF NOT EXISTS requested_package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_series_requested_package
  ON public.recurring_series (requested_package_id)
  WHERE requested_package_id IS NOT NULL;

COMMENT ON COLUMN public.recurring_series.requested_package_id IS
  'Optional package the customer chose when requesting recurring; used for per-package capacity.';
