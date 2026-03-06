
-- 1. plan_benefits
CREATE TABLE public.plan_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  custom_name text,
  custom_description text,
  quantity_per_cycle integer NOT NULL DEFAULT 1,
  benefit_type text NOT NULL DEFAULT 'service',
  discount_value numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'percentage',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage plan benefits" ON public.plan_benefits FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subscription_plans sp
    JOIN barbershop_staff bs ON sp.barbershop_id = bs.barbershop_id
    WHERE sp.id = plan_benefits.plan_id AND bs.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subscription_plans sp
    JOIN barbershop_staff bs ON sp.barbershop_id = bs.barbershop_id
    WHERE sp.id = plan_benefits.plan_id AND bs.user_id = auth.uid()
  )
);

-- 2. plan_points_config
CREATE TABLE public.plan_points_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE UNIQUE,
  points_per_visit integer NOT NULL DEFAULT 1,
  points_per_real_spent numeric NOT NULL DEFAULT 0,
  bonus_points_monthly integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_points_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage points config" ON public.plan_points_config FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM subscription_plans sp
    JOIN barbershop_staff bs ON sp.barbershop_id = bs.barbershop_id
    WHERE sp.id = plan_points_config.plan_id AND bs.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM subscription_plans sp
    JOIN barbershop_staff bs ON sp.barbershop_id = bs.barbershop_id
    WHERE sp.id = plan_points_config.plan_id AND bs.user_id = auth.uid()
  )
);

-- 3. loyalty_rewards
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  reward_type text NOT NULL DEFAULT 'custom',
  points_required integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage rewards" ON public.loyalty_rewards FOR ALL TO authenticated
USING (
  barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
)
WITH CHECK (
  barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
);

-- 4. client_loyalty_points
CREATE TABLE public.client_loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.client_subscriptions(id) ON DELETE CASCADE,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  total_points integer NOT NULL DEFAULT 0,
  redeemed_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage loyalty points" ON public.client_loyalty_points FOR ALL TO authenticated
USING (
  barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
)
WITH CHECK (
  barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
);

-- 5. loyalty_point_history
CREATE TABLE public.loyalty_point_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_id uuid NOT NULL REFERENCES public.client_loyalty_points(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text NOT NULL,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_point_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage point history" ON public.loyalty_point_history FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_loyalty_points clp
    WHERE clp.id = loyalty_point_history.loyalty_id
    AND clp.barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_loyalty_points clp
    WHERE clp.id = loyalty_point_history.loyalty_id
    AND clp.barbershop_id IN (SELECT barbershop_id FROM get_user_barbershops(auth.uid()))
  )
);
