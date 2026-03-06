

## Plano: Emails transacionais para o fluxo de assinaturas

### Situação atual

O sistema tem **apenas 1 email** no fluxo de assinaturas:
- `send-subscription-reminder` — lembrete de vencimento (3 dias antes de expirar)

**Faltam emails críticos:**
1. **Boas-vindas ao assinar** — quando o admin cria a assinatura manualmente ou via importação
2. **Confirmação de renovação** — quando a assinatura é renovada
3. **Confirmação de cancelamento** — quando cancelada
4. **Pagamento confirmado** — quando o admin marca um pagamento como pago

### Mudanças

**1. Nova edge function `send-subscription-email`**
- Função única que aceita um `type` param: `welcome`, `renewal`, `cancellation`, `payment_confirmed`
- Usa o mesmo padrão visual (amber branding, logo, contact block) do `send-subscription-reminder`
- Busca dados do lead (nome, email), barbearia (nome, logo, contato) e plano (nome, preço, créditos)
- Não envia se `notifications_enabled` estiver desligado ou se o cliente não tiver email
- Templates HTML inline para cada tipo

**2. Disparar emails nos pontos corretos do frontend**

- `AddSubscriberDialog.tsx` — após `handleConfirm` com sucesso → chamar `send-subscription-email` type `welcome`
- `useSubscriptionManagement.ts`:
  - `renewSubscription` → chamar type `renewal`
  - `cancelSubscription` → chamar type `cancellation`
  - `markPaymentPaid` → chamar type `payment_confirmed`
- Todos os disparos são fire-and-forget (não bloqueia o fluxo principal)

**3. Registrar a função no `supabase/config.toml`**
```
[functions.send-subscription-email]
  verify_jwt = true
```

### Templates (resumo do conteúdo)

| Tipo | Assunto | Corpo |
|------|---------|-------|
| welcome | "Bem-vindo ao plano {nome}! — {barbearia}" | Detalhes do plano, créditos, validade, contato |
| renewal | "Assinatura renovada — {barbearia}" | Novos créditos, nova validade |
| cancellation | "Assinatura cancelada — {barbearia}" | Confirmação, convite para retornar |
| payment_confirmed | "Pagamento confirmado — {barbearia}" | Valor, método, data |

### Arquivos impactados
- **Novo**: `supabase/functions/send-subscription-email/index.ts`
- **Editados**: `supabase/config.toml`, `src/components/subscriptions/AddSubscriberDialog.tsx`, `src/hooks/useSubscriptionManagement.ts`

