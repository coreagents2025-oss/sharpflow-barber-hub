
## Entendimento do pedido

O usuário quer que, ao criar uma assinatura manual via `AddSubscriberDialog`, a barbearia possa **definir um email + senha padrão para o cliente** no mesmo momento. Assim o cliente já tem acesso imediato ao portal (`/:slug/cliente/dashboard`) sem precisar receber ou verificar nenhum email. Depois ele pode trocar a senha pelo próprio dashboard.

Fluxo atual:
1. Admin cria assinatura → lead_id é salvo
2. Admin clica "Enviar Acesso" → dispara email via `invite-client` (depende de email funcionar)

Fluxo desejado:
1. Admin cria assinatura → no passo de plano, define email + senha para o cliente
2. Backend cria a conta do cliente imediatamente com a senha especificada
3. Cliente acessa na hora com email + senha sem precisar de email de verificação

---

## O que precisa ser feito

### 1. Nova Edge Function `create-client-account`
Cria a conta do cliente usando a Admin API (service role) com `supabase.auth.admin.createUser`:
- Recebe: `email`, `password`, `full_name`, `barbershop_id`, `slug`, `lead_id`
- Usa `email_confirm: true` para **não exigir confirmação de email**
- Cria o usuário com `role: 'client'` nos metadados → o trigger `handle_new_user` já cuida de criar o perfil e o `client_barbershop_links`
- Se o usuário já existe → retorna erro claro indicando que já tem conta
- Atualiza o `client_subscriptions` para associar o `client_id` ao usuário criado (além do `lead_id` que já está lá)

Esse endpoint não existe ainda — `invite-client` só manda email, não define senha.

### 2. Atualizar `AddSubscriberDialog` — passo "plan"
Adicionar campos opcionais no passo de plano (passo 3):
- Campo **Email** (preenchido automaticamente se o lead já tem email)
- Campo **Senha** (com toggle mostrar/ocultar, mínimo 6 caracteres)
- Campo **Confirmar senha**

Com um toggle ou seção "Criar acesso ao portal":
- Se preenchido → cria conta imediatamente ao confirmar
- Se deixado em branco → cria só a assinatura como antes (sem acesso)

### 3. Adicionar troca de senha no `ClientDashboard`
Um card simples "Segurança" com um botão "Alterar senha" que abre um modal com:
- Campo "Nova senha"
- Campo "Confirmar senha"
- Chamada `supabase.auth.updateUser({ password })`

---

## Arquivos a modificar/criar

| Arquivo | Ação |
|---|---|
| `supabase/functions/create-client-account/index.ts` | Criar — nova edge function |
| `supabase/config.toml` | Adicionar `[functions.create-client-account]` com `verify_jwt = false` |
| `src/components/subscriptions/AddSubscriberDialog.tsx` | Adicionar campos de email/senha no passo "plan" + lógica de criação de conta |
| `src/pages/ClientDashboard.tsx` | Adicionar seção "Segurança" com troca de senha |

**Sem migração de banco necessária** — o trigger `handle_new_user` já lida com clientes, e `client_subscriptions` já tem a coluna `client_id`.

---

## Detalhe de segurança
A edge function `create-client-account` valida o token do admin chamador antes de usar a service role key para criar o usuário — mesma lógica do `invite-client` existente. A senha é transmitida somente via HTTPS e nunca logada.
