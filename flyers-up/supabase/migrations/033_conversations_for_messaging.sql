-- ============================================
-- MIGRATION: Conversations for messaging without booking
-- ============================================
-- When customer clicks "Message" (no existing booking), create conversation only.
-- Only "Request Booking" creates a booking.
-- ============================================

-- Conversations: customer + pro messaging without a booking
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES public.service_pros(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, pro_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_pro ON public.conversations(pro_id);

-- Conversation messages
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'pro')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON public.conversation_messages(conversation_id);

-- RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own conversations" ON public.conversations;
CREATE POLICY "Customers can view own conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Pros can view their conversations" ON public.conversations;
CREATE POLICY "Pros can view their conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can create conversations" ON public.conversations;
CREATE POLICY "Customers can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Participants can view conversation messages" ON public.conversation_messages;
CREATE POLICY "Participants can view conversation messages"
  ON public.conversation_messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.customer_id = auth.uid()
         OR c.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can insert conversation messages" ON public.conversation_messages;
CREATE POLICY "Participants can insert conversation messages"
  ON public.conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role IN ('customer', 'pro')
    AND conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.customer_id = auth.uid()
         OR c.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
  );

-- Realtime for conversation_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
  END IF;
END $$;
