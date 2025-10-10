-- FASE 1: Corrigir permissões e criar estrutura inicial

-- 1.1 Atualizar role do usuário para admin
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = '29ff0fff-7051-4b1e-9cda-bee1b4782373';

-- 1.2 Criar barbearia inicial
INSERT INTO barbershops (name, phone, email, address)
VALUES (
  'Minha Barbearia',
  '(11) 99999-9999',
  'contato@barbearia.com',
  'Rua Principal, 123 - Centro'
);

-- 1.3 Vincular usuário como barbeiro/admin dessa barbearia
INSERT INTO barbers (user_id, barbershop_id, bio, specialty, is_available)
SELECT 
  '29ff0fff-7051-4b1e-9cda-bee1b4782373',
  id,
  'Proprietário e administrador da barbearia',
  'Gestão e Administração',
  true
FROM barbershops
WHERE name = 'Minha Barbearia'
LIMIT 1;

-- FASE 3: Adicionar RLS policies para barbershops (se não existirem)

-- Policy para barbers/admins atualizarem sua própria barbearia
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'barbershops' 
    AND policyname = 'Barbers can update own barbershop'
  ) THEN
    CREATE POLICY "Barbers can update own barbershop"
    ON barbershops FOR UPDATE
    USING (
      has_role(auth.uid(), 'admin'::app_role) OR
      id IN (
        SELECT barbershop_id 
        FROM barbers 
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Policy para barbers/admins lerem sua própria barbearia
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'barbershops' 
    AND policyname = 'Barbers can read own barbershop'
  ) THEN
    CREATE POLICY "Barbers can read own barbershop"
    ON barbershops FOR SELECT
    USING (
      true -- Já existe policy "Anyone can view barbershops"
    );
  END IF;
END $$;