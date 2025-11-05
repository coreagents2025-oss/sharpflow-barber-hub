-- Permitir profiles sem usuário autenticado (para leads de agendamento público)

-- 1. Remover a constraint de foreign key existente
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Adicionar constraint opcional (permite NULL em user_id se necessário futuramente)
-- Por enquanto, mantemos id como primary key mas sem exigir auth.users

-- 3. Adicionar índice para melhorar performance de busca por telefone
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- 4. Adicionar constraint unique para telefone (evitar duplicatas)
ALTER TABLE profiles ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);