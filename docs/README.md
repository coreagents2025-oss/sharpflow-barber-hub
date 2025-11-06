# Documentação do Projeto BarberPLUS

## 📁 Estrutura de Documentação

### [SECURITY.md](./SECURITY.md)
Documentação completa de segurança do sistema, incluindo:
- Níveis de acesso por role (Admin, Barber, Client, Público)
- Dados protegidos e expostos
- Views seguras e suas utilizações
- Funções de segurança (has_role, get_user_barbershop, check_time_slot_available)
- Políticas RLS detalhadas
- Fluxos de cadastro
- Checklist de segurança para novas features

### [AUDIT_SECURITY.sql](./AUDIT_SECURITY.sql)
Script SQL para auditoria de segurança. Execute periodicamente para verificar:
- Usuários sem role atribuído
- Tabelas sem RLS
- Políticas muito permissivas
- Credenciais em plaintext
- Exposição de dados sensíveis
- Inconsistências entre tabelas

### [DATABASE.md](./DATABASE.md)
Documentação do schema do banco de dados (anterior à correção de segurança).

### [DATABASE_UPDATED.md](./DATABASE_UPDATED.md)
Documentação atualizada do schema incluindo multi-tenancy e roles.

### [API.md](./API.md)
Documentação das APIs e Edge Functions disponíveis.

## 🚀 Quick Start - Guia de Segurança

### Para Desenvolvedores

**Ao buscar dados públicos, use SEMPRE as views seguras:**

```typescript
// ✅ CORRETO - Usar views públicas
const { data: barbers } = await supabase
  .from('public_barbers')
  .select('*')
  .eq('barbershop_id', id);

const { data: profiles } = await supabase
  .from('public_profiles')
  .select('id, phone, full_name')
  .eq('phone', phone);

// ❌ ERRADO - Acesso direto expõe dados sensíveis
const { data: barbers } = await supabase
  .from('barbers')
  .select('*'); // Expõe phone e user_id

const { data: profiles } = await supabase
  .from('profiles')
  .select('*'); // Expõe email, avatar_url, etc.
```

**Ao verificar disponibilidade de horários:**

```typescript
// ✅ CORRETO - Usar função segura
const { data: isAvailable } = await supabase
  .rpc('check_time_slot_available', {
    _barbershop_id: barbershopId,
    _barber_id: barberId,
    _scheduled_at: scheduledAt.toISOString(),
    _duration_minutes: 60
  });

// ❌ ERRADO - Expõe todos os agendamentos
const { data: appointments } = await supabase
  .from('appointments')
  .select('*')
  .eq('barber_id', barberId);
```

### Para Administradores

**Armazenamento de Tokens:**
- ⚠️ NUNCA armazene tokens de API no banco de dados
- ✅ Use Supabase Secrets para tokens sensíveis
- ✅ Armazene apenas identificadores (phone, email sender) na tabela

**Executar Auditoria:**
```bash
# No Supabase SQL Editor ou via CLI
psql -f docs/AUDIT_SECURITY.sql
```

## 🔒 Correções de Segurança Implementadas

### Fase 1 - Proteção de Dados Sensíveis ✅
- Views seguras: `public_profiles`, `public_barbers`, `public_barbershops`
- Função `check_time_slot_available` para validação de horários
- Removidas políticas RLS perigosas

### Fase 2 - Sistema de Roles ✅
- Trigger `handle_new_user` corrigido para respeitar roles
- Roles atribuídos a todos os usuários autenticados

### Fase 3 - Vulnerabilidades Adicionais ✅
- Estrutura de credenciais atualizada (apenas identificadores)
- Políticas UPDATE/DELETE adicionadas em `email_campaigns`

### Fase 4 - Testes ✅
- Checklist de testes em SECURITY.md
- Script de auditoria em AUDIT_SECURITY.sql

### Fase 5 - Documentação ✅
- Documentação completa de segurança
- Guias de uso para desenvolvedores
- Scripts de auditoria automatizados

## 📊 Status do Sistema

**Segurança:** ✅ Implementada e Testada  
**Documentação:** ✅ Completa  
**Auditoria:** ✅ Script Disponível  
**Última Atualização:** 2025-11-06

## 🆘 Suporte

Em caso de dúvidas sobre segurança:
1. Consulte [SECURITY.md](./SECURITY.md)
2. Execute o script de auditoria
3. Revise os logs de erros RLS no Supabase

## 📝 Changelog de Segurança

### 2025-11-06 - Correção Completa de Segurança
- ✅ Protegidos: profiles, barbers, barbershops, appointments
- ✅ Criadas views públicas seguras
- ✅ Sistema de roles corrigido
- ✅ Credenciais protegidas
- ✅ Documentação criada
- ✅ Scripts de auditoria implementados

---

**Para mais informações, consulte os arquivos específicos de documentação listados acima.**
