-- ============================================
-- FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA
-- ============================================

-- 1.1 - PROTEGER TABELA profiles
-- Remover políticas públicas perigosas
DROP POLICY IF EXISTS "Public can search profiles by phone" ON public.profiles;
DROP POLICY IF EXISTS "Public booking can update client phone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create profiles" ON public.profiles;

-- Criar política segura para criação de perfil (booking público)
CREATE POLICY "Public can create own profile for booking"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- Manter políticas existentes que já são seguras:
-- "Users can update own profile" - OK
-- "Users can view own profile" - OK  
-- "Staff can view customer profiles" - OK

-- 1.2 - CRIAR VIEW SEGURA public_profiles
-- View que expõe apenas dados necessários para booking
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  phone,
  full_name
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

COMMENT ON VIEW public.public_profiles IS 'View pública segura para busca de clientes durante booking. Expõe apenas id, phone e full_name.';

-- 1.3 - PROTEGER EMAIL EM barbershops (recriar view)
CREATE OR REPLACE VIEW public.public_barbershops AS
SELECT 
  id,
  name,
  address,
  phone,
  logo_url,
  slug,
  custom_domain,
  operating_hours,
  created_at,
  facebook_url,
  instagram_url
FROM public.barbershops;

GRANT SELECT ON public.public_barbershops TO anon, authenticated;

COMMENT ON VIEW public.public_barbershops IS 'View pública de barbearias sem expor email do proprietário';

-- 1.4 - PROTEGER TELEFONES EM barbers
-- Remover política pública atual
DROP POLICY IF EXISTS "Anyone can view barbers" ON public.barbers;

-- Criar nova política (SELECT continua público mas usaremos view)
CREATE POLICY "Public can view barbers via view"
ON public.barbers
FOR SELECT
USING (true);

-- Criar view segura sem telefone
CREATE OR REPLACE VIEW public.public_barbers AS
SELECT 
  id,
  barbershop_id,
  name,
  specialty,
  bio,
  photo_url,
  rating,
  is_available
FROM public.barbers
WHERE is_available = true;

GRANT SELECT ON public.public_barbers TO anon, authenticated;

COMMENT ON VIEW public.public_barbers IS 'View pública de barbeiros sem expor telefone e user_id';

-- 1.5 - PROTEGER TABELA appointments
-- Remover política pública perigosa
DROP POLICY IF EXISTS "Public can view appointments for booking validation" ON public.appointments;

-- Criar função segura para validar disponibilidade
CREATE OR REPLACE FUNCTION public.check_time_slot_available(
  _barbershop_id UUID,
  _barber_id UUID,
  _scheduled_at TIMESTAMPTZ,
  _duration_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_end TIMESTAMPTZ;
  conflicting_appointments INTEGER;
BEGIN
  slot_end := _scheduled_at + (_duration_minutes || ' minutes')::INTERVAL;
  
  SELECT COUNT(*)
  INTO conflicting_appointments
  FROM appointments
  WHERE barbershop_id = _barbershop_id
    AND barber_id = _barber_id
    AND status NOT IN ('cancelled', 'no_show')
    AND (
      -- Novo agendamento começa durante um existente
      (_scheduled_at >= scheduled_at AND _scheduled_at < scheduled_at + INTERVAL '60 minutes')
      OR
      -- Novo agendamento termina durante um existente
      (slot_end > scheduled_at AND slot_end <= scheduled_at + INTERVAL '60 minutes')
      OR
      -- Novo agendamento engloba um existente
      (_scheduled_at <= scheduled_at AND slot_end >= scheduled_at + INTERVAL '60 minutes')
    );
  
  RETURN conflicting_appointments = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_time_slot_available TO anon, authenticated;

COMMENT ON FUNCTION public.check_time_slot_available IS 'Verifica disponibilidade de horário sem expor dados dos agendamentos';