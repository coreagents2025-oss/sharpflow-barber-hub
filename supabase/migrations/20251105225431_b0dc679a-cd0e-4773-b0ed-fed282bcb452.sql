-- Solução definitiva para RLS do profiles
-- Remover TODAS as policies INSERT conflitantes e criar uma única ultra-permissiva

-- 1. Remover todas as policies INSERT existentes
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public booking can create client profiles" ON public.profiles;

-- 2. Criar UMA ÚNICA policy INSERT ultra-permissiva
CREATE POLICY "Anyone can create profiles"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. Garantir SELECT permissivo para busca por telefone
DROP POLICY IF EXISTS "Public can search profiles by phone" ON public.profiles;

CREATE POLICY "Public can search profiles by phone"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Manter UPDATE permissivo
DROP POLICY IF EXISTS "Public booking can update client phone" ON public.profiles;

CREATE POLICY "Public booking can update client phone"
ON public.profiles
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);