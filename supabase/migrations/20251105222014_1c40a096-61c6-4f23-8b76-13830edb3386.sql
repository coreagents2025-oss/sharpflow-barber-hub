-- Corrigir foreign key de appointments para permitir leads sem autenticação

-- 1. Remover a constraint que aponta para auth.users
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;

-- 2. Adicionar constraint que aponta para profiles (permite leads)
ALTER TABLE appointments 
ADD CONSTRAINT appointments_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;