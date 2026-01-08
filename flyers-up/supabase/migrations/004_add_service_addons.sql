-- ============================================
-- ADD-ON FEES MIGRATION
-- ============================================
-- This migration creates tables for service add-ons and booking add-on snapshots.
-- 
-- IMPORTANT: Add-ons are SNAPSHOTTED at booking creation time to preserve
-- pricing integrity. The booking_addons table stores immutable snapshots of
-- title and price at the moment of booking, ensuring that price changes to
-- service_addons don't affect historical bookings.
-- ============================================

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Service add-ons: optional flat-price add-ons that pros can offer per category
CREATE TABLE IF NOT EXISTS public.service_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_category TEXT NOT NULL, -- Category slug (e.g., 'cleaning', 'plumbing')
  title TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booking add-on snapshots: immutable records of add-ons selected at booking time
-- These preserve the exact title and price at booking creation, regardless of
-- future changes to service_addons.
CREATE TABLE IF NOT EXISTS public.booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.service_addons(id),
  title_snapshot TEXT NOT NULL, -- Snapshot of title at booking time
  price_snapshot_cents INTEGER NOT NULL CHECK (price_snapshot_cents >= 0), -- Snapshot of price at booking time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Index for fetching active add-ons by pro and category (used in checkout)
CREATE INDEX IF NOT EXISTS idx_service_addons_pro_category_active 
  ON public.service_addons(pro_id, service_category, is_active) 
  WHERE is_active = true;

-- Index for fetching add-ons for a booking
CREATE INDEX IF NOT EXISTS idx_booking_addons_booking 
  ON public.booking_addons(booking_id);

-- ============================================
-- 3. CREATE TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_service_addons_updated_at
  BEFORE UPDATE ON public.service_addons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to enforce max 4 active add-ons per pro per category
CREATE OR REPLACE FUNCTION enforce_max_active_addons()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  -- Only check when setting is_active = true
  IF NEW.is_active = true THEN
    -- Count active add-ons for this pro + category (excluding current row if updating)
    SELECT COUNT(*) INTO active_count
    FROM public.service_addons
    WHERE pro_id = NEW.pro_id
      AND service_category = NEW.service_category
      AND is_active = true
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- If we're updating an existing row that was already active, don't count it
    IF TG_OP = 'UPDATE' AND OLD.is_active = true THEN
      active_count := active_count - 1;
    END IF;
    
    -- Block if we would exceed 4 active add-ons
    IF active_count >= 4 THEN
      RAISE EXCEPTION 'Maximum 4 active add-ons allowed per pro per service category. Current count: %', active_count;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_max_active_addons
  BEFORE INSERT OR UPDATE ON public.service_addons
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_active_addons();

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES
-- ============================================

-- SERVICE_ADDONS POLICIES

-- SELECT: Anyone authenticated can read active add-ons (for discovery/checkout)
CREATE POLICY "Anyone can view active add-ons"
  ON public.service_addons FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Pros can also view their own inactive add-ons (for management)
CREATE POLICY "Pros can view own add-ons"
  ON public.service_addons FOR SELECT
  TO authenticated
  USING (
    pro_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: Only the pro who owns the add-on
CREATE POLICY "Pros can manage own add-ons"
  ON public.service_addons FOR ALL
  TO authenticated
  USING (
    pro_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    pro_id IN (
      SELECT id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- BOOKING_ADDONS POLICIES

-- SELECT: Only the booking's customer and the booking's pro can read
CREATE POLICY "Booking parties can view booking add-ons"
  ON public.booking_addons FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE customer_id = auth.uid()
         OR pro_id IN (
           SELECT id FROM public.service_pros WHERE user_id = auth.uid()
         )
    )
  );

-- INSERT: Only the booking's customer can insert at booking creation time
CREATE POLICY "Customers can create booking add-ons"
  ON public.booking_addons FOR INSERT
  TO authenticated
  WITH CHECK (
    booking_id IN (
      SELECT id FROM public.bookings WHERE customer_id = auth.uid()
    )
  );

-- UPDATE/DELETE: Disallow (no policies) - booking_addons are immutable










