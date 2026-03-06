

## Personalização de Planos de Assinatura com Benefícios e Pontuação

### Situação atual
A tabela `subscription_plans` tem campos básicos (nome, preço, créditos, cobrança). Não há como vincular serviços específicos como benefícios nem sistema de pontuação/recompensas.

### Novas tabelas necessárias

**1. `plan_benefits`** — Vincula serviços ou itens customizados a um plano
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| plan_id | uuid FK → subscription_plans | |
| service_id | uuid FK → services (nullable) | Serviço existente incluído |
| custom_name | text (nullable) | Nome de benefício personalizado (ex: "Cerveja grátis") |
| custom_description | text (nullable) | Descrição do benefício |
| quantity_per_cycle | int default 1 | Quantas vezes pode usar por ciclo |
| benefit_type | text | `service`, `product`, `discount`, `custom` |
| discount_value | numeric default 0 | Desconto aplicado (% ou fixo) |
| discount_type | text default 'percentage' | `percentage` ou `fixed` |

**2. `loyalty_rewards`** — Prêmios/recompensas resgatáveis por pontos
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| barbershop_id | uuid FK → barbershops | |
| points_required | int | Pontos necessários para resgatar |
| is_active | boolean default true | |
| name | text | Nome do prêmio |
| description | text | |
| reward_type | text | `service`, `product`, `discount`, `custom` |

**3. `plan_points_config`** — Config de pontuação por plano
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| plan_id | uuid FK → subscription_plans | |
| points_per_visit | int default 1 | Pontos ganhos por visita |
| points_per_real_spent | numeric default 0 | Pontos por R$ gasto |
| bonus_points_monthly | int default 0 | Bônus mensal de pontos |

**4. `client_loyalty_points`** — Saldo de pontos do cliente
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| subscription_id | uuid FK → client_subscriptions | |
| barbershop_id | uuid FK → barbershops | |
| lead_id | uuid FK → leads | |
| total_points | int default 0 | |
| redeemed_points | int default 0 | |

**5. `loyalty_point_history`** — Histórico de movimentação de pontos
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| loyalty_id | uuid FK → client_loyalty_points | |
| points | int | Positivo = ganhou, negativo = resgatou |
| reason | text | `visit`, `purchase`, `bonus`, `redemption` |
| reference_id | uuid nullable | ID do agendamento ou recompensa |
| created_at | timestamp | |

### RLS Policies
Todas as novas tabelas seguem o padrão existente: admins podem tudo na sua barbearia, barbers podem visualizar, dados isolados por `barbershop_id`.

### Alterações no frontend

**`PlanFormDialog.tsx`** — Expandir com seções:
- **Benefícios de Serviços**: Multi-select dos serviços ativos da barbearia, com quantidade por ciclo e desconto opcional
- **Benefícios Customizados**: Lista dinâmica para adicionar itens livres (ex: "Cerveja grátis", "Produto 20% off")
- **Configuração de Pontos**: Pontos por visita, por R$ gasto, bônus mensal

**`SubscriptionsManagement.tsx`** — Nova aba "Recompensas" para gerenciar prêmios resgatáveis por pontos (CRUD de `loyalty_rewards`)

**`useSubscriptionManagement.ts`** — Expandir para:
- Buscar/salvar `plan_benefits` ao criar/editar plano
- Buscar/salvar `plan_points_config`
- CRUD de `loyalty_rewards`

**Cards de plano** — Exibir lista de benefícios inclusos e config de pontos

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar 5 tabelas + RLS |
| `src/hooks/useSubscriptionManagement.ts` | Adicionar lógica de benefícios, pontos e recompensas |
| `src/components/subscriptions/PlanFormDialog.tsx` | Seções de benefícios de serviços, customizados e pontos |
| `src/pages/SubscriptionsManagement.tsx` | Nova aba "Recompensas", exibir benefícios nos cards |
| Novo: `src/components/subscriptions/RewardsManager.tsx` | CRUD de prêmios/recompensas |
| Novo: `src/components/subscriptions/PlanBenefitsList.tsx` | Componente de exibição de benefícios no card |

