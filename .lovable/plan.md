

## Plano: Otimização do Sistema de Assinaturas com Cobrança Recorrente

### Situação Atual
O sistema de assinaturas atual é **manual**: o admin cria planos como serviços, vende para o cliente via CRM, e renova/cancela manualmente. Não há cobrança automática recorrente.

### O que será implementado

#### 1. Nova página dedicada de Gestão de Assinaturas (`/subscriptions`)
- Separar assinaturas da página de serviços — hoje planos são misturados com serviços comuns
- Tela com CRUD completo de planos: nome, preço, créditos, duração, descrição
- Configuração de **recorrência**: mensal, quinzenal, semanal
- Configuração de **método de cobrança preferido**: PIX, cartão, boleto, dinheiro
- Toggle para ativar/desativar cobrança recorrente automática (lembrete ao cliente)

#### 2. Tabela `subscription_plans_v2` (migração)
- Campos adicionais: `billing_interval` (monthly/biweekly/weekly), `billing_method` (pix/card/cash/boleto), `auto_renew` (boolean), `reminder_days_before` (integer)
- Ou adicionar essas colunas à tabela `subscription_plans` existente que já tem estrutura similar

#### 3. Melhorar o fluxo de venda e gestão
- Painel de assinaturas ativas com visão geral: clientes, status, próxima cobrança, créditos restantes
- **Renovação automática**: quando `auto_renew` está ativo e a assinatura expira, o sistema renova automaticamente os créditos e registra a cobrança pendente
- Histórico de cobranças por assinatura
- Notificação/lembrete X dias antes do vencimento (configurável pelo empresário)

#### 4. Tabela `subscription_payments` (migração)
- Registrar cada cobrança recorrente: `subscription_id`, `amount`, `due_date`, `paid_at`, `payment_method`, `status` (pending/paid/overdue)
- Permite ao empresário ver o histórico financeiro de cada assinatura

#### 5. Dashboard de Assinaturas no painel do empresário
- Cards: total assinaturas ativas, receita recorrente mensal (MRR), assinaturas expirando, inadimplentes
- Lista filtrada de clientes com assinatura

### Mudanças no banco de dados

```text
subscription_plans (adicionar colunas):
  + billing_interval: text (monthly/biweekly/weekly)
  + billing_method: text (pix/card/cash/boleto)  
  + auto_renew: boolean default true
  + reminder_days_before: integer default 3

subscription_payments (nova tabela):
  - id, subscription_id, amount, due_date, paid_at
  - payment_method, status, created_at
  - barbershop_id (para RLS)

client_subscriptions (adicionar colunas):
  + auto_renew: boolean default true
  + next_billing_date: timestamptz
  + billing_interval: text
```

### Arquivos a criar/editar

- **Criar**: `src/pages/SubscriptionsManagement.tsx` — página dedicada
- **Criar**: `src/hooks/useSubscriptionManagement.ts` — hook de gestão
- **Criar**: `src/components/subscriptions/SubscriptionDashboard.tsx` — cards de métricas
- **Criar**: `src/components/subscriptions/PlanFormDialog.tsx` — formulário de plano
- **Criar**: `src/components/subscriptions/ActiveSubscriptionsList.tsx` — lista de assinaturas ativas
- **Criar**: `src/components/subscriptions/PaymentHistoryTable.tsx` — histórico de cobranças
- **Editar**: `src/App.tsx` — nova rota `/subscriptions`
- **Editar**: `src/components/Navbar.tsx` — link no menu
- **Editar**: `src/hooks/useLeadSubscription.ts` — adaptar para novos campos
- **Migração SQL**: adicionar colunas + nova tabela + RLS policies

