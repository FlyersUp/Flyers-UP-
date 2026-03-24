-- ============================================
-- BOOKING PAYOUT GUARDRAILS
-- ============================================
-- Strict state machine, payout protection, lateness, no-show, reliability.
-- Deposit held by platform until verified completion. No early payout.
-- ============================================

-- 1. BOOKINGS: New timestamps and lateness fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deposit_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS awaiting_pro_arrival_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS late_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS severe_late_warning_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_eligible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_block_reason TEXT,
  ADD COLUMN IF NOT EXISTS eta_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS eta_note TEXT,
  ADD COLUMN IF NOT EXISTS eta_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eta_update_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS canceled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS dispute_open BOOLEAN DEFAULT false;

-- Check-in / arrival verification
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_method TEXT,
  ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_distance_meters INTEGER,
  ADD COLUMN IF NOT EXISTS arrival_verified BOOLEAN DEFAULT false;

-- Completion verification
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completion_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

COMMENT ON COLUMN public.bookings.scheduled_start_at IS 'Computed: service_date + service_time for lateness logic';
COMMENT ON COLUMN public.bookings.grace_period_minutes IS 'Minutes after scheduled_start before no-show cancel allowed (default 60)';
COMMENT ON COLUMN public.bookings.no_show_eligible_at IS 'When customer can cancel penalty-free due to pro no-show';
COMMENT ON COLUMN public.bookings.payout_block_reason IS 'Why payout is blocked: no_arrival, no_start, no_completion, dispute, no_show';
COMMENT ON COLUMN public.bookings.check_in_method IS 'gps, manual, customer_confirmed, admin';
COMMENT ON COLUMN public.bookings.arrival_verified IS 'True if check-in within geo radius or customer confirmed';
COMMENT ON COLUMN public.bookings.cancellation_reason IS 'pro_no_show, customer_request, pro_request, admin, expired';
COMMENT ON COLUMN public.bookings.dispute_open IS 'Block payout when true';

-- 2. Expand status constraint: add new statuses
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'requested', 'accepted', 'payment_required', 'deposit_due', 'deposit_paid',
    'awaiting_deposit_payment', 'awaiting_pro_arrival', 'on_the_way', 'pro_en_route',
    'arrived', 'in_progress', 'completed_pending_payment', 'awaiting_payment',
    'work_completed_by_pro', 'awaiting_remaining_payment', 'awaiting_customer_confirmation',
    'completed', 'customer_confirmed', 'auto_confirmed',
    'paid', 'payout_eligible', 'payout_released',
    'expired_unpaid', 'cancelled', 'declined',
    'cancelled_expired', 'cancelled_by_customer', 'cancelled_by_pro', 'cancelled_admin',
    'canceled_no_show_pro', 'canceled_no_show_customer',
    'refund_pending', 'refunded', 'disputed',
    'pending', 'pending_pro_acceptance'
  ));

-- 3. Backfill scheduled_start_at from service_date + service_time
-- Only when service_time is a valid HH:MM or HH:MM:SS (skip "TBD", "Morning", etc.)
UPDATE public.bookings
SET scheduled_start_at = (service_date::date + service_time::interval)::timestamptz
WHERE scheduled_start_at IS NULL
  AND service_date IS NOT NULL
  AND service_time ~ '^\d{1,2}:\d{2}(:\d{2})?$';

-- 4. PRO_BOOKING_INCIDENTS: reliability / strike system
CREATE TABLE IF NOT EXISTS public.pro_booking_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'late_15', 'late_30', 'no_show', 'customer_complaint', 'canceled_after_accept'
  )),
  incident_points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_pro_booking_incidents_pro ON public.pro_booking_incidents(pro_id);
-- Note: Cannot use WHERE expires_at > now() - now() is not IMMUTABLE. Query adds that filter.
CREATE INDEX IF NOT EXISTS idx_pro_booking_incidents_pro_expires ON public.pro_booking_incidents(pro_id, expires_at);
ALTER TABLE public.pro_booking_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage pro incidents" ON public.pro_booking_incidents;
CREATE POLICY "Admins can manage pro incidents"
  ON public.pro_booking_incidents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 5. PRO_RELIABILITY: computed metrics (optional materialized view / table)
CREATE TABLE IF NOT EXISTS public.pro_reliability (
  pro_id UUID PRIMARY KEY REFERENCES public.service_pros(id) ON DELETE CASCADE,
  on_time_rate NUMERIC(5,4) DEFAULT 1,
  late_arrival_count_30d INTEGER DEFAULT 0,
  no_show_count_30d INTEGER DEFAULT 0,
  cancellation_after_accept_count_30d INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,4) DEFAULT 1,
  reliability_score INTEGER DEFAULT 100,
  trust_tier TEXT DEFAULT 'standard',
  booking_restriction_level INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pro_reliability_score ON public.pro_reliability(reliability_score);
ALTER TABLE public.pro_reliability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pros can read own reliability" ON public.pro_reliability;
CREATE POLICY "Pros can read own reliability"
  ON public.pro_reliability FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_pros sp WHERE sp.id = pro_id AND sp.user_id = auth.uid()));

-- 6. BOOKING_EVENTS: add actor columns for audit
ALTER TABLE public.booking_events
  ADD COLUMN IF NOT EXISTS actor_type TEXT,
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS old_status TEXT,
  ADD COLUMN IF NOT EXISTS new_status TEXT;

-- 7. Indexes for lateness cron and payout
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_start_lateness
  ON public.bookings(scheduled_start_at)
  WHERE status IN ('deposit_paid', 'awaiting_pro_arrival', 'pro_en_route', 'on_the_way')
  AND arrived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_no_show_eligible
  ON public.bookings(no_show_eligible_at)
  WHERE no_show_eligible_at IS NOT NULL AND arrived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_payout_eligible
  ON public.bookings(status)
  WHERE status IN ('customer_confirmed', 'auto_confirmed', 'completed');
