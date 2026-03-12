
## Two Issues Identified

### Issue 1 — Link do convite aponta para URL do Lovable em vez da URL da barbearia

**Root cause:** Na edge function `invite-client/index.ts` (linha 54), o `redirectTo` é construído assim:

```typescript
const redirectTo = `${req.headers.get('origin') || 'https://sharpflow-barber-hub.lovable.app'}/${slug}/cliente/dashboard`;
```

O `req.headers.get('origin')` retorna a origem da requisição — que é o domínio do Lovable preview (`id-preview--....lovable.app`) quando chamado via `supabase.functions.invoke()` no browser. Em produção, pode retornar o domínio publicado, mas nunca o domínio customizado da barbearia.

**Fix:** A função já recebe `slug` e `barbershop_id` no body. Antes de construir o `redirectTo`, buscar o `custom_domain` e o `slug` da barbearia no banco e construir a URL correta:

```typescript
// Buscar custom_domain da barbearia
const { data: barbershop } = await adminClient
  .from('barbershops')
  .select('custom_domain, slug')
  .eq('id', barbershop_id)
  .single();

const baseUrl = barbershop?.custom_domain
  ? `https://${barbershop.custom_domain}`
  : `https://barberplus.shop`; // domínio publicado padrão da plataforma

const redirectTo = `${baseUrl}/${slug}/cliente/dashboard`;
```

---

### Issue 2 — `SubscriptionPanel` (no CRM/LeadDetails) não tem botão de "Registrar Pagamento"

**Situação atual:** O painel tem apenas "Renovar" (renova créditos + prazo) e "Cancelar". Não existe forma de registrar que um pagamento foi recebido por uma assinatura diretamente no painel do lead.

**Fix:** Adicionar um terceiro botão "Registrar Pagamento" que:
1. Busca a cobrança pendente (`subscription_payments`) da assinatura ativa do lead
2. Se encontrar, abre um diálogo/popover simples para confirmar o pagamento (método de pagamento + valor)
3. Chama `markPaymentPaid` via update em `subscription_payments` com `status: 'paid'` e `paid_at: now()`
4. Se não houver cobrança pendente, cria uma nova marcada já como `paid` (registro manual)

**Mudanças necessárias:**
- `src/components/subscriptions/SubscriptionPanel.tsx`: adicionar botão "Pagar" + modal simples de confirmação de pagamento
- `src/hooks/useLeadSubscription.ts`: adicionar função `registerPayment(paymentMethod?: string)` que busca e confirma a cobrança pendente ou cria+confirma uma nova

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/invite-client/index.ts` | Buscar `custom_domain` da barbearia no banco; construir `redirectTo` com domínio correto |
| `src/hooks/useLeadSubscription.ts` | Adicionar função `registerPayment(paymentMethod?)` |
| `src/components/subscriptions/SubscriptionPanel.tsx` | Adicionar botão "Registrar Pagamento" + dialog inline de confirmação |

