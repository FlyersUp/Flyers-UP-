-- ============================================
-- PRICE NEGOTIATION FOR BOOKINGS
-- ============================================
-- Flow: Customer sends request (optional budget) -> Pro: accept budget / send quote / message
--       -> Customer: accept quote / counter / message. Max 2 rounds.
--       -> When accepted: lock final_price, show payment.
-- ============================================

-- 1. BOOKINGS: price negotiation fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS price_proposed NUMERIC,
  ADD COLUMN IF NOT EXISTS price_counter NUMERIC,
  ADD COLUMN IF NOT EXISTS price_final NUMERIC,
  ADD COLUMN IF NOT EXISTS price_status TEXT DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS negotiation_round SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_budget NUMERIC;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_price_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_price_status_check
  CHECK (price_status IN ('requested', 'quoted', 'countered', 'accepted', 'declined'));

COMMENT ON COLUMN public.bookings.price_proposed IS 'Pro proposed price (last quote)';
COMMENT ON COLUMN public.bookings.price_counter IS 'Customer counter offer';
COMMENT ON COLUMN public.bookings.price_final IS 'Locked price when negotiation accepted';
COMMENT ON COLUMN public.bookings.price_status IS 'requested|quoted|countered|accepted|declined';
COMMENT ON COLUMN public.bookings.negotiation_round IS '0=no quotes, 1-2=rounds used';
COMMENT ON COLUMN public.bookings.customer_budget IS 'Optional budget from job request';

-- 2. BOOKING_QUOTES: quote cards in chat (rendered alongside messages)
CREATE TABLE IF NOT EXISTS public.booking_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'pro')),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  message TEXT,
  round SMALLINT NOT NULL DEFAULT 1 CHECK (round >= 1 AND round <= 2),
  action TEXT NOT NULL CHECK (action IN ('proposed', 'countered', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_quotes_booking ON public.booking_quotes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_quotes_created ON public.booking_quotes(booking_id, created_at);

ALTER TABLE public.booking_quotes ENABLE ROW LEVEL SECURITY;

-- Same as booking_messages: participants can view/insert
DROP POLICY IF EXISTS "Participants can view booking quotes" ON public.booking_quotes;
CREATE POLICY "Participants can view booking quotes"
  ON public.booking_quotes FOR SELECT TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can insert booking quotes" ON public.booking_quotes;
CREATE POLICY "Participants can insert booking quotes"
  ON public.booking_quotes FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role IN ('customer', 'pro')
    AND booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );
