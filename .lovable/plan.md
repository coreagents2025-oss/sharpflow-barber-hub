
## Diagnóstico

### Problemas identificados

**1. Race condition em `ResetPassword.tsx`**
O `useEffect` chama `setChecking(false)` tanto no `onAuthStateChange` quanto no `getSession`. O problema: `getSession()` resolve mais rápido que o evento `PASSWORD_RECOVERY` (que vem do hash da URL). Se `getSession()` retornar uma sessão *antes* do evento `PASSWORD_RECOVERY` ser emitido, `validSession` pode nunca ser setado para `true`. Pior: `setChecking(false)` pode ser chamado antes do evento, mostrando o estado "link inválido" mesmo com um link válido.

**Solução:** O `onAuthStateChange` deve ser a única fonte de verdade. `getSession()` serve apenas como fallback inicial, e `checking` só deve ser `false` após um tempo suficiente para o evento `PASSWORD_RECOVERY` disparar.

**2. `AuthRedirect` pode redirecionar para `/pdv` ou `/super-admin` durante o reset**
Se o usuário já tem sessão (ou a sessão de recovery é estabelecida), o `AuthRedirect` pode redirecionar antes de `/reset-password` processar. Precisa ignorar a rota `/reset-password`.

**3. `ForgotPasswordDialog` não distingue contexto admin vs cliente**
No portal do cliente (`/:slug/cliente`), o `redirectTo` do email deveria ser `/:slug/cliente` para voltar ao login correto. Atualmente sempre redireciona para `/reset-password` que linka de volta para `/auth` (admin).

**4. Email subjects ainda em inglês**
Os subjects no `auth-email-hook` estão em inglês (`"Reset your password"`, etc.) enquanto toda a UI é em português.

---

## O que será feito

### 1. Corrigir `ResetPassword.tsx` — race condition
- Reorganizar a lógica: `onAuthStateChange` configurado primeiro (antes do `getSession`)
- `setChecking(false)` só após um timeout mínimo para garantir que o evento `PASSWORD_RECOVERY` tenha chance de disparar
- Manter `validSession = true` também se já houver sessão ativa ao abrir a página

### 2. Corrigir `AuthRedirect.tsx` — ignorar `/reset-password`
- Adicionar `/reset-password` na lista de rotas que não devem sofrer redirect automático

### 3. Atualizar `ForgotPasswordDialog` — contexto ciente do portal
- Adicionar prop opcional `redirectBackTo` para personalizar para onde o reset leva
- No portal do cliente (`ClientAuth.tsx`), passar `/${slug}/cliente` como destino pós-reset

### 4. Traduzir subjects dos emails para português
- `"Confirme seu email"`, `"Você foi convidado"`, `"Seu link de acesso"`, `"Redefinir sua senha"`, `"Confirme seu novo email"`, `"Seu código de verificação"`
- Redeployar `auth-email-hook`

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/ResetPassword.tsx` | Corrigir race condition no detection do evento `PASSWORD_RECOVERY` |
| `src/components/AuthRedirect.tsx` | Excluir `/reset-password` do redirect automático |
| `src/components/ForgotPasswordDialog.tsx` | Adicionar prop `redirectBackTo` |
| `src/pages/ClientAuth.tsx` | Passar `redirectBackTo` para o dialog |
| `supabase/functions/auth-email-hook/index.ts` | Traduzir subjects para pt-BR + redeploy |

Sem migrações de banco necessárias.
