-- Prepare data model for Pro calendar features: travel buffer, prep buffer, blackout days, working hours.
-- Lightweight: add buffer_minutes only for now. Full features can extend later.

ALTER TABLE public.service_pros
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NULL DEFAULT 0;

COMMENT ON COLUMN public.service_pros.buffer_minutes IS 'Travel/prep buffer in minutes for calendar display. Future: blackout_dates, working_hours JSONB.';
