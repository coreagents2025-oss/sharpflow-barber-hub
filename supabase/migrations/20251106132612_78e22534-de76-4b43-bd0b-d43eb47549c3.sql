-- ============================================
-- FASE 2: CORRIGIR SISTEMA DE ROLES (CORRIGIDO)
-- ============================================

-- 2.2 - ATRIBUIR ROLES AOS USUÁRIOS SEM ROLE (APENAS USUÁRIOS COM AUTH)
-- Primeiro, verificar quais usuários não têm role e atribuir baseado em suas relações
-- IMPORTANTE: Apenas usuários que existem em auth.users

-- Cenário 1: Se estão em barbershop_staff como admin
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT bs.user_id, 'admin'::app_role
FROM barbershop_staff bs
INNER JOIN auth.users au ON bs.user_id = au.id
WHERE bs.user_id NOT IN (SELECT user_id FROM user_roles)
AND bs.role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Cenário 2: Se estão em barbershop_staff como barber
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT bs.user_id, 'barber'::app_role
FROM barbershop_staff bs
INNER JOIN auth.users au ON bs.user_id = au.id
WHERE bs.user_id NOT IN (SELECT user_id FROM user_roles)
AND bs.role = 'barber'
ON CONFLICT (user_id, role) DO NOTHING;

-- Cenário 3: Se estão em barbers mas não em barbershop_staff
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT b.user_id, 'barber'::app_role
FROM barbers b
INNER JOIN auth.users au ON b.user_id = au.id
WHERE b.user_id IS NOT NULL
AND b.user_id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id, role) DO NOTHING;

-- Cenário 4: Usuários autenticados que são apenas clientes (sem vínculo staff/barber)
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'client'::app_role
FROM auth.users au
WHERE au.id NOT IN (SELECT user_id FROM user_roles)
AND NOT EXISTS (
  SELECT 1 FROM barbershop_staff WHERE user_id = au.id
)
AND NOT EXISTS (
  SELECT 1 FROM barbers WHERE user_id = au.id
)
ON CONFLICT (user_id, role) DO NOTHING;