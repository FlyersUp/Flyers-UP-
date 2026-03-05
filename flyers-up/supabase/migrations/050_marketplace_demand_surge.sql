-- ============================================
-- MARKETPLACE: Surge Pricing, Demand Heatmap, Instant Job Claim
-- ============================================
-- Tables: demand_requests, demand_cells, pro_presence, marketplace_events, admin_settings
-- Backward-compatible; does not modify existing booking flows.
-- ============================================

-- 1) demand_requests
CREATE TABLE IF NOT EXISTS public.demand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  customer_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  service_slug text NOT NULL,
  subcategory_slug text NULL,
  borough text NULL,
  neighborhood text NULL,
  lat double precision NULL,
  lng double precision NULL,
  scheduled_for timestamptz NULL,
  urgency text NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'priority', 'emergency')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'closed', 'expired', 'cancelled')),
  claimed_by_pro_id uuid NULL REFERENCES public.service_pros(id) ON DELETE SET NULL,
  claimed_at timestamptz NULL,
  base_price_cents integer NOT NULL DEFAULT 0,
  surge_multiplier numeric(6,3) NOT NULL DEFAULT 1.000,
  final_price_cents integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_demand_requests_service_status_created
  ON public.demand_requests (service_slug, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demand_requests_borough_neighborhood_status
  ON public.demand_requests (borough, neighborhood, status);
CREATE INDEX IF NOT EXISTS idx_demand_requests_claimed
  ON public.demand_requests (claimed_by_pro_id, claimed_at DESC) WHERE claimed_by_pro_id IS NOT NULL;

ALTER TABLE public.demand_requests ENABLE ROW LEVEL SECURITY;

-- Customers: insert own (customer_id = auth.uid()), read own
DROP POLICY IF EXISTS "Customers insert own demand_requests" ON public.demand_requests;
CREATE POLICY "Customers insert own demand_requests"
  ON public.demand_requests FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() OR customer_id IS NULL);

DROP POLICY IF EXISTS "Customers read own demand_requests" ON public.demand_requests;
CREATE POLICY "Customers read own demand_requests"
  ON public.demand_requests FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

-- Pros: read open requests only (limited columns via view or direct select)
DROP POLICY IF EXISTS "Pros read open demand_requests" ON public.demand_requests;
CREATE POLICY "Pros read open demand_requests"
  ON public.demand_requests FOR SELECT TO authenticated
  USING (
    status = 'open'
    AND EXISTS (SELECT 1 FROM public.service_pros sp WHERE sp.user_id = auth.uid())
  );

-- 2) demand_cells (heatmap aggregation snapshots)
CREATE TABLE IF NOT EXISTS public.demand_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cell_key text NOT NULL,
  service_slug text NOT NULL,
  open_requests integer NOT NULL DEFAULT 0,
  pros_online integer NOT NULL DEFAULT 0,
  surge_multiplier numeric(6,3) NOT NULL DEFAULT 1.000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cell_key, service_slug)
);

CREATE INDEX IF NOT EXISTS idx_demand_cells_cell_service ON public.demand_cells(cell_key, service_slug);

ALTER TABLE public.demand_cells ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write demand_cells (used by system + admin dashboard)
DROP POLICY IF EXISTS "Admins manage demand_cells" ON public.demand_cells;
CREATE POLICY "Admins manage demand_cells"
  ON public.demand_cells FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 3) pro_presence (tracks online pros for supply)
CREATE TABLE IF NOT EXISTS public.pro_presence (
  pro_id uuid PRIMARY KEY REFERENCES public.service_pros(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false,
  last_lat double precision NULL,
  last_lng double precision NULL,
  borough text NULL,
  neighborhood text NULL
);

CREATE INDEX IF NOT EXISTS idx_pro_presence_online_updated
  ON public.pro_presence (is_online, updated_at DESC) WHERE is_online = true;

ALTER TABLE public.pro_presence ENABLE ROW LEVEL SECURITY;

-- Pros: upsert own row (pro_id = their service_pros.id)
DROP POLICY IF EXISTS "Pros upsert own pro_presence" ON public.pro_presence;
CREATE POLICY "Pros upsert own pro_presence"
  ON public.pro_presence FOR ALL TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()))
  WITH CHECK (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));

-- Admins: read all
DROP POLICY IF EXISTS "Admins read pro_presence" ON public.pro_presence;
CREATE POLICY "Admins read pro_presence"
  ON public.pro_presence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 4) marketplace_events (admin audit log)
CREATE TABLE IF NOT EXISTS public.marketplace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_type text NOT NULL CHECK (actor_type IN ('system', 'admin', 'customer', 'pro')),
  actor_id uuid NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_marketplace_events_type_created
  ON public.marketplace_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_created
  ON public.marketplace_events (created_at DESC);

ALTER TABLE public.marketplace_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read marketplace_events
DROP POLICY IF EXISTS "Admins read marketplace_events" ON public.marketplace_events;
CREATE POLICY "Admins read marketplace_events"
  ON public.marketplace_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- System/service role inserts (via admin client or RPC)
-- No INSERT policy for authenticated - events are inserted by RPCs or admin client

-- 5) admin_settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage admin_settings" ON public.admin_settings;
CREATE POLICY "Admins manage admin_settings"
  ON public.admin_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Seed default admin_settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('surge_rules', '{"enabled": true, "maxMultiplier": 1.30, "minMultiplier": 1.00, "targetRequestsPerPro": 2.5, "urgencyBoost": {"normal": 1.0, "priority": 1.05, "emergency": 1.10}}'::jsonb),
  ('heatmap_rules', '{"enabled": true, "cellMode": "borough_neighborhood", "staleMinutes": 10}'::jsonb),
  ('claim_rules', '{"enabled": true, "holdSeconds": 30}'::jsonb)
ON CONFLICT (key) DO NOTHING;
