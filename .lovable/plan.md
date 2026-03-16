
## Duas ações necessárias

### 1. Como fazer login como Super Admin

O Super Admin usa a **mesma tela de login** em `/auth` (não existe tela separada). O sistema detecta automaticamente o role `super_admin` no banco de dados e redireciona para `/super-admin`.

**Passos:**
1. Acesse `/auth` no projeto
2. Use o email/senha da conta que tem o role `super_admin` na tabela `user_roles`
3. Após login, o sistema redireciona automaticamente para `/super-admin`

Para verificar qual usuário tem `super_admin`, posso consultar o banco agora mesmo.

---

### 2. Reverter assinaturas de clientes da Barbearia Anjus

A operação anterior definiu `expires_at = NULL` e `status = 'active'` em todas as 9 assinaturas de clientes (`client_subscriptions`) da Barbearia Anjus. Precisamos restaurá-las para ter datas de expiração calculadas com base no `billing_interval` e no `started_at` de cada uma.

**SQL a executar (via ferramenta de dados — sem migration, pois é atualização de dados):**

```sql
UPDATE client_subscriptions
SET 
  expires_at = CASE billing_interval
    WHEN 'weekly'    THEN started_at + INTERVAL '7 days'
    WHEN 'biweekly'  THEN started_at + INTERVAL '14 days'
    WHEN 'monthly'   THEN started_at + INTERVAL '30 days'
    WHEN 'yearly'    THEN started_at + INTERVAL '365 days'
    ELSE started_at + INTERVAL '30 days'
  END,
  status = CASE
    WHEN (CASE billing_interval
            WHEN 'weekly'   THEN started_at + INTERVAL '7 days'
            WHEN 'biweekly' THEN started_at + INTERVAL '14 days'
            WHEN 'monthly'  THEN started_at + INTERVAL '30 days'
            WHEN 'yearly'   THEN started_at + INTERVAL '365 days'
            ELSE started_at + INTERVAL '30 days'
          END) > NOW() THEN 'active'
    ELSE 'expired'
  END
WHERE barbershop_id = '27fc60e6-99ee-45eb-9bb2-60526e66e71b';
```

Isso calcula a expiração com base no `started_at` + intervalo de cobrança. Assinaturas cujo `started_at` foi há mais de 30 dias ficarão como `expired` (comportamento correto), e as recentes ficam `active`.

> **Nota importante:** O plano SaaS da Barbearia Anjus (`barbershops.plan_status = 'active'`, `trial_ends_at = '2099-12-31'`) será **mantido como está** — apenas as assinaturas dos clientes da barbearia voltam ao normal.

---

## Arquivos a modificar

Nenhum arquivo de código precisa ser alterado — apenas a execução do SQL de dados acima.

## Sobre o login Super Admin

Vou verificar qual é o email do usuário com role `super_admin` para informar você.
