-- =============================================
-- FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA
-- =============================================

-- 1.1 - Corrigir Isolamento Multi-Tenant em Barbershops
DROP POLICY IF EXISTS "Admins can manage barbershops" ON barbershops;

CREATE POLICY "Admins can manage own barbershop"
ON barbershops FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  id IN (
    SELECT barbershop_id 
    FROM barbershop_staff 
    WHERE user_id = auth.uid()
  )
);

-- 1.2 - Corrigir Isolamento em Barbershop Staff
DROP POLICY IF EXISTS "Admins can manage barbershop staff" ON barbershop_staff;

CREATE POLICY "Admins can manage own barbershop staff"
ON barbershop_staff FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (
    SELECT barbershop_id 
    FROM barbershop_staff 
    WHERE user_id = auth.uid()
  )
);

-- 1.3 - Habilitar Acesso Anônimo ao Catálogo Público
DROP POLICY IF EXISTS "Public can view basic barbershop info" ON barbershops;

CREATE POLICY "Anyone can view basic barbershop info"
ON barbershops FOR SELECT
USING (true);

-- 1.4 - Corrigir Security Definer View
DROP VIEW IF EXISTS public_barbershops;

CREATE VIEW public_barbershops AS
SELECT 
  id,
  name,
  address,
  phone,
  logo_url,
  slug,
  custom_domain,
  operating_hours,
  created_at
FROM barbershops;

GRANT SELECT ON public_barbershops TO anon, authenticated;

-- =============================================
-- FASE 2: CORREÇÕES DE POLICIES INCONSISTENTES
-- =============================================

-- 2.1 - Corrigir Policy "Admins can manage barbers"
DROP POLICY IF EXISTS "Admins can manage barbers" ON barbers;

CREATE POLICY "Admins can manage own barbershop barbers"
ON barbers FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (
    SELECT barbershop_id 
    FROM barbershop_staff 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Barbers can view own barbershop barbers"
ON barbers FOR SELECT
USING (
  has_role(auth.uid(), 'barber') AND
  barbershop_id = get_user_barbershop(auth.uid())
);

-- 2.2 - Corrigir Policy "Barbers can update own barbershop"
DROP POLICY IF EXISTS "Barbers can update own barbershop" ON barbershops;

CREATE POLICY "Barbers can update own barbershop"
ON barbershops FOR UPDATE
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'barber')) AND
  id IN (
    SELECT barbershop_id 
    FROM barbershop_staff 
    WHERE user_id = auth.uid()
  )
);

-- 2.3 - Corrigir Policy de Subscription Plans
DROP POLICY IF EXISTS "Admins can manage plans" ON subscription_plans;

CREATE POLICY "Admins can manage own barbershop plans"
ON subscription_plans FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (
    SELECT barbershop_id 
    FROM barbershop_staff 
    WHERE user_id = auth.uid()
  )
);

-- 2.4 - Corrigir Policy de Integrations
DROP POLICY IF EXISTS "Admins can manage integrations" ON integrations;

CREATE POLICY "Admins can manage own barbershop integrations"
ON integrations FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (
    SELECT barbershop_id 
    FROM barbershop_staff 
    WHERE user_id = auth.uid()
  )
);

-- =============================================
-- FASE 3: CONSTRAINTS E VALIDAÇÕES
-- =============================================

-- 3.1 - Adicionar UNIQUE Constraint em Slug
ALTER TABLE barbershops 
ADD CONSTRAINT barbershops_slug_unique UNIQUE(slug);

-- 3.2 - Validar Consistência de Roles (Trigger)
CREATE OR REPLACE FUNCTION validate_staff_role_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_record app_role;
BEGIN
  -- Buscar role em user_roles
  SELECT role INTO user_role_record
  FROM user_roles
  WHERE user_id = NEW.user_id;
  
  -- Verificar se role em barbershop_staff é compatível
  IF NEW.role NOT IN ('admin', 'barber') THEN
    RAISE EXCEPTION 'Invalid role in barbershop_staff. Must be admin or barber.';
  END IF;
  
  -- Verificar se user_roles tem role compatível
  IF user_role_record IS NULL THEN
    RAISE EXCEPTION 'User must have a role in user_roles before joining barbershop_staff.';
  END IF;
  
  IF user_role_record NOT IN ('admin', 'barber') THEN
    RAISE EXCEPTION 'User must be admin or barber to join barbershop_staff.';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_barbershop_staff_role ON barbershop_staff;
CREATE TRIGGER validate_barbershop_staff_role
  BEFORE INSERT OR UPDATE ON barbershop_staff
  FOR EACH ROW EXECUTE FUNCTION validate_staff_role_consistency();

-- =============================================
-- FASE 4: LIMPEZA DE DADOS ANTIGOS
-- =============================================

-- Remover colunas antigas que foram migradas para barbershop_credentials
ALTER TABLE barbershops DROP COLUMN IF EXISTS whatsapp_settings;
ALTER TABLE barbershops DROP COLUMN IF EXISTS email_settings;

-- =============================================
-- FASE 5: AUDITORIA
-- =============================================

-- Criar tabela de audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  barbershop_id UUID REFERENCES barbershops(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver logs da própria barbearia
CREATE POLICY "Admins can view own barbershop audit logs"
ON audit_logs FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (
    SELECT barbershop_id 
    FROM barbershop_staff 
    WHERE user_id = auth.uid()
  )
);