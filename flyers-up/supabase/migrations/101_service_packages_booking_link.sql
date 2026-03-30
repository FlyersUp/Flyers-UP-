-- Phase 1: Service packages (pro-defined offers; optional booking linkage + snapshot)

CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  short_description TEXT,
  base_price_cents INTEGER NOT NULL CHECK (base_price_cents >= 0),
  estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_packages_deliverables_array_chk CHECK (jsonb_typeof(deliverables) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_service_packages_pro_user_id ON public.service_packages(pro_user_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_pro_active_sort
  ON public.service_packages(pro_user_id, is_active, sort_order);

COMMENT ON TABLE public.service_packages IS 'Lean Phase-1 pro service packages; optional selection on booking with snapshot.';

DROP TRIGGER IF EXISTS service_packages_updated_at ON public.service_packages;
CREATE TRIGGER service_packages_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS selected_package_id UUID REFERENCES public.service_packages(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS selected_package_snapshot JSONB;

COMMENT ON COLUMN public.bookings.selected_package_id IS 'Optional package chosen at request time; may be null if package deleted.';
COMMENT ON COLUMN public.bookings.selected_package_snapshot IS 'Immutable copy of package fields at booking creation.';

CREATE INDEX IF NOT EXISTS idx_bookings_selected_package_id ON public.bookings(selected_package_id)
  WHERE selected_package_id IS NOT NULL;

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

-- Owner: full access to own rows
CREATE POLICY "service_packages_select_own"
  ON public.service_packages FOR SELECT TO authenticated
  USING (pro_user_id = auth.uid());

CREATE POLICY "service_packages_insert_own"
  ON public.service_packages FOR INSERT TO authenticated
  WITH CHECK (pro_user_id = auth.uid());

CREATE POLICY "service_packages_update_own"
  ON public.service_packages FOR UPDATE TO authenticated
  USING (pro_user_id = auth.uid())
  WITH CHECK (pro_user_id = auth.uid());

CREATE POLICY "service_packages_delete_own"
  ON public.service_packages FOR DELETE TO authenticated
  USING (pro_user_id = auth.uid());

-- Authenticated customers: active packages for pros who are marked available
CREATE POLICY "service_packages_select_public_active"
  ON public.service_packages FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1
      FROM public.service_pros sp
      WHERE sp.user_id = service_packages.pro_user_id
        AND sp.available = true
    )
  );
