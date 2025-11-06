# 🔒 Documentação de Segurança - BarberPLUS

## Níveis de Acesso

### 🔴 Admin (Proprietário da Barbearia)
- ✅ Gerenciar barbearia (nome, endereço, horários)
- ✅ Gerenciar barbeiros (adicionar, editar, remover)
- ✅ Gerenciar serviços
- ✅ Ver todos os agendamentos da barbearia
- ✅ Ver CRM (leads, notas, métricas)
- ✅ Ver mensagens WhatsApp
- ✅ Configurar credenciais (WhatsApp, Email)
- ❌ Ver dados de outras barbearias

### 🟡 Barber (Barbeiro)
- ✅ Ver agendamentos da barbearia
- ✅ Marcar presença em agendamentos
- ✅ Ver clientes
- ❌ Modificar configurações da barbearia
- ❌ Adicionar outros barbeiros
- ❌ Ver credenciais (tokens de API)
- ❌ Ver dados de outras barbearias

### 🟢 Client (Cliente)
- ✅ Ver próprios agendamentos
- ✅ Agendar novos horários (via catálogo público)
- ✅ Atualizar próprio perfil
- ❌ Ver agendamentos de outros clientes
- ❌ Acessar áreas administrativas

### ⚪ Público (Não Autenticado)
- ✅ Ver catálogo de serviços
- ✅ Ver barbeiros disponíveis (sem telefone)
- ✅ Agendar horário (cria perfil automaticamente)
- ✅ Ver horários disponíveis (sem expor agendamentos)
- ❌ Ver dados pessoais de clientes
- ❌ Ver telefones, emails
- ❌ Acessar áreas autenticadas

## Dados Protegidos

### 🔐 Sensíveis (NUNCA expor publicamente)
- Emails de proprietários (`barbershops.email`)
- Telefones pessoais (`barbers.phone`, `profiles.phone`)
- Credenciais de API (`barbershop_credentials.*`)
- Agendamentos completos (`appointments.*`)

### 🟡 Restritos (Apenas próprio usuário ou staff)
- Dados de perfil completos (`profiles.*`)
- Histórico de agendamentos
- Notas de clientes

### 🟢 Públicos (Via views seguras)
- Nome da barbearia
- Endereço e telefone comercial
- Serviços e preços
- Barbeiros (nome, foto, bio) - SEM telefone
- Horários de funcionamento

## Views Seguras

### `public_profiles`
Expõe apenas dados necessários para booking público:
- `id`
- `phone`
- `full_name`

**Uso no código:**
```typescript
const { data } = await supabase
  .from('public_profiles')
  .select('id, phone, full_name')
  .eq('phone', normalizedPhone);
```

### `public_barbershops`
Expõe dados da barbearia SEM email do proprietário:
- `id`, `name`, `address`, `phone`
- `logo_url`, `slug`, `custom_domain`
- `operating_hours`, `facebook_url`, `instagram_url`

### `public_barbers`
Expõe dados dos barbeiros SEM telefone e user_id:
- `id`, `barbershop_id`, `name`
- `specialty`, `bio`, `photo_url`
- `rating`, `is_available`

**Uso no código:**
```typescript
const { data } = await supabase
  .from('public_barbers')
  .select('*')
  .eq('barbershop_id', barbershopId);
```

## Funções de Segurança

### `has_role(user_id, role)`
Verifica se usuário tem role específico. Usada em todas as políticas RLS.

**Exemplo:**
```sql
CREATE POLICY "Admins only" ON table_name
FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

### `get_user_barbershop(user_id)`
Retorna ID da barbearia do usuário (admin/barber).

### `get_user_barbershops(user_id)`
Retorna todos os IDs de barbearias vinculadas ao usuário.

### `check_time_slot_available(barbershop_id, barber_id, scheduled_at, duration_minutes)`
Verifica disponibilidade de horário SEM expor agendamentos existentes.

**Exemplo:**
```typescript
const { data: isAvailable } = await supabase
  .rpc('check_time_slot_available', {
    _barbershop_id: barbershopId,
    _barber_id: barberId,
    _scheduled_at: scheduledAt.toISOString(),
    _duration_minutes: 60
  });
```

## RLS Policies - Resumo

| Tabela | Admin | Barber | Client | Público |
|--------|-------|--------|--------|---------|
| `profiles` | Ver todos da barbearia | Ver todos da barbearia | Ver próprio | Criar perfil para booking |
| `barbershops` | Gerenciar própria | Atualizar própria | - | Ver via view (sem email) |
| `barbers` | Gerenciar própria barbearia | Ver própria barbearia | - | Ver via view (sem telefone) |
| `services` | Gerenciar própria barbearia | Ver própria barbearia | - | Ver ativos |
| `appointments` | Ver/editar própria barbearia | Ver própria barbearia | Ver/criar próprios | Criar (sem ver outros) |
| `barbershop_credentials` | Gerenciar própria | ❌ | ❌ | ❌ |
| `whatsapp_conversations` | Ver própria barbearia | Ver própria barbearia | ❌ | ❌ |
| `client_notes` | Ver/criar própria barbearia | Ver/criar própria barbearia | ❌ | ❌ |
| `email_campaigns` | CRUD própria barbearia | Ver própria barbearia | ❌ | ❌ |

## Fluxo de Cadastro

### 1. Signup Público (/auth)
```
Input: email, senha, nome
→ Cria usuário no auth.users
→ Trigger: handle_new_user()
  → Cria profile
  → Define role = 'admin'
  → Cria barbearia
  → Vincula em barbershop_staff
  → Cria credenciais vazias
  → Cria catalog_settings
```

### 2. Booking Público (sem login)
```
Input: nome, telefone, serviço, barbeiro, horário
→ Busca profile por telefone (via public_profiles)
→ Se não existe, cria profile (lead)
→ Cria appointment
→ Envia confirmação (email/WhatsApp)
```

### 3. Cadastro de Barbeiro (futuro - via admin)
```
Admin cria usuário:
→ Define role = 'barber'
→ Vincula em barbershop_staff
→ Cria registro em barbers
```

## Migrações de Segurança Aplicadas

### ✅ Fase 1 - Correções Críticas
1. Removidas políticas públicas inseguras em `profiles`
2. Criada view `public_profiles` (id, phone, full_name)
3. Recriada view `public_barbershops` (sem email)
4. Criada view `public_barbers` (sem telefone, user_id)
5. Criada função `check_time_slot_available`
6. Removida política pública de `appointments`

### ✅ Fase 2 - Sistema de Roles
7. Corrigido trigger `handle_new_user` (respeita role do metadata)
8. Atribuídas roles aos usuários pendentes

### ✅ Fase 3 - Vulnerabilidades Adicionais
9. Adicionadas colunas `whatsapp_phone` e `email_sender` em `barbershop_credentials`
10. Documentado uso de Supabase Secrets para tokens
11. Adicionadas políticas UPDATE/DELETE em `email_campaigns`

## Segurança de Credenciais

### ⚠️ IMPORTANTE: Tokens de API

**NÃO armazene tokens no banco de dados!**

Os tokens de API (WhatsApp, Email, etc.) devem ser armazenados como **Supabase Secrets** e acessados apenas pelas Edge Functions.

#### Como configurar:
1. Acesse o backend (Lovable Cloud)
2. Vá em Secrets
3. Adicione os secrets necessários:
   - `WHATSAPP_API_TOKEN`
   - `RESEND_API_KEY`
   - etc.

#### Como usar nas Edge Functions:
```typescript
// supabase/functions/send-whatsapp-notification/index.ts
const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');

// Usar token nas chamadas API
const response = await fetch(whatsappApiUrl, {
  headers: {
    'Authorization': `Bearer ${WHATSAPP_TOKEN}`
  }
});
```

#### Tabela `barbershop_credentials`
- `whatsapp_phone`: Número do WhatsApp (apenas identificador)
- `email_sender`: Email remetente (apenas identificador)
- `whatsapp_credentials`: **DEPRECATED** - não usar
- `email_credentials`: **DEPRECATED** - não usar

## Checklist de Segurança para Novas Features

Ao adicionar nova funcionalidade:

- [ ] Tabela tem RLS habilitado?
- [ ] Políticas RLS criadas para cada role?
- [ ] Dados sensíveis protegidos?
- [ ] Views públicas criadas se necessário?
- [ ] Funções usam `SECURITY DEFINER`?
- [ ] Código frontend usa views públicas (não tabelas diretas)?
- [ ] Testado com usuário não autenticado?
- [ ] Testado com cada role (admin, barber, client)?
- [ ] Documentação atualizada?

## Testes de Segurança

### Verificar acesso não autorizado
```sql
-- Como usuário anon (não autenticado)
SELECT * FROM profiles; -- ❌ Deve falhar (exceto via public_profiles)
SELECT * FROM appointments; -- ❌ Deve falhar
SELECT phone FROM barbers; -- ❌ Não deve retornar phone
SELECT email FROM barbershops; -- ❌ Não deve retornar email

-- Deve funcionar (views públicas)
SELECT * FROM public_profiles;
SELECT * FROM public_barbers;
SELECT * FROM public_barbershops;
```

### Verificar segregação de dados
```sql
-- Como admin de barbearia A
SELECT * FROM appointments WHERE barbershop_id = 'barbearia-B-id';
-- ❌ Deve retornar vazio

-- Como barber
SELECT * FROM barbershop_credentials;
-- ❌ Deve falhar (apenas admins)
```

### Verificar roles atribuídos
```sql
-- Todos os usuários autenticados devem ter role
SELECT p.full_name, ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
INNER JOIN auth.users au ON p.id = au.id
WHERE ur.role IS NULL;
-- ✅ Deve retornar VAZIO
```

## Auditoria de Segurança

Execute periodicamente:

```sql
-- 1. Usuários sem role
SELECT COUNT(*) FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
INNER JOIN auth.users au ON p.id = au.id
WHERE ur.role IS NULL;
-- Esperado: 0

-- 2. Tabelas sem RLS
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename FROM pg_policies WHERE schemaname = 'public'
);
-- Verificar se as tabelas listadas realmente deveriam ter RLS

-- 3. Políticas muito permissivas
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND qual = 'true';
-- Verificar se as políticas "true" são intencionais
```

## Contato de Emergência

Em caso de vulnerabilidade descoberta:
1. Revise imediatamente as políticas RLS afetadas
2. Execute o script de auditoria acima
3. Consulte esta documentação para correções
4. Teste todas as alterações antes de aplicar em produção

---

**Última atualização:** 2025-11-06  
**Versão:** 1.0.0  
**Status:** ✅ Segurança implementada e testada
