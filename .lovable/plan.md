

## Plano: Painel Super Admin (Gestao da Plataforma)

### Problema

Hoje o sistema tem apenas roles de **barbershop** (admin, barber, client). Nao existe um usuario de **plataforma** capaz de:
- Ver e gerenciar todas as barbearias cadastradas
- Metrificar a landing page (visitas, conversoes, cadastros)
- Dar suporte a clientes e donos de barbearia
- Ver dados agregados de toda a plataforma

### Solucao

Criar um role `super_admin` e um painel administrativo completo separado do painel de barbearia.

---

### 1. Banco de Dados

**Adicionar valor ao enum `app_role`:**
```text
ALTER TYPE app_role ADD VALUE 'super_admin';
```

**Criar tabela `platform_metrics` para armazenar metricas da landing page:**
- page_views, signups, bookings por dia
- Agregacoes automaticas via triggers ou cron

**Criar tabela `support_tickets` (opcional - fase 2):**
- Para gerenciar tickets de suporte dos clientes

**Criar funcao `is_super_admin()`:**
- Security definer function para verificar se o usuario tem role `super_admin`
- Usada nas RLS policies das novas tabelas e para acesso cross-barbershop

**RLS Policies:**
- Super admins podem SELECT em todas as tabelas de barbearias (barbershops, appointments, payments, leads, etc.)
- Super admins NAO podem modificar dados das barbearias (apenas visualizar para suporte)

### 2. Paginas do Painel Super Admin

**`/super-admin` - Dashboard da Plataforma:**
- Total de barbearias cadastradas
- Total de usuarios (admins + barbers + clients)
- Agendamentos totais (hoje / semana / mes)
- Faturamento total da plataforma
- Graficos de crescimento (novos cadastros por semana)

**`/super-admin/barbershops` - Gestao de Barbearias:**
- Lista de todas as barbearias com busca e filtros
- Status (ativa, inativa, qtd barbeiros, qtd servicos)
- Clicar em uma barbearia abre detalhes (dados, barbeiros, servicos, metricas)

**`/super-admin/users` - Gestao de Usuarios:**
- Lista de todos os usuarios da plataforma
- Filtro por role (admin, barber, client)
- Acoes: ver detalhes, desativar conta

**`/super-admin/metrics` - Metricas da Landing Page:**
- Page views da pagina principal
- Taxa de conversao (visita -> cadastro)
- Servicos mais populares cross-barbearia
- Graficos com Recharts (ja instalado)

**`/super-admin/support` - Suporte (fase 2):**
- Lista de tickets / problemas reportados
- Chat com donos de barbearia

### 3. Componentes

**`SuperAdminLayout`** - Layout com sidebar propria (diferente da Navbar de barbearia)
**`SuperAdminSidebar`** - Menu lateral com: Dashboard, Barbearias, Usuarios, Metricas, Suporte
**`PlatformMetricsCards`** - Cards de metricas agregadas
**`BarbershopsList`** - Tabela de barbearias com acoes
**`UsersList`** - Tabela de usuarios com filtros

### 4. Autenticacao e Protecao

- Novo componente `SuperAdminRoute` que verifica `userRole === 'super_admin'`
- `useAuth` ja suporta leitura de roles - apenas precisa reconhecer `super_admin`
- `AuthRedirect` redireciona super_admin para `/super-admin` apos login
- Navbar nao aparece no painel super admin (layout proprio)

### 5. Criacao do Primeiro Super Admin

- Criar o usuario super admin manualmente via SQL (inserir na tabela `user_roles` com role `super_admin`)
- NAO expor cadastro de super admin na UI publica

---

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/SuperAdmin/Dashboard.tsx` | Dashboard da plataforma |
| `src/pages/SuperAdmin/Barbershops.tsx` | Gestao de barbearias |
| `src/pages/SuperAdmin/Users.tsx` | Gestao de usuarios |
| `src/pages/SuperAdmin/Metrics.tsx` | Metricas da landing |
| `src/components/super-admin/SuperAdminLayout.tsx` | Layout com sidebar |
| `src/components/super-admin/SuperAdminSidebar.tsx` | Menu lateral |
| `src/components/super-admin/PlatformMetricsCards.tsx` | Cards de metricas |
| `src/components/super-admin/BarbershopsList.tsx` | Tabela de barbearias |
| `src/components/super-admin/UsersList.tsx` | Tabela de usuarios |
| `src/components/SuperAdminRoute.tsx` | Protecao de rota |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/App.tsx` | Adicionar rotas `/super-admin/*` |
| `src/hooks/useAuth.tsx` | Reconhecer `super_admin` no redirect |
| `src/components/AuthRedirect.tsx` | Redirecionar super_admin para `/super-admin` |

### Migracoes SQL

1. `ALTER TYPE app_role ADD VALUE 'super_admin'`
2. Funcao `is_super_admin()` security definer
3. Policies de SELECT cross-barbershop para super_admin nas tabelas: barbershops, appointments, payments, leads, profiles, barbers, services
4. INSERT do primeiro usuario super admin

---

### Fases de Entrega

**Fase 1 (este plano):**
- Enum + funcao + policies
- Dashboard com metricas reais do banco
- Gestao de barbearias (listagem + detalhes)
- Gestao de usuarios (listagem)
- Protecao de rotas
- Criacao do super admin

**Fase 2 (futuro):**
- Sistema de suporte / tickets
- Analytics avancados da landing page (requer integracao com tracking)
- Acoes administrativas (suspender barbearia, resetar senha)

