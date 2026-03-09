
## Contexto e objetivo

O usuário quer integrar o **Asaas para cobrar as próprias barbearias** pelo uso da plataforma BarberPlus (SaaS billing), diferente do que foi implementado antes (Asaas para as barbearias cobrarem seus clientes). É uma funcionalidade completamente nova:

- Landing page já mostra planos (R$89,90/mês ou 12x R$69,00/ano) mas nenhuma cobrança acontece
- Ao se cadastrar, barbearias entram direto sem pagamento
- Super Admin não tem controle de qual plano cada barbearia assina nem pode cobrar automaticamente

## O que será construído

### Fluxo completo
```
Barbearia se cadastra → Período trial (ex: 7 dias)
         ↓
Super Admin configura API Key Asaas global (da plataforma)
         ↓  
Barbearia escolhe plano em Settings ou é redirecionada ao expirar trial
         ↓
Sistema cria cliente + assinatura no Asaas (plataforma)
         ↓
Asaas cobra automaticamente no vencimento
         ↓
Webhook → atualiza status da barbearia (ativa/suspensa)
```

---

### 1. Banco de dados — novas colunas em `barbershops`

- `plan_type`: text (`trial`, `monthly`, `annual`, `free`) — default `trial`
- `plan_status`: text (`active`, `overdue`, `cancelled`, `suspended`) — default `active`
- `trial_ends_at`: timestamptz — default `now() + 7 days`
- `platform_asaas_subscription_id`: text — ID da assinatura na conta Asaas da plataforma
- `platform_asaas_customer_id`: text — ID do cliente na conta Asaas da plataforma

---

### 2. Secret global: `ASAAS_PLATFORM_API_KEY`

Uma única chave Asaas da própria plataforma (conta do dono do SaaS), usada para cobrar todas as barbearias. Diferente das chaves individuais por barbearia.

---

### 3. Edge Function `asaas-platform-subscribe`

Chamada quando barbearia escolhe um plano:
- Recebe: `barbershop_id`, `plan_type` (`monthly` ou `annual`), dados do responsável (nome, CPF/CNPJ, email, telefone)
- Usa `ASAAS_PLATFORM_API_KEY` (da plataforma)
- Cria customer no Asaas com dados da barbearia
- Cria subscription recorrente (`MONTHLY` / `YEARLY`)
- Salva IDs no `barbershops` e atualiza `plan_type` e `plan_status`

---

### 4. Edge Function `asaas-platform-webhook`

Pública, sem JWT, URL: `.../asaas-platform-webhook`
- `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` → `plan_status = 'active'`
- `PAYMENT_OVERDUE` → `plan_status = 'overdue'`
- `SUBSCRIPTION_DELETED` / `PAYMENT_DELETED` → `plan_status = 'cancelled'`, `is_suspended = true`

---

### 5. Página de planos em Settings.tsx

Nova aba/seção **"Minha Assinatura"** para a barbearia ver:
- Plano atual (trial/mensal/anual) com dias restantes se trial
- Status do pagamento
- Botão "Assinar Plano Mensal" e "Assinar Plano Anual"
- Formulário para CPF/CNPJ, nome, telefone (necessário para criar customer no Asaas)
- Depois de assinar: mostrar status e data do próximo vencimento

---

### 6. Painel Super Admin — aba "Assinaturas SaaS"

Nova página `/super-admin/saas-billing`:
- Tabela de barbearias com: Plano, Status, Próx. vencimento, Asaas ID
- Ação manual: "Cancelar assinatura", "Ver histórico"
- Configuração da API Key Asaas da plataforma (salva como secret)

---

### 7. Middleware de acesso (bloquear barbearias inadimplentes)

Em `ProtectedRoute.tsx` ou `AuthRedirect.tsx`:
- Verificar se `plan_status = 'overdue'` ou trial expirado → redirecionar para `/settings?tab=subscription` com banner de aviso

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/` | ADD `plan_type`, `plan_status`, `trial_ends_at`, `platform_asaas_*` em `barbershops` |
| `supabase/functions/asaas-platform-subscribe/index.ts` | Criar — cria cliente e assinatura da barbearia no Asaas da plataforma |
| `supabase/functions/asaas-platform-webhook/index.ts` | Criar — recebe notificações e atualiza status das barbearias |
| `supabase/config.toml` | Registrar novas funções |
| `src/pages/Settings.tsx` | Adicionar aba "Minha Assinatura" |
| `src/pages/SuperAdmin/SaasBilling.tsx` | Criar — gestão de assinaturas das barbearias |
| `src/components/super-admin/SuperAdminSidebar.tsx` | Adicionar link "Assinaturas SaaS" |
| `src/hooks/useSuperAdminData.ts` | Adicionar queries para billing data |
| `src/components/AuthRedirect.tsx` | Verificar status do plano e redirecionar se inadimplente |

---

## Secret necessário

`ASAAS_PLATFORM_API_KEY` — chave da conta Asaas **da plataforma BarberPlus** (uma só para todas as barbearias). Será solicitada ao usuário antes da implementação.

## Preços configurados

| Plano | Ciclo Asaas | Valor |
|---|---|---|
| `monthly` | `MONTHLY` | R$ 89,90 |
| `annual` | `YEARLY` | R$ 828,00 |
