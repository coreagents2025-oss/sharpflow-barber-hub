-- ============================================
-- SCRIPT DE AUDITORIA DE SEGURANÇA
-- ============================================
-- Execute este script periodicamente para verificar
-- a integridade da segurança do banco de dados

-- 1️⃣ VERIFICAR USUÁRIOS SEM ROLE
-- Esperado: 0 usuários
SELECT 
  'USERS WITHOUT ROLE' as issue_type,
  COUNT(*) as count,
  'CRITICAL' as severity,
  'Usuários autenticados devem ter role atribuído' as description
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
INNER JOIN auth.users au ON p.id = au.id
WHERE ur.role IS NULL;

-- Detalhes dos usuários sem role
SELECT 
  p.full_name,
  p.phone,
  au.email,
  au.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
INNER JOIN auth.users au ON p.id = au.id
WHERE ur.role IS NULL;

-- 2️⃣ VERIFICAR TABELAS SEM RLS
-- Tabelas públicas devem ter RLS habilitado
SELECT 
  'TABLES WITHOUT RLS' as issue_type,
  tablename,
  'HIGH' as severity,
  'Tabela pública sem RLS pode expor dados' as description
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT DISTINCT tablename 
  FROM pg_policies 
  WHERE schemaname = 'public'
)
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE '%_view'
ORDER BY tablename;

-- 3️⃣ VERIFICAR POLÍTICAS MUITO PERMISSIVAS
-- Políticas "true" podem ser perigosas
SELECT 
  'OVERLY PERMISSIVE POLICIES' as issue_type,
  schemaname,
  tablename,
  policyname,
  cmd as command,
  'MEDIUM' as severity,
  'Política permite acesso sem restrições - verificar se é intencional' as description
FROM pg_policies
WHERE schemaname = 'public'
AND qual = 'true'
ORDER BY tablename, policyname;

-- 4️⃣ VERIFICAR FUNÇÕES SEM SECURITY DEFINER
-- Funções críticas devem ter SECURITY DEFINER
SELECT 
  'FUNCTIONS WITHOUT SECURITY DEFINER' as issue_type,
  routine_name,
  'MEDIUM' as severity,
  'Função crítica deve usar SECURITY DEFINER para evitar recursão RLS' as description
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND security_type != 'DEFINER'
AND (
  routine_name LIKE 'has_%' 
  OR routine_name LIKE 'get_%'
  OR routine_name LIKE 'check_%'
)
ORDER BY routine_name;

-- 5️⃣ VERIFICAR CREDENCIAIS EM PLAINTEXT
-- Tokens não devem estar no banco (deprecated)
SELECT 
  'PLAINTEXT CREDENTIALS' as issue_type,
  COUNT(*) as barbershops_with_tokens,
  'HIGH' as severity,
  'Tokens devem ser migrados para Supabase Secrets' as description
FROM barbershop_credentials
WHERE (
  whatsapp_credentials::text LIKE '%token%'
  OR whatsapp_credentials::text LIKE '%key%'
  OR email_credentials::text LIKE '%token%'
  OR email_credentials::text LIKE '%key%'
)
AND whatsapp_credentials::text != '{}'
AND email_credentials::text != '{}';

-- 6️⃣ VERIFICAR EXPOSIÇÃO DE DADOS SENSÍVEIS
-- Views públicas não devem expor dados sensíveis

-- Verificar se public_profiles expõe campos sensíveis
SELECT 
  'SENSITIVE DATA IN public_profiles' as issue_type,
  column_name,
  'CRITICAL' as severity
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'public_profiles'
AND column_name IN ('email', 'avatar_url', 'created_at', 'updated_at')
ORDER BY column_name;

-- Verificar se public_barbershops expõe email
SELECT 
  'SENSITIVE DATA IN public_barbershops' as issue_type,
  column_name,
  'CRITICAL' as severity
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'public_barbershops'
AND column_name = 'email'
ORDER BY column_name;

-- Verificar se public_barbers expõe telefone ou user_id
SELECT 
  'SENSITIVE DATA IN public_barbers' as issue_type,
  column_name,
  'CRITICAL' as severity
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'public_barbers'
AND column_name IN ('phone', 'user_id')
ORDER BY column_name;

-- 7️⃣ VERIFICAR INCONSISTÊNCIAS EM BARBERSHOP_STAFF
-- Usuários em barbershop_staff devem ter role correspondente
SELECT 
  'STAFF WITHOUT MATCHING ROLE' as issue_type,
  bs.role as staff_role,
  ur.role as user_role,
  p.full_name,
  'HIGH' as severity
FROM barbershop_staff bs
INNER JOIN profiles p ON bs.user_id = p.id
LEFT JOIN user_roles ur ON bs.user_id = ur.user_id
WHERE ur.role IS NULL 
   OR (bs.role = 'admin' AND ur.role != 'admin')
   OR (bs.role = 'barber' AND ur.role != 'barber');

-- 8️⃣ VERIFICAR INTEGRIDADE DE APPOINTMENTS
-- Appointments devem ter client_id válido
SELECT 
  'APPOINTMENTS WITH INVALID CLIENT' as issue_type,
  COUNT(*) as count,
  'MEDIUM' as severity
FROM appointments a
LEFT JOIN profiles p ON a.client_id = p.id
WHERE p.id IS NULL;

-- 9️⃣ VERIFICAR MÚLTIPLOS ROLES
-- Usuários não devem ter roles conflitantes
SELECT 
  'USERS WITH MULTIPLE ROLES' as issue_type,
  user_id,
  array_agg(role) as roles,
  'LOW' as severity,
  'Verificar se múltiplos roles são intencionais' as description
FROM user_roles
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 🔟 VERIFICAR BARBEARIAS SEM ADMIN
-- Cada barbearia deve ter pelo menos 1 admin
SELECT 
  'BARBERSHOPS WITHOUT ADMIN' as issue_type,
  b.name as barbershop_name,
  b.id as barbershop_id,
  'HIGH' as severity
FROM barbershops b
LEFT JOIN barbershop_staff bs ON b.id = bs.barbershop_id AND bs.role = 'admin'
WHERE bs.id IS NULL;

-- ============================================
-- RESUMO GERAL
-- ============================================
-- Contadores finais de issues

WITH security_stats AS (
  -- Usuários sem role
  SELECT 'users_without_role' as metric, COUNT(*)::int as value
  FROM profiles p
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  INNER JOIN auth.users au ON p.id = au.id
  WHERE ur.role IS NULL
  
  UNION ALL
  
  -- Tabelas sem RLS
  SELECT 'tables_without_rls', COUNT(*)::int
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  )
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '%_view'
  
  UNION ALL
  
  -- Políticas permissivas
  SELECT 'permissive_policies', COUNT(*)::int
  FROM pg_policies
  WHERE schemaname = 'public' AND qual = 'true'
  
  UNION ALL
  
  -- Credenciais em plaintext
  SELECT 'plaintext_credentials', COUNT(*)::int
  FROM barbershop_credentials
  WHERE (
    whatsapp_credentials::text LIKE '%token%'
    OR email_credentials::text LIKE '%token%'
  )
  AND whatsapp_credentials::text != '{}'
  
  UNION ALL
  
  -- Staff sem role
  SELECT 'staff_without_role', COUNT(*)::int
  FROM barbershop_staff bs
  LEFT JOIN user_roles ur ON bs.user_id = ur.user_id
  WHERE ur.role IS NULL
)
SELECT 
  '=== RESUMO DE SEGURANÇA ===' as summary,
  '' as spacer,
  (SELECT value FROM security_stats WHERE metric = 'users_without_role') as users_without_role,
  (SELECT value FROM security_stats WHERE metric = 'tables_without_rls') as tables_without_rls,
  (SELECT value FROM security_stats WHERE metric = 'permissive_policies') as permissive_policies,
  (SELECT value FROM security_stats WHERE metric = 'plaintext_credentials') as plaintext_credentials,
  (SELECT value FROM security_stats WHERE metric = 'staff_without_role') as staff_without_role,
  CASE 
    WHEN (
      (SELECT value FROM security_stats WHERE metric = 'users_without_role') +
      (SELECT value FROM security_stats WHERE metric = 'plaintext_credentials') +
      (SELECT value FROM security_stats WHERE metric = 'staff_without_role')
    ) = 0 THEN '✅ SISTEMA SEGURO'
    ELSE '⚠️ ISSUES DETECTADOS - REVISAR ACIMA'
  END as status;

-- ============================================
-- INSTRUÇÕES DE USO
-- ============================================
-- 
-- 1. Execute este script periodicamente (semanal ou mensal)
-- 2. Revise todos os resultados que retornam linhas
-- 3. Priorize issues CRITICAL > HIGH > MEDIUM > LOW
-- 4. Consulte docs/SECURITY.md para correções
-- 5. Re-execute após correções para validar
--
-- ============================================
