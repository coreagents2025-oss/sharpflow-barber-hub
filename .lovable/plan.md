
## Situação Atual

A área de membro para clientes assinantes **existe na arquitetura** (tabelas `client_barbershop_links`, `client_subscriptions`, RLS com `client` role), mas **nunca foi implementada como páginas** no frontend. Não existe:
- Rota `/:slug/cliente` (login do cliente)
- Rota `/:slug/cliente/dashboard` (área logada)
- Página de registro com senha para clientes

### Fluxo Atual do Cliente
Hoje o cliente apenas preenche nome/telefone/email no `BookingModal` para agendar — sem criar conta nem senha. O banco tem tudo preparado para a área de membro, mas falta o frontend.

### Fluxo Correto a Construir

```text
[Catálogo Público /:slug]
       |
       v
[Botão "Área do Assinante" no rodapé ou catálogo]
       |
       v
[/:slug/cliente] — Login ou Cadastro com senha
  - Login: email + senha
  - Cadastro: nome + email + senha (cria conta com role 'client' 
    linkada à barbershop via barbershop_id)
       |
       v
[/:slug/cliente/dashboard] — Dashboard do Assinante
  - Plano ativo + créditos restantes
  - Próximo vencimento e valor
  - Histórico de pagamentos pendentes (PIX para pagar)
  - Histórico de agendamentos
```

---

## Arquivos a Criar/Modificar

### Novos arquivos
1. **`src/pages/ClientAuth.tsx`** — Página de login/cadastro do cliente em `/:slug/cliente`
   - Tab Login: email + senha
   - Tab Cadastro: nome + email + senha
   - No cadastro: chama `signUp(email, password, name, 'client')` passando `barbershop_id` no metadata
   - Após login: redireciona para `/:slug/cliente/dashboard`

2. **`src/pages/ClientDashboard.tsx`** — Área logada do assinante em `/:slug/cliente/dashboard`
   - Exibe nome/info da barbearia
   - Card: assinatura ativa (plano, créditos restantes, vencimento)
   - Lista: cobranças pendentes com QR Code PIX
   - Lista: últimos agendamentos
   - Botão "Agendar novo horário" → volta para `/:slug`
   - Botão Sair

3. **`src/hooks/useClientPortal.ts`** — Hook para buscar dados do cliente logado
   - Busca `client_barbershop_links` para validar acesso ao slug
   - Busca `client_subscriptions` ativas
   - Busca `subscription_payments` pendentes
   - Busca `appointments` recentes

### Modificações
4. **`src/App.tsx`** — Adicionar rotas:
   ```
   /:slug/cliente         → ClientAuth
   /:slug/cliente/dashboard → ProtectedClientRoute (só client role)
   ```

5. **`src/components/AuthRedirect.tsx`** — Ajustar redirecionamento: clientes com role `client` que acessam `/auth` ou `/` são redirecionados para `/:slug/cliente/dashboard` usando o link da `client_barbershop_links`

6. **`src/pages/PublicCatalog.tsx`** — Adicionar botão "Área do Assinante" no rodapé/header do catálogo público

### Componente auxiliar
7. **`src/components/ProtectedClientRoute.tsx`** — Protege a rota do dashboard do cliente, verificando role `client` e acesso ao slug correto

---

## Banco de Dados
Nenhuma migração necessária — as tabelas `client_barbershop_links`, `client_subscriptions`, `subscription_payments` e as RLS políticas para `client` role já estão em produção.

O trigger `handle_new_user` já detecta `role = 'client'` no metadata e faz o `INSERT INTO client_barbershop_links` automaticamente com o `barbershop_id` passado.

---

## Resumo

| Arquivo | Ação |
|---|---|
| `src/pages/ClientAuth.tsx` | Criar — login/cadastro do cliente |
| `src/pages/ClientDashboard.tsx` | Criar — dashboard do assinante |
| `src/hooks/useClientPortal.ts` | Criar — dados do cliente logado |
| `src/components/ProtectedClientRoute.tsx` | Criar — proteção de rota |
| `src/App.tsx` | Editar — novas rotas |
| `src/components/AuthRedirect.tsx` | Editar — redirect de cliente |
| `src/pages/PublicCatalog.tsx` | Editar — botão de acesso à área do assinante |
