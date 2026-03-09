
## Integração Asaas — Cobrança Recorrente para Barbearias

### Visão geral do que será construído

A Asaas é uma plataforma brasileira de pagamentos que suporta cobranças recorrentes via PIX, boleto e cartão. A integração vai permitir que cada barbearia conecte sua própria conta Asaas e que as cobranças de assinatura sejam criadas e pagas automaticamente — sem a barbearia precisar marcar "pago" manualmente.

### Fluxo completo

```
Admin configura API Key Asaas em Configurações
         ↓
Admin cria assinatura para um cliente
         ↓
Sistema cria cliente no Asaas + assinatura recorrente
         ↓
Asaas cobra automaticamente no vencimento
         ↓
Webhook Asaas → Edge Function → atualiza subscription_payments como 'paid'
         ↓
Cliente acessa portal com créditos renovados
```

### O que precisa ser feito

---

#### 1. Banco de dados — nova coluna em `barbershop_credentials`

Adicionar `asaas_credentials` como JSONB na tabela `barbershop_credentials` para armazenar:
- `api_key`: chave de produção/sandbox da conta Asaas da barbearia
- `environment`: `sandbox` ou `production`
- `enabled`: boolean

Também adicionar em `client_subscriptions`:
- `asaas_subscription_id`: text (ID da assinatura criada no Asaas)
- `asaas_customer_id`: text (ID do cliente criado no Asaas)

---

#### 2. Edge Function `asaas-create-subscription`

Chamada no momento de confirmar assinatura no `AddSubscriberDialog` (quando Asaas está habilitado):

- Recebe: `subscription_id`, `barbershop_id`, `lead_id`, `plan_id`
- Busca API key da barbearia em `barbershop_credentials.asaas_credentials`
- Cria o **customer** no Asaas com nome/CPF/email do lead
- Cria a **subscription** recorrente no Asaas com o cycle correto (`WEEKLY` / `BIWEEKLY` / `MONTHLY`), valor e método (`BOLETO` / `PIX` / `CREDIT_CARD`)
- Salva `asaas_subscription_id` e `asaas_customer_id` em `client_subscriptions`

---

#### 3. Edge Function `asaas-webhook` (sem JWT)

Recebe notificações da Asaas para cada barbearia — URL pública:

Eventos tratados:
- `PAYMENT_RECEIVED` / `PAYMENT_CONFIRMED` → marca `subscription_payments` como `paid`, atualiza `client_subscriptions` (renova créditos, nova `expires_at` e `next_billing_date`)
- `PAYMENT_OVERDUE` → marca cobrança como `overdue`
- `SUBSCRIPTION_DELETED` → cancela a assinatura no sistema

Como identificar de qual barbearia é o webhook: a URL receberá um query param `?barbershop_id=xxx` que será configurada na Asaas.

---

#### 4. Configuração do Asaas em Settings.tsx

Nova aba/seção **"Pagamentos"** dentro de Configurações com:
- Toggle "Integrar com Asaas"
- Campo API Key (produção ou sandbox)
- Seletor ambiente (Sandbox / Produção)
- Mostrar a **URL do webhook** para a barbearia copiar e colar na conta Asaas
- Status da conexão (botão "Testar conexão" que faz uma chamada a `/v3/myAccount`)

---

#### 5. Atualizar `AddSubscriberDialog`

Após criar a assinatura localmente, verificar se a barbearia tem Asaas habilitado. Se sim, invocar `asaas-create-subscription` automaticamente. Mostrar badge "Cobrança automática via Asaas" na confirmação.

---

#### 6. Badge visual em `ActiveSubscriptionsList`

Mostrar ícone "Asaas" ou badge "Auto" na lista de assinantes que têm `asaas_subscription_id` preenchido.

---

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/` | ADD `asaas_credentials` jsonb em `barbershop_credentials`, ADD `asaas_subscription_id` e `asaas_customer_id` em `client_subscriptions` |
| `supabase/functions/asaas-create-subscription/index.ts` | Criar |
| `supabase/functions/asaas-webhook/index.ts` | Criar |
| `supabase/config.toml` | Adicionar ambas as funções |
| `src/pages/Settings.tsx` | Adicionar seção "Pagamentos" com config Asaas |
| `src/components/subscriptions/AddSubscriberDialog.tsx` | Invocar Asaas ao criar assinatura |
| `src/components/subscriptions/ActiveSubscriptionsList.tsx` | Badge de "cobrança automática" |

### Secret necessário

A API Key da Asaas fica **por barbearia** (em `barbershop_credentials`), não como secret global — porque cada barbearia tem sua própria conta Asaas. Isso é a abordagem correta para um produto multi-tenant.

### Ciclos suportados

| Sistema | Asaas |
|---|---|
| `monthly` | `MONTHLY` |
| `weekly` | `WEEKLY` |
| `biweekly` | `BIWEEKLY` |

### Métodos de pagamento mapeados

| Sistema | Asaas |
|---|---|
| `pix` | `PIX` |
| `boleto` | `BOLETO` |
| `card` | `CREDIT_CARD` |
| `cash` | não integrado (mantém manual) |
