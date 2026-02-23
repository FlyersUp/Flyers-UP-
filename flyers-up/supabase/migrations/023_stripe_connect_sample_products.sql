-- ============================================
-- Stripe Connect Sample: Account mapping + Products
-- ============================================
-- Sample sellers (users without service_pros) can store account mapping here.
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_user ON public.stripe_connect_accounts(user_id);

ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own stripe connect account"
  ON public.stripe_connect_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- Product → Connected Account mapping
-- ============================================
-- Stores platform products and their associated connected account (seller).
-- Used for destination charges and application fee split.
-- ============================================

CREATE TABLE IF NOT EXISTS public.stripe_connect_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id text NOT NULL UNIQUE,
  stripe_price_id text NOT NULL,
  connected_account_id text NOT NULL,
  pro_id uuid REFERENCES public.service_pros(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_connect_products_connected_account
  ON public.stripe_connect_products(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_products_pro
  ON public.stripe_connect_products(pro_id);

-- Store products are public (anyone can browse)
ALTER TABLE public.stripe_connect_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read stripe connect products"
  ON public.stripe_connect_products FOR SELECT
  TO anon, authenticated
  USING (true);
