
## Diagnóstico dos problemas de email

Existem **dois sistemas de email separados** funcionando no projeto, e ambos têm problemas distintos:

---

### Sistema 1 — Emails de autenticação (convite, recuperação de senha)
**Usado por:** botão "Enviar Acesso" na lista de assinantes → Edge Function `invite-client`

**Problema:** O domínio `notify.www.barberplus.shop` está com status **"Pending"** — o DNS ainda não foi verificado. Isso significa que o email de autenticação enviado pelo Supabase (convite/recuperação) **está sendo bloqueado ou entregue com o remetente padrão** (não com a identidade da plataforma).

**Causa raiz:** A verificação DNS do domínio `www.barberplus.shop` ainda está com status `initiated` — nunca completou a verificação.

---

### Sistema 2 — Emails transacionais (bem-vindo, renovação, cancelamento, confirmação de agendamento)
**Usado por:** `send-subscription-email`, `send-booking-confirmation`

**Problema:** Esses emails **só são enviados se `notifications_enabled` for `true` nas credenciais da barbearia**. Verificamos o banco e as credenciais de todas as barbearias estão com `email_credentials: {}` — campo vazio. O código em `send-subscription-email` testa `if (!emailSettings.notifications_enabled)` com um truthy check, o que significa que um objeto vazio (`{}`) resulta em **`undefined` → bloqueado**.

> Ou seja: **nenhum email transacional está sendo enviado** porque `notifications_enabled` está undefined (tratado como false).

---

## O que precisa ser feito

### Correção 1 — DNS do domínio de email (requer ação manual do usuário)
O domínio `notify.www.barberplus.shop` precisa ter os registros DNS configurados. Isso é feito no painel do seu provedor de domínio (onde você comprou o domínio), não no código. Vou abrir o painel de configuração de email para você acessar as instruções DNS.

### Correção 2 — Lógica de `notifications_enabled` nos emails transacionais
**Arquivo:** `supabase/functions/send-subscription-email/index.ts`

Mudar a verificação de:
```ts
// ATUAL: só envia se explicitamente true (bloqueia quando campo está vazio)
if (!emailSettings.notifications_enabled) { return skipped }
```
Para:
```ts
// CORRETO: envia por padrão, só bloqueia se explicitamente false
if (emailSettings.notifications_enabled === false) { return skipped }
```

O `send-booking-confirmation` já usa a lógica correta (`=== false`). Apenas o `send-subscription-email` precisa ser corrigido.

### Correção 3 — Deploy das funções atualizadas
Após a correção do código, fazer o deploy de `send-subscription-email` e `auth-email-hook` para garantir que as versões mais recentes estejam ativas.

---

## Resumo das mudanças

| Ação | Onde | Quem executa |
|---|---|---|
| Configurar DNS do domínio | Provedor de domínio externo | **Você** (instruções no painel de email) |
| Corrigir lógica `notifications_enabled` | `send-subscription-email/index.ts` linha 289 | Lovable (automático) |
| Deploy das funções | Backend | Lovable (automático) |

**Nenhuma migração de banco necessária.**
