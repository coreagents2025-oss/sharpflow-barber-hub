
## Diagnóstico

O Super Admin precisa visualizar todas as `client_subscriptions` de todas as barbearias, mas dois bloqueios existem:

1. **RLS ausente**: A tabela `client_subscriptions` não tem policy para `is_super_admin()`, logo qualquer query retorna vazio.
2. **Página inexistente**: Não há rota `/super-admin/subscriptions` nem item no menu lateral.

---

## Plano de implementação

### 1. Migration SQL — RLS para super_admin em `client_subscriptions`

```sql
CREATE POLICY "Super admins can view all subscriptions"
ON public.client_subscriptions
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));
```

### 2. `src/hooks/useSuperAdminData.ts` — hook `useAllClientSubscriptions`

Adicionar query que busca:
- `client_subscriptions` (id, status, credits_remaining, expires_at, billing_interval, barbershop_id, lead_id, client_id, plan_id)
- Join enriquecido com: `barbershops` (name), `subscription_plans` (name, price), `leads` (full_name, phone), `profiles` (full_name, phone)

### 3. `src/pages/SuperAdmin/Subscriptions.tsx` — nova página

Tabela com colunas:
- **Cliente** (nome via lead ou profile + telefone)
- **Barbearia**
- **Plano** (nome + valor)
- **Status** (badge: ativa / expirada / cancelada)
- **Créditos restantes**
- **Expira em**
- **Recorrência** (semanal / quinzenal / mensal)

Filtros: busca por nome/telefone, filtro por status, filtro por barbearia.

Cards de resumo no topo: Total ativas, Total expiradas, MRR agregado (soma de todas as barbearias).

### 4. `src/App.tsx` — adicionar rota `/super-admin/subscriptions`

### 5. `src/components/super-admin/SuperAdminSidebar.tsx` — adicionar item "Assinantes" com ícone `UserCheck`

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| Migration SQL | Policy RLS `super_admin` em `client_subscriptions` |
| `src/hooks/useSuperAdminData.ts` | Adicionar `useAllClientSubscriptions` |
| `src/pages/SuperAdmin/Subscriptions.tsx` | Criar página nova |
| `src/App.tsx` | Registrar rota nova |
| `src/components/super-admin/SuperAdminSidebar.tsx` | Adicionar item no menu |
