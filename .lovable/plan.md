
## Diagnóstico Preciso

**Erro:**
```
insert or update on table "client_subscriptions" violates foreign key constraint 
"client_subscriptions_plan_id_fkey"
Key is not present in table "subscription_plans"
```

**Causa raiz:** `useLeadSubscription.ts` tem dois sistemas de planos conflitando:
- `fetchAvailablePlans` busca da tabela `services` (com `is_subscription_plan = true`), retornando IDs de serviços
- `createSubscription` usa esses IDs de serviço como `plan_id` na inserção em `client_subscriptions`
- Mas `client_subscriptions.plan_id` é FK para a tabela `subscription_plans` — que é uma tabela **diferente** com seus próprios IDs

O fluxo correto (usado em `AddSubscriberDialog`) busca planos da tabela `subscription_plans` — não de `services`.

---

## O Que Mudar

### 1. `src/hooks/useLeadSubscription.ts`

**Interface `SubscriptionPlan`** — atualizar para refletir o schema de `subscription_plans`:
- Remover: `is_subscription_plan`, `subscription_duration_days`  
- Adicionar: `billing_interval`, `is_active`, `auto_renew`, `billing_method`

**`fetchAvailablePlans`** — trocar query de `services` para `subscription_plans`:
```ts
// ANTES: buscava serviços com is_subscription_plan = true
.from('services').select('...').eq('is_subscription_plan', true)

// DEPOIS: busca tabela correta
.from('subscription_plans').select('id, name, price, description, credits_per_month, billing_interval, is_active, auto_renew, billing_method')
.eq('barbershop_id', barbershopId).eq('is_active', true)
```

**`fetchSubscription`** — trocar join de `services:service_id` para `subscription_plans:plan_id`:
```ts
// ANTES: join com services
services:service_id (name, price, credits_per_month, subscription_duration_days)

// DEPOIS: join com subscription_plans
subscription_plans:plan_id (name, price, credits_per_month, billing_interval)
```

**`createSubscription`** — corrigir o insert:
```ts
// ANTES (quebrado):
plan_id: planId,   // ID de services → FK violation
service_id: planId,

// DEPOIS (correto):
plan_id: planId,   // ID de subscription_plans → OK
// service_id: omitido (null por padrão)
billing_interval: plan.billing_interval,
auto_renew: plan.auto_renew,
```

Cálculo da expiração via `billing_interval` (weekly=7, biweekly=14, monthly=30) em vez de `subscription_duration_days`.

**`renewSubscription`** — mesma lógica de cálculo de dias via `billing_interval`.

### 2. `src/components/subscriptions/SellSubscriptionDialog.tsx`

- Substituir exibição `plan.subscription_duration_days dias` por texto de `billing_interval` (ex: "Mensal", "Semanal")
- Atualizar import do tipo `SubscriptionPlan` — já importa de `useLeadSubscription`, vai herdar a correção automaticamente

---

## Resumo das Mudanças

| Arquivo | O que muda |
|---|---|
| `src/hooks/useLeadSubscription.ts` | Interface + fetch de planos (de `services` → `subscription_plans`) + lógica de criação/renovação |
| `src/components/subscriptions/SellSubscriptionDialog.tsx` | Exibição de `billing_interval` em vez de `subscription_duration_days` |

Nenhuma migração de banco necessária — o problema é só no código.
