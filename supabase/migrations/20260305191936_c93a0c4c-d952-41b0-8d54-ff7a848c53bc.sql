
-- 1. Add columns to subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS billing_method text NOT NULL DEFAULT 'pix',
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_days_before integer NOT NULL DEFAULT 3;

-- 2. Add columns to client_subscriptions
ALTER TABLE public.client_subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly';

-- 3. Create subscription_payments table
CREATE TABLE public.subscription_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.client_subscriptions(id) ON DELETE CASCADE,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  paid_at timestamptz,
  payment_method text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on subscription_payments
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for subscription_payments
CREATE POLICY "Admins can manage own barbershop subscription payments"
  ON public.subscription_payments
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND barbershop_id IN (
      SELECT barbershop_id FROM get_user_barbershops(auth.uid())
    )
  );

CREATE POLICY "Barbers can view own barbershop subscription payments"
  ON public.subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'barber'::app_role)
    AND barbershop_id = get_user_barbershop(auth.uid())
  );

-- 6. Add INSERT policy for client_subscriptions for admins (currently missing)
CREATE POLICY "Admins can create subscriptions"
  ON public.client_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND barbershop_id IN (
      SELECT barbershop_id FROM get_user_barbershops(auth.uid())
    )
  );
