-- ============================================
-- FASE 1: TRIGGERS E ESTRUTURA BASE
-- ============================================

-- 1.1 Criar trigger on_auth_user_created (se não existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1.2 Criar triggers de updated_at para todas as tabelas
DROP TRIGGER IF EXISTS update_barbershops_updated_at ON barbershops;
CREATE TRIGGER update_barbershops_updated_at 
  BEFORE UPDATE ON barbershops 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_barbers_updated_at ON barbers;
CREATE TRIGGER update_barbers_updated_at 
  BEFORE UPDATE ON barbers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
  BEFORE UPDATE ON services 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at 
  BEFORE UPDATE ON appointments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_catalog_settings_updated_at ON catalog_settings;
CREATE TRIGGER update_catalog_settings_updated_at 
  BEFORE UPDATE ON catalog_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_schedules_updated_at ON daily_schedules;
CREATE TRIGGER update_daily_schedules_updated_at 
  BEFORE UPDATE ON daily_schedules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_subscriptions_updated_at ON client_subscriptions;
CREATE TRIGGER update_client_subscriptions_updated_at 
  BEFORE UPDATE ON client_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at 
  BEFORE UPDATE ON integrations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FASE 2: TABELA BARBERSHOP_STAFF
-- ============================================

-- 2.1 Criar tabela barbershop_staff para vincular usuários a barbearias
CREATE TABLE IF NOT EXISTS public.barbershop_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  role app_role NOT NULL CHECK (role IN ('admin', 'barber')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, barbershop_id)
);

-- 2.2 Índices para performance
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_user ON barbershop_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_barbershop ON barbershop_staff(barbershop_id);

-- 2.3 Habilitar RLS
ALTER TABLE barbershop_staff ENABLE ROW LEVEL SECURITY;

-- 2.4 RLS Policies para barbershop_staff
DROP POLICY IF EXISTS "Admins can manage barbershop staff" ON barbershop_staff;
CREATE POLICY "Admins can manage barbershop staff"
ON barbershop_staff FOR ALL
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Staff can view own barbershop staff" ON barbershop_staff;
CREATE POLICY "Staff can view own barbershop staff"
ON barbershop_staff FOR SELECT
USING (
  user_id = auth.uid() OR
  barbershop_id IN (
    SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
  )
);

-- 2.5 Trigger updated_at para barbershop_staff
DROP TRIGGER IF EXISTS update_barbershop_staff_updated_at ON barbershop_staff;
CREATE TRIGGER update_barbershop_staff_updated_at 
  BEFORE UPDATE ON barbershop_staff 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2.6 Migrar dados existentes de barbers para barbershop_staff
INSERT INTO barbershop_staff (user_id, barbershop_id, role)
SELECT 
  b.user_id,
  b.barbershop_id,
  ur.role
FROM barbers b
JOIN user_roles ur ON ur.user_id = b.user_id
WHERE b.user_id IS NOT NULL
  AND ur.role IN ('admin', 'barber')
ON CONFLICT (user_id, barbershop_id) DO NOTHING;

-- ============================================
-- FASE 3: ATUALIZAR FUNÇÃO GET_USER_BARBERSHOP
-- ============================================

-- 3.1 Usar CREATE OR REPLACE para não quebrar dependências
CREATE OR REPLACE FUNCTION public.get_user_barbershop(_user_id UUID)
RETURNS UUID
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

-- ============================================
-- FASE 4: CRIAR TABELA BARBERSHOP_CREDENTIALS
-- ============================================

-- 4.1 Criar tabela para credenciais sensíveis
CREATE TABLE IF NOT EXISTS public.barbershop_credentials (
  barbershop_id UUID PRIMARY KEY REFERENCES barbershops(id) ON DELETE CASCADE,
  whatsapp_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  email_credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 Habilitar RLS
ALTER TABLE barbershop_credentials ENABLE ROW LEVEL SECURITY;

-- 4.3 Apenas admins podem gerenciar credenciais
DROP POLICY IF EXISTS "Only admins can manage credentials" ON barbershop_credentials;
CREATE POLICY "Only admins can manage credentials"
ON barbershop_credentials FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (
    SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
  )
);

-- 4.4 Trigger updated_at
DROP TRIGGER IF EXISTS update_barbershop_credentials_updated_at ON barbershop_credentials;
CREATE TRIGGER update_barbershop_credentials_updated_at 
  BEFORE UPDATE ON barbershop_credentials 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.5 Migrar credenciais existentes
INSERT INTO barbershop_credentials (barbershop_id, whatsapp_credentials, email_credentials)
SELECT 
  id,
  COALESCE(whatsapp_settings, '{}'::jsonb),
  COALESCE(email_settings, '{}'::jsonb)
FROM barbershops
ON CONFLICT (barbershop_id) DO NOTHING;

-- ============================================
-- FASE 5: ATUALIZAR RLS POLICIES - PROFILES
-- ============================================

-- 5.1 Corrigir políticas de profiles (CRÍTICO - segurança)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Staff can view customer profiles" ON profiles;
CREATE POLICY "Staff can view customer profiles"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'barber')
);

-- ============================================
-- FASE 6: ATUALIZAR RLS POLICIES - BARBERSHOPS
-- ============================================

-- 6.1 Criar view pública para barbershops (sem credenciais)
DROP VIEW IF EXISTS public_barbershops CASCADE;
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

-- 6.2 Grant SELECT na view para todos
GRANT SELECT ON public_barbershops TO anon, authenticated;

-- 6.3 Atualizar políticas de barbershops
DROP POLICY IF EXISTS "Anyone can view barbershops" ON barbershops;
DROP POLICY IF EXISTS "Barbers can read own barbershop" ON barbershops;

DROP POLICY IF EXISTS "Public can view basic barbershop info" ON barbershops;
CREATE POLICY "Public can view basic barbershop info"
ON barbershops FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'barber') OR
  id IN (
    SELECT barbershop_id FROM appointments WHERE client_id = auth.uid()
  )
);

-- ============================================
-- FASE 7: ATUALIZAR HANDLE_NEW_USER FUNCTION
-- ============================================

-- 7.1 Recriar função para criar barbearia automaticamente para admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_barbershop_id UUID;
  user_name TEXT;
BEGIN
  -- Extrair nome do usuário
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, user_name);
  
  -- Auto-assign client role por padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  -- Se o usuário tiver metadata indicando que é admin, criar barbearia
  IF (NEW.raw_user_meta_data->>'role' = 'admin') THEN
    -- Criar nova barbearia "Minha Barbearia"
    INSERT INTO public.barbershops (
      name,
      slug,
      email,
      operating_hours
    )
    VALUES (
      'Minha Barbearia',
      'minha-barbearia-' || substring(NEW.id::text from 1 for 8),
      NEW.email,
      jsonb_build_object(
        'monday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'tuesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'wednesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'thursday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'friday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'saturday', jsonb_build_object('open', '09:00', 'close', '14:00')
      )
    )
    RETURNING id INTO new_barbershop_id;
    
    -- Atualizar role para admin
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.id;
    
    -- Vincular usuário à barbearia em barbershop_staff
    INSERT INTO public.barbershop_staff (user_id, barbershop_id, role)
    VALUES (NEW.id, new_barbershop_id, 'admin');
    
    -- Criar credenciais vazias para a barbearia
    INSERT INTO public.barbershop_credentials (barbershop_id)
    VALUES (new_barbershop_id);
    
    -- Criar configurações de catálogo
    INSERT INTO public.catalog_settings (barbershop_id)
    VALUES (new_barbershop_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- FASE 8: ÍNDICES ADICIONAIS DE PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_date 
ON appointments(barbershop_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_client 
ON appointments(client_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_barbers_barbershop 
ON barbers(barbershop_id) WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_services_barbershop_active 
ON services(barbershop_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_roles_lookup 
ON user_roles(user_id, role);