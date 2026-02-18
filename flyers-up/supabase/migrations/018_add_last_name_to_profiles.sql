-- Add last_name to profiles for customer and pro onboarding (first + last name).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name text;

COMMENT ON COLUMN public.profiles.last_name IS 'Last name; collected with first_name in onboarding.';
