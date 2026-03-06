

## Portal do Cliente — `/:slug/cliente`

Portal completo com isolamento multi-tenant rigoroso via `client_barbershop_links`.

---

### 1. Migração de Banco de Dados

**Tabela `client_barbershop_links`**:
```sql
CREATE TABLE public.client_barbershop_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id uuid NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, barbershop_id)
);
```

RLS: SELECT onde `auth.uid() = user_id`; INSERT público (para cadastro).

**Atualizar `handle_new_user()`**: Se `raw_user_meta_data->>'role' = 'client'`, NÃO criar barbearia. Apenas criar profile + user_role `client` + inserir em `client_barbershop_links` com o `barbershop_id` dos metadados.

**Função `get_client_barbershop_id()`** (SECURITY DEFINER): Retorna `barbershop_id` para o cliente autenticado dado um slug.

**RLS adicional**: Policies em `client_loyalty_points`, `loyalty_rewards` e `subscription_payments` para que clientes possam SELECT seus próprios dados via join com `client_barbershop_links`.

---

### 2. Frontend — Novos Arquivos

| Arquivo | Função |
|---|---|
| `src/pages/ClientAuth.tsx` | Login/cadastro contextualizado — busca barbearia pelo slug, passa `{ role: 'client', barbershop_id }` nos metadados do signup |
| `src/pages/ClientDashboard.tsx` | Dashboard com 4 tabs |
| `src/components/ClientRoute.tsx` | Guard: valida role=client + vínculo com barbershop via slug |
| `src/components/client/ClientNavbar.tsx` | Navbar com logo da barbearia + logout |
| `src/components/client/AppointmentsTab.tsx` | Histórico + cancelar/reagendar |
| `src/components/client/SubscriptionsTab.tsx` | Assinaturas ativas + créditos |
| `src/components/client/LoyaltyTab.tsx` | Pontos + resgatar recompensas |
| `src/components/client/PaymentsTab.tsx` | Cobranças pendentes + PIX |

---

### 3. Rotas (App.tsx)

```
/:slug/cliente         → ClientAuth
/:slug/cliente/dashboard → ClientRoute > ClientDashboard
```

---

### 4. Auth Flow

1. Cliente acessa `/:slug/cliente`, vê login/cadastro com nome/logo da barbearia
2. Cadastro envia metadata `{ role: 'client', barbershop_id }` — trigger cria profile + role + link
3. Login verifica vínculo com a barbearia via `client_barbershop_links`
4. `AuthRedirect` atualizado para redirecionar clients para `/:slug/cliente/dashboard`
5. `useAuth` atualizado para detectar role `client`

---

### 5. Segurança Multi-Tenant

- Queries do portal filtram por `barbershop_id` do link
- RLS existente em `appointments` (`auth.uid() = client_id`) já protege
- Novas policies em `client_loyalty_points`, `loyalty_rewards`, `subscription_payments` para SELECT por clientes
- Cliente nunca acessa dados de outra barbearia — validação via RLS no servidor

---

### 6. Ordem de Implementação

1. Migração: `client_barbershop_links` + atualizar trigger + RLS + função helper
2. `ClientAuth.tsx` + `ClientRoute.tsx`
3. Rotas no `App.tsx`
4. `ClientDashboard.tsx` com tabs (agendamentos, assinaturas, fidelidade, pagamentos)
5. Atualizar `AuthRedirect` e `useAuth` para clientes

