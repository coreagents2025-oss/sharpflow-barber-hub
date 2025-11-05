-- Corrigir policies do profiles para permitir criação de leads

-- 1. Remover policy conflitante que está aplicada a 'public'
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. Recriar a policy apenas para usuários autenticados
CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3. Garantir que a policy de booking público está correta
DROP POLICY IF EXISTS "Public booking can create client profiles" ON public.profiles;

CREATE POLICY "Public booking can create client profiles" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- 4. Atualizar policy de update para ser mais permissiva para leads
DROP POLICY IF EXISTS "Public booking can update client phone" ON public.profiles;

CREATE POLICY "Public booking can update client phone" 
ON public.profiles 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);