-- Enforce user blocks on direct messaging inserts (bidirectional).
-- Complements API route checks; blocks direct Supabase client inserts.

CREATE OR REPLACE FUNCTION public.users_messaging_blocked(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN a IS NULL OR b IS NULL OR a = b THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.blocked_users bu
      WHERE (bu.blocker_id = a AND bu.blocked_user_id = b)
         OR (bu.blocker_id = b AND bu.blocked_user_id = a)
    )
  END;
$$;

COMMENT ON FUNCTION public.users_messaging_blocked(uuid, uuid) IS
  'True if either user blocked the other; used by messaging RLS policies.';

REVOKE ALL ON FUNCTION public.users_messaging_blocked(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.users_messaging_blocked(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.users_messaging_blocked(uuid, uuid) TO service_role;

-- booking_messages: block inserts when parties have a mutual block relationship
DROP POLICY IF EXISTS "Participants can insert booking messages" ON public.booking_messages;
CREATE POLICY "Participants can insert booking messages"
  ON public.booking_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role IN ('customer', 'pro')
    AND booking_id IN (
      SELECT b.id
      FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
    AND NOT public.users_messaging_blocked(
      auth.uid(),
      (
        SELECT CASE
          WHEN b.customer_id = auth.uid() THEN sp.user_id
          ELSE b.customer_id
        END
        FROM public.bookings b
        INNER JOIN public.service_pros sp ON sp.id = b.pro_id
        WHERE b.id = booking_messages.booking_id
      )
    )
  );

-- booking_quotes: same (quote cards are direct communication)
DROP POLICY IF EXISTS "Participants can insert booking quotes" ON public.booking_quotes;
CREATE POLICY "Participants can insert booking quotes"
  ON public.booking_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role IN ('customer', 'pro')
    AND booking_id IN (
      SELECT b.id FROM public.bookings b
      WHERE b.customer_id = auth.uid()
         OR b.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
    AND NOT public.users_messaging_blocked(
      auth.uid(),
      (
        SELECT CASE
          WHEN b.customer_id = auth.uid() THEN sp.user_id
          ELSE b.customer_id
        END
        FROM public.bookings b
        INNER JOIN public.service_pros sp ON sp.id = b.pro_id
        WHERE b.id = booking_quotes.booking_id
      )
    )
  );

-- conversation_messages: inquiry threads
DROP POLICY IF EXISTS "Participants can insert conversation messages" ON public.conversation_messages;
CREATE POLICY "Participants can insert conversation messages"
  ON public.conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role IN ('customer', 'pro')
    AND conversation_id IN (
      SELECT c.id FROM public.conversations c
      WHERE c.customer_id = auth.uid()
         OR c.pro_id IN (SELECT id FROM public.service_pros WHERE user_id = auth.uid())
    )
    AND NOT public.users_messaging_blocked(
      auth.uid(),
      (
        SELECT CASE
          WHEN c.customer_id = auth.uid() THEN sp.user_id
          ELSE c.customer_id
        END
        FROM public.conversations c
        INNER JOIN public.service_pros sp ON sp.id = c.pro_id
        WHERE c.id = conversation_messages.conversation_id
      )
    )
  );
