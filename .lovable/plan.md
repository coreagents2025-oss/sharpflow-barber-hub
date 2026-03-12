
## Diagnóstico

No `PublicCatalog.tsx`, a query de serviços filtra explicitamente `is_subscription_plan = false` (linha 115), o que remove todos os planos de assinatura da galeria. A intenção original era evitar confusão, mas o resultado é que os clientes nunca veem os planos disponíveis.

A solução é buscar os planos da tabela `subscription_plans` separadamente e exibi-los na galeria com um destaque visual diferenciado — similar ao badge "Popular" mas com identidade "Assinatura".

---

## O que será feito

### 1. `PublicCatalog.tsx` — Buscar planos de assinatura

Adicionar um segundo fetch em `fetchServicesAndSettings`:
```typescript
const { data: plansData } = await supabase
  .from('subscription_plans')
  .select('*')
  .eq('barbershop_id', barbershopId)
  .eq('is_active', true)
  .order('price', { ascending: true });

if (plansData) setSubscriptionPlans(plansData);
```

Estado novo: `subscriptionPlans` (array de `SubscriptionPlan`).

### 2. `PublicCatalog.tsx` — Seção dedicada na galeria

Adicionar uma **seção separada** acima (ou abaixo, com destaque) dos serviços avulsos para os planos. A seção terá fundo/borda diferenciada (degradê primário) e título como "Planos de Assinatura".

Cada plano renderizado com um `SubscriptionPlanCard` — novo componente com:
- Badge roxo/dourado com ícone ⭐ ou 👑 "Assinatura"
- Nome do plano, preço/mês, créditos por ciclo
- Botão "Conhecer Plano" → redireciona para `/{slug}/cliente` (área do assinante)

### 3. `SubscriptionPlanCard.tsx` — Novo componente

```
┌─────────────────────────────────────────┐
│  [gradient top border]                   │
│  👑 Assinatura          R$ 89,90/mês    │
│  ─────────────────────────────────────  │
│  Plano Mensal Premium                    │
│  4 créditos/mês · Corte + Barba         │
│  Renovação automática                    │
│                                          │
│  [Conhecer Plano →]                      │
└─────────────────────────────────────────┘
```

Card com visual distinto dos serviços avulsos:
- Borda superior colorida (primary/accent)
- Badge "Assinatura" com ícone Crown (mesmo padrão do badge Popular)
- Exibe: `billing_interval`, `credits_per_month`, `price`
- Botão direciona para a área do cliente (`/{slug}/cliente`)

### 4. Layout da galeria

A galeria ficará com duas seções ordenadas:

```
[ Planos de Assinatura ]      ← nova seção em destaque
  [card 1]  [card 2]  [card 3]

[ Nossos Serviços ]           ← seção existente (sem mudança)
  [card]  [card]  [card]  ...
```

Se não houver planos ativos, a seção é omitida (condicional).

---

## Arquivos a modificar/criar

| Arquivo | Mudança |
|---|---|
| `src/pages/PublicCatalog.tsx` | Adicionar fetch de `subscription_plans`, novo state, nova seção de planos antes dos serviços |
| `src/components/SubscriptionPlanCard.tsx` | Novo componente de card para plano com badge "Assinatura" e botão de CTA |

Nenhuma mudança de banco, hooks ou RLS necessária — `subscription_plans` é acessível publicamente via a política existente.
