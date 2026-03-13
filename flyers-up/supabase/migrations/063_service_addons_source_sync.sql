-- Add source column to service_addons to distinguish manual add-ons from service_types sync.
-- 'manual' = created at /pro/addons; 'service_types' = synced from Your Services (pricing).
ALTER TABLE public.service_addons ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.service_addons.source IS 'manual: from /pro/addons; service_types: synced from service_pros.service_types';
