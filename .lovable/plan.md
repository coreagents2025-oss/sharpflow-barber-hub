
## Situação atual e o que construir

**Problema real:** O administrador cadastra assinantes pelo CRM/painel, mas esses clientes nunca criaram uma senha. Sem senha, eles não conseguem acessar a área do assinante mesmo que o painel já exista.

**Solução em 2 partes:**

### Parte 1 — Botão "Enviar acesso" na lista de assinaturas ativas

Na aba "Ativas" da página de Assinaturas, adicionar um botão **"Enviar Acesso"** por assinante. Ao clicar, o sistema:
1. Chama `supabase.auth.admin.inviteUserByEmail()` via **Edge Function** (pois a API admin não pode ser chamada do frontend com a chave anon)
2. A Edge Function usa a `SERVICE_ROLE_KEY` para convidar o email do lead
3. O cliente recebe um email com link mágico que define senha e já cai no dashboard dele `/:slug/cliente/dashboard`
4. Se o cliente já tem conta (já foi convidado antes), o botão muda para "Reenviar acesso"

**Edge Function:** `supabase/functions/invite-client/index.ts`
- Recebe: `{ email, full_name, slug, barbershop_id }`
- Usa `supabase.auth.admin.inviteUserByEmail(email, { data: { role: 'client', barbershop_id }, redirectTo: ... })`
- O convite já inclui `role: 'client'` e `barbershop_id` no metadata → o trigger `handle_new_user` vai criar o `client_barbershop_link` automaticamente

### Parte 2 — Link de acesso mais visível no catálogo público

Atualmente o link "🔒 Área do Assinante" aparece apenas no rodapé (pequeno, misturado com links de privacidade). Melhorar a visibilidade adicionando:
- **Banner/card flutuante** abaixo do hero section do catálogo, com destaque visual separado do rodapé

---

## Arquivos a modificar/criar

| Arquivo | Ação |
|---|---|
| `supabase/functions/invite-client/index.ts` | Criar — Edge Function de convite |
| `src/components/subscriptions/ActiveSubscriptionsList.tsx` | Adicionar botão "Enviar/Reenviar Acesso" por linha |
| `src/hooks/useSubscriptionManagement.ts` | Adicionar função `inviteSubscriber(leadId)` |
| `src/pages/PublicCatalog.tsx` | Melhorar visibilidade do link da área do assinante |

---

## Fluxo completo

```text
Admin vê assinante na lista → clica "Enviar Acesso"
       ↓
Edge Function convida email do lead
       ↓
Cliente recebe email "Você foi convidado"
       ↓
Clica no link → define senha → acessa /:slug/cliente/dashboard
       ↓
Vê plano ativo, créditos, cobranças pendentes
```

**Sem migração de banco** — reutiliza o trigger `handle_new_user` existente e o fluxo de convite nativo do Supabase Auth.
