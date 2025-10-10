-- Remover constraint de foreign key user_id
ALTER TABLE public.barbers DROP CONSTRAINT IF EXISTS barbers_user_id_fkey;

-- Adicionar coluna name para nome do barbeiro
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS name TEXT;

-- Adicionar coluna phone para telefone do barbeiro
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS phone TEXT;

-- Tornar user_id nullable (barbeiros não precisam ser usuários do sistema)
ALTER TABLE public.barbers ALTER COLUMN user_id DROP NOT NULL;

-- Atualizar RLS policies para permitir que admins gerenciem barbeiros
DROP POLICY IF EXISTS "Admins can manage barbers" ON public.barbers;
DROP POLICY IF EXISTS "Anyone can view barbers" ON public.barbers;

CREATE POLICY "Admins can manage barbers"
ON public.barbers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR (barbershop_id = get_user_barbershop(auth.uid())));

CREATE POLICY "Anyone can view barbers"
ON public.barbers
FOR SELECT
USING (true);