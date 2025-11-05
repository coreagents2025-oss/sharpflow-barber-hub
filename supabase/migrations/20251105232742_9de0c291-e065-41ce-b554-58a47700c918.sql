-- Corrigir foreign key da tabela payments para referenciar profiles ao invés de auth.users
-- Isso permite que pagamentos sejam criados para clientes de agendamento público

-- Remover constraint antiga
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_client_id_fkey;

-- Criar nova constraint referenciando profiles
ALTER TABLE payments 
ADD CONSTRAINT payments_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;