
-- Add SaaS billing columns to barbershops table
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS platform_asaas_subscription_id text,
  ADD COLUMN IF NOT EXISTS platform_asaas_customer_id text;

-- Existing barbershops that already have data get trial_ends_at set to now+7 days (already defaulted)
-- Super admins can read and update billing info
CREATE POLICY "Super admins can manage barbershop billing"
  ON public.barbershops
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Admins can read own barbershop billing status
CREATE POLICY "Admins can view own barbershop billing"
  ON public.barbershops
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid())));

-- Admins can update own barbershop (already allowed but let's ensure billing fields)
CREATE POLICY "Admins can update own barbershop"
  ON public.barbershops
  FOR UPDATE
  TO authenticated
  USING (id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid())))
  WITH CHECK (id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid())));
