-- ============================================================
-- FASE 1: Corrigir vazamento de dados (CRÍTICO)
-- ============================================================

-- 1.1 - Corrigir RLS Policy da tabela services
DROP POLICY IF EXISTS "Anyone can view active services" ON services;

CREATE POLICY "Users can view services from their barbershop or public"
ON services FOR SELECT
USING (
  -- Clientes podem ver serviços ativos de qualquer barbearia (para catálogo público)
  is_active = true 
  OR 
  -- Admins/barbers só veem serviços da própria barbearia
  (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'barber'))
    AND barbershop_id IN (SELECT * FROM get_user_barbershops(auth.uid()))
  )
);

-- ============================================================
-- FASE 2: Simplificar criação de conta - SEMPRE criar barbearia
-- ============================================================

-- 2.1 - Atualizar handle_new_user() para SEMPRE criar barbearia
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
  
  -- ✅ SEMPRE criar barbearia para o novo usuário
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
  
  -- ✅ SEMPRE definir role como admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  -- ✅ SEMPRE vincular à barbearia
  INSERT INTO public.barbershop_staff (user_id, barbershop_id, role)
  VALUES (NEW.id, new_barbershop_id, 'admin');
  
  -- Criar credenciais vazias
  INSERT INTO public.barbershop_credentials (barbershop_id)
  VALUES (new_barbershop_id);
  
  -- Criar configurações de catálogo
  INSERT INTO public.catalog_settings (barbershop_id)
  VALUES (new_barbershop_id);
  
  RETURN NEW;
END;
$$;