
-- Create is_super_admin() security definer function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create platform_metrics table
CREATE TABLE public.platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  page_views integer NOT NULL DEFAULT 0,
  signups integer NOT NULL DEFAULT 0,
  bookings integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(metric_date)
);

ALTER TABLE public.platform_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage platform metrics"
ON public.platform_metrics
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Super admin SELECT policies on existing tables
CREATE POLICY "Super admins can view all appointments"
ON public.appointments FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all payments"
ON public.payments FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all leads"
ON public.leads FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all services"
ON public.services FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all cash flow"
ON public.cash_flow FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all staff"
ON public.barbershop_staff FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));
