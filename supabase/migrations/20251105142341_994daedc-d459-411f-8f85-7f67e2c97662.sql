-- ============================================================================
-- CORREÇÃO DE RECURSÃO INFINITA EM RLS POLICIES
-- ============================================================================

-- 1. CRIAR FUNÇÃO SEGURA PARA BUSCAR BARBERSHOPS DO USUÁRIO (múltiplas)
CREATE OR REPLACE FUNCTION public.get_user_barbershops(_user_id uuid)
RETURNS TABLE(barbershop_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barbershop_id
  FROM barbershop_staff
  WHERE user_id = _user_id;
$$;

-- 2. ATUALIZAR get_user_barbershop() PARA USAR A NOVA FUNÇÃO
CREATE OR REPLACE FUNCTION public.get_user_barbershop(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barbershop_id
  FROM barbershop_staff
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- ============================================================================
-- CORRIGIR POLICIES COM RECURSÃO - BARBERSHOP_STAFF
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage own barbershop staff" ON barbershop_staff;
DROP POLICY IF EXISTS "Staff can view own barbershop staff" ON barbershop_staff;

CREATE POLICY "Admins can manage own barbershop staff"
ON barbershop_staff FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

CREATE POLICY "Staff can view own barbershop staff"
ON barbershop_staff FOR SELECT
USING (
  user_id = auth.uid() OR
  barbershop_id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

-- ============================================================================
-- CORRIGIR POLICIES COM RECURSÃO - BARBERSHOPS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage own barbershop" ON barbershops;
DROP POLICY IF EXISTS "Barbers can update own barbershop" ON barbershops;

CREATE POLICY "Admins can manage own barbershop"
ON barbershops FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

CREATE POLICY "Barbers can update own barbershop"
ON barbershops FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'barber')) AND
  id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

-- ============================================================================
-- CORRIGIR POLICIES COM RECURSÃO - BARBERS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage own barbershop barbers" ON barbers;

CREATE POLICY "Admins can manage own barbershop barbers"
ON barbers FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

-- ============================================================================
-- CORRIGIR POLICIES COM RECURSÃO - BARBERSHOP_CREDENTIALS
-- ============================================================================

DROP POLICY IF EXISTS "Only admins can manage credentials" ON barbershop_credentials;

CREATE POLICY "Only admins can manage credentials"
ON barbershop_credentials FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

-- ============================================================================
-- CORRIGIR POLICIES COM RECURSÃO - INTEGRATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage own barbershop integrations" ON integrations;

CREATE POLICY "Admins can manage own barbershop integrations"
ON integrations FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

-- ============================================================================
-- CORRIGIR POLICIES COM RECURSÃO - SUBSCRIPTION_PLANS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage own barbershop plans" ON subscription_plans;

CREATE POLICY "Admins can manage own barbershop plans"
ON subscription_plans FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

-- ============================================================================
-- CORRIGIR POLICIES COM RECURSÃO - AUDIT_LOGS
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view own barbershop audit logs" ON audit_logs;

CREATE POLICY "Admins can view own barbershop audit logs"
ON audit_logs FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (SELECT * FROM get_user_barbershops(auth.uid()))
);

-- ============================================================================
-- VERIFICAR RLS HABILITADO EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbershop_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;