-- ============================================
-- MIGRATION: Admin Command Center tables
-- ============================================
-- Tables for admin-only dashboard: inputs, targets, alerts log.
-- RLS: only admin users (profiles.role = 'admin') can read/write.
-- Service role (createAdminSupabaseClient) bypasses RLS.
-- Safe to re-run (idempotent).
-- ============================================

-- admin_inputs: key-value + optional month for time-scoped values (e.g. ad_spend_monthly, cash_balance, marketing_spend)
CREATE TABLE IF NOT EXISTS public.admin_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value text NOT NULL,
  month text NULL, -- e.g. '2025-02' for monthly inputs; NULL = global
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_inputs_key_month
  ON public.admin_inputs (key, COALESCE(month, ''));

CREATE INDEX IF NOT EXISTS idx_admin_inputs_key ON public.admin_inputs (key);

ALTER TABLE public.admin_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage admin_inputs" ON public.admin_inputs;
CREATE POLICY "Admins can manage admin_inputs"
  ON public.admin_inputs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- admin_targets: single row of targets (MRR, jobs, active pros, fill rate, time-to-match)
CREATE TABLE IF NOT EXISTS public.admin_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrr_target numeric NULL,
  jobs_target integer NULL,
  active_pros_target integer NULL,
  fill_rate_target numeric NULL, -- e.g. 0.85 for 85%
  time_to_match_target_hours numeric NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure only one row: use a constant id or trigger. We use one fixed id.
INSERT INTO public.admin_targets (id, mrr_target, jobs_target, active_pros_target, fill_rate_target, time_to_match_target_hours, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  40000,
  500,
  50,
  0.85,
  24,
  now()
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage admin_targets" ON public.admin_targets;
CREATE POLICY "Admins can manage admin_targets"
  ON public.admin_targets FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- admin_alerts_log: optional log of triggered alerts (type, severity, message)
CREATE TABLE IF NOT EXISTS public.admin_alerts_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  message text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_log_created_at ON public.admin_alerts_log (created_at DESC);

ALTER TABLE public.admin_alerts_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage admin_alerts_log" ON public.admin_alerts_log;
CREATE POLICY "Admins can manage admin_alerts_log"
  ON public.admin_alerts_log FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

COMMENT ON TABLE public.admin_inputs IS 'Admin-editable inputs: marketing_spend, ad_spend_monthly, cash_balance, payroll_toggle, etc.';
COMMENT ON TABLE public.admin_targets IS 'Single row of MRR/jobs/pros/fill-rate/time-to-match targets for command center.';
COMMENT ON TABLE public.admin_alerts_log IS 'Log of triggered alerts (fill rate, disputes spike, chargebacks).';
