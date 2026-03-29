-- ============================================
-- Multi-day milestones + live progress + final confirmation audit
-- Server-only writes (RLS SELECT for participants); APIs use service role.
-- ============================================

-- A) Bookings: multi-day workflow + final confirmation + materials metadata
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_multi_day BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_confirm_window_hours INTEGER NOT NULL DEFAULT 24
    CHECK (auto_confirm_window_hours >= 1 AND auto_confirm_window_hours <= 168),
  ADD COLUMN IF NOT EXISTS current_milestone_index INTEGER,
  ADD COLUMN IF NOT EXISTS final_completion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_auto_confirm_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_confirmation_source TEXT
    CHECK (final_confirmation_source IS NULL OR final_confirmation_source IN ('customer', 'auto')),
  ADD COLUMN IF NOT EXISTS progress_status TEXT,
  ADD COLUMN IF NOT EXISTS estimated_start_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_end_date DATE,
  ADD COLUMN IF NOT EXISTS material_handling_mode TEXT
    CHECK (material_handling_mode IS NULL OR material_handling_mode IN ('pro_provides', 'customer_provides')),
  ADD COLUMN IF NOT EXISTS materials_list JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.bookings.is_multi_day IS 'When true, job uses booking_milestones before final completion';
COMMENT ON COLUMN public.bookings.auto_confirm_window_hours IS 'Hours after milestone/final completion before customer auto-confirm (cron)';
COMMENT ON COLUMN public.bookings.progress_status IS 'Coarse UX state: arrived, work_started, milestone_active, final_pending, completed';
COMMENT ON COLUMN public.bookings.material_handling_mode IS 'Materials vs tools: customer may supply materials; tools stay pro responsibility';

-- B) Milestones
CREATE TABLE IF NOT EXISTS public.booking_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  milestone_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'completed_pending_confirmation',
    'confirmed',
    'auto_confirmed',
    'disputed',
    'cancelled'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  confirmation_due_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmation_source TEXT CHECK (confirmation_source IS NULL OR confirmation_source IN ('customer', 'auto')),
  proof_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  proof_notes TEXT,
  dispute_open BOOLEAN NOT NULL DEFAULT false,
  payout_release_eligible_at TIMESTAMPTZ,
  payout_released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, milestone_index)
);

CREATE INDEX IF NOT EXISTS idx_booking_milestones_booking_id ON public.booking_milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_milestones_pending_confirm
  ON public.booking_milestones(booking_id)
  WHERE status = 'completed_pending_confirmation';

COMMENT ON TABLE public.booking_milestones IS 'Per-milestone progress, proof, confirmation; payout still one Stripe transfer per booking when all gates pass';

-- C) Progress audit trail
CREATE TABLE IF NOT EXISTS public.booking_progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.booking_milestones(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_progress_events_booking ON public.booking_progress_events(booking_id, created_at DESC);

COMMENT ON TABLE public.booking_progress_events IS 'Timeline: arrived, milestone_*, final_*, disputes; server inserts only';

-- RLS: read for booking participants only; mutations via service role
ALTER TABLE public.booking_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_progress_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_milestones_participant_select" ON public.booking_milestones;
CREATE POLICY "booking_milestones_participant_select"
  ON public.booking_milestones FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "booking_progress_events_participant_select" ON public.booking_progress_events;
CREATE POLICY "booking_progress_events_participant_select"
  ON public.booking_progress_events FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );
