# 💈 Sistema de Gestão de Barbearia

Sistema completo para gestão de barbearias com catálogo público, agendamentos online, PDV (Ponto de Venda) e controle administrativo.

![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38bdf8)

## 📋 Índice

- [Documentação](#-documentação)
- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Banco de Dados](#-banco-de-dados)
- [Segurança e Permissões](#-segurança-e-permissões)
- [Deploy](#-deploy)
- [Como Usar](#-como-usar)

## 📚 Documentação

Este projeto possui documentação completa na pasta `docs/`:

- **[SECURITY.md](./docs/SECURITY.md)** - Documentação completa de segurança, níveis de acesso, RLS policies, e checklist de segurança
- **[DATABASE.md](./docs/DATABASE.md)** - Schema do banco de dados (versão anterior)
- **[DATABASE_UPDATED.md](./docs/DATABASE_UPDATED.md)** - Schema atualizado com multi-tenancy e roles
- **[API.md](./docs/API.md)** - Documentação das APIs e Edge Functions
- **[AUDIT_SECURITY.sql](./docs/AUDIT_SECURITY.sql)** - Script SQL para auditoria de segurança
- **[README.md](./docs/README.md)** - Guia completo da documentação do projeto

Para informações detalhadas sobre segurança, consulte a [documentação de segurança](./docs/README.md).

## ✨ Funcionalidades

### 🏪 Catálogo Público
- Página pública com serviços da barbearia
- Agendamento online sem necessidade de login
- Seleção de barbeiro, data e horário
- Criação automática de perfil do cliente
- Validação de conflitos de horário
- Domínio personalizado suportado

### 📅 Gestão de Agendamentos
- Visualização de agenda diária
- Status dos agendamentos (agendado, confirmado, concluído, cancelado)
- Configuração de horários e barbeiros disponíveis
- Bloqueio de horários específicos

### 💰 PDV (Ponto de Venda)
- Visualização de agendamentos do dia
- Status em tempo real dos barbeiros
- Registro de pagamentos
- Múltiplas formas de pagamento (dinheiro, cartão, PIX)

### 🎯 CRM (Gestão de Leads)
- Dashboard com métricas de leads (total, qualificados, convertidos, perdidos)
- Listagem de leads com filtros avançados
- Status de leads: novo, contatado, qualificado, convertido, perdido
- Painel de detalhes do lead com informações completas
- Integração com WhatsApp para comunicação direta
- Histórico de interações com o cliente

### 💬 Sistema de Mensagens
- Visualização de conversas com clientes
- Painel de informações do cliente
- Integração com WhatsApp para envio de mensagens
- Notificações de novas mensagens
- Histórico completo de mensagens

### 👥 Gestão de Barbeiros
- Cadastro de barbeiros
- Perfil com foto e especialidade
- Controle de disponibilidade
- Vinculação com usuários do sistema

### 🎨 Gestão de Serviços
- Cadastro de serviços
- Preços e duração
- Categorização
- Marcação de serviços populares
- Upload de imagens

### 📧 Marketing e Comunicação
- Campanhas de email personalizadas
- Templates de email reutilizáveis
- Envio de notificações por WhatsApp
- Confirmações automáticas de agendamento

### ⚙️ Configurações
- Personalização do catálogo (cores, logo, imagem hero)
- Configuração de domínio personalizado
- Dados da barbearia (nome, endereço, telefone, email)
- Horários de funcionamento
- Configuração de credenciais (WhatsApp, Email)

### 🔐 Sistema de Autenticação
- Login com email e senha
- Sistema de permissões por roles (admin, barbeiro, cliente)
- Proteção de rotas administrativas
- Auto-confirmação de email (configurável)

## 🛠 Tecnologias

### Frontend
- **React 18.3.1** - Biblioteca para interfaces
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **React Router DOM 6.30** - Roteamento
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **date-fns** - Manipulação de datas
- **Lucide React** - Ícones
- **Sonner** - Notificações toast

### Backend (Lovable Cloud/Supabase)
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados
- **Row Level Security (RLS)** - Segurança em nível de linha
- **Edge Functions** - Funções serverless
- **Supabase Auth** - Autenticação

### Ferramentas
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas
- **TanStack Query** - Gerenciamento de estado assíncrono

## 📋 Pré-requisitos

- Node.js 18+ ou Bun
- Conta no Lovable Cloud (ou Supabase)
- Git

## 🚀 Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd <nome-do-projeto>
```

2. Instale as dependências:
```bash
npm install
# ou
bun install
```

3. Configure as variáveis de ambiente (veja [Configuração](#-configuração))

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
bun dev
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

**Importante:** Estas variáveis são gerenciadas automaticamente pelo Lovable Cloud. Se estiver usando Supabase diretamente, obtenha-as no dashboard do Supabase.

### Configuração do Supabase

1. Execute as migrações do banco de dados (localizadas em `supabase/migrations/`)
2. Configure a autenticação:
   - Habilite o provedor de Email
   - Configure auto-confirmação de email (recomendado para desenvolvimento)
3. Configure as URLs de redirecionamento na seção Auth

### Primeiro Acesso

Após configurar o banco de dados, você precisará criar o primeiro usuário admin:

1. Registre-se pela interface `/auth`
2. No banco de dados, insira o role de admin manualmente:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('seu-user-id-aqui', 'admin');
```

3. Crie uma entrada na tabela `barbershops`
4. Vincule seu usuário à barbearia na tabela `barbers`

## 📁 Estrutura do Projeto

```
src/
├── assets/              # Imagens e assets estáticos
├── components/          # Componentes React reutilizáveis
│   ├── ui/             # Componentes shadcn/ui
│   ├── crm/            # Componentes do CRM
│   │   ├── LeadCard.tsx
│   │   ├── LeadDetailsPanel.tsx
│   │   ├── LeadMetrics.tsx
│   │   ├── LeadStatusBadge.tsx
│   │   ├── LeadsFilters.tsx
│   │   └── LeadsList.tsx
│   ├── messages/       # Componentes de mensagens
│   │   ├── ChatArea.tsx
│   │   ├── ClientInfoPanel.tsx
│   │   ├── ConversationList.tsx
│   │   └── MessageBubble.tsx
│   ├── BookingModal.tsx
│   ├── Navbar.tsx
│   ├── ServiceCard.tsx
│   ├── PaymentModal.tsx
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useAuth.tsx
│   ├── useBooking.ts
│   ├── useLeads.ts
│   ├── useSendMessage.ts
│   └── use-toast.ts
├── integrations/       # Integrações externas
│   └── supabase/
│       ├── client.ts   # Cliente Supabase (auto-gerado)
│       └── types.ts    # Tipos TypeScript gerados
├── lib/                # Utilitários
│   └── utils.ts
├── pages/              # Páginas/Rotas da aplicação
│   ├── Auth.tsx
│   ├── Dashboard.tsx
│   ├── PDV.tsx
│   ├── CRM.tsx
│   ├── Messages.tsx
│   ├── ScheduleManagement.tsx
│   ├── BarbersManagement.tsx
│   ├── ServicesManagement.tsx
│   ├── Settings.tsx
│   ├── Catalog.tsx
│   ├── PublicCatalog.tsx
│   └── ...
├── App.tsx             # Configuração de rotas
├── main.tsx            # Entry point
└── index.css           # Estilos globais e tokens de design

supabase/
├── config.toml         # Configuração do Supabase
├── functions/          # Edge Functions
│   ├── send-booking-confirmation/
│   ├── send-whatsapp-notification/
│   ├── receive-whatsapp-message/
│   ├── send-promotional-email/
│   └── webhook-dispatcher/
└── migrations/         # Migrações do banco de dados
```

## 🗄️ Banco de Dados

### Principais Tabelas

#### `barbershops`
Armazena informações das barbearias.

```sql
- id (uuid, PK)
- name (text)
- slug (text, unique)
- custom_domain (text, nullable)
- address (text)
- phone (text)
- email (text)
- logo_url (text)
- operating_hours (jsonb)
- email_settings (jsonb)
```

#### `barbers`
Cadastro de barbeiros.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- user_id (uuid, FK, nullable)
- name (text)
- phone (text)
- photo_url (text)
- specialty (text)
- bio (text)
- rating (numeric)
- is_available (boolean)
```

#### `services`
Serviços oferecidos pela barbearia.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- category_id (uuid, FK, nullable)
- name (text)
- description (text)
- price (numeric)
- duration_minutes (integer)
- image_url (text)
- is_popular (boolean)
- is_active (boolean)
```

#### `appointments`
Agendamentos realizados.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- service_id (uuid, FK)
- barber_id (uuid, FK)
- client_id (uuid, FK)
- scheduled_at (timestamp)
- status (text: scheduled, confirmed, completed, cancelled)
- notes (text)
```

#### `profiles`
Perfis de usuários (criado via trigger quando o usuário se registra).

```sql
- id (uuid, PK, FK para auth.users)
- full_name (text)
- phone (text)
- avatar_url (text)
```

#### `user_roles`
Sistema de permissões (admin, barber, client).

```sql
- id (uuid, PK)
- user_id (uuid, FK)
- role (app_role enum)
```

#### `catalog_settings`
Configurações visuais do catálogo público.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- theme_color (text)
- logo_url (text)
- hero_image_url (text)
- show_popular_badge (boolean)
```

#### `daily_schedules`
Configuração de horários diários.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- date (date)
- working_hours_start (time)
- working_hours_end (time)
- barbers_working (uuid[])
- blocked_slots (text[])
```

#### `payments`
Registro de pagamentos.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- client_id (uuid, FK)
- appointment_id (uuid, FK, nullable)
- amount (numeric)
- payment_method (text)
- status (text)
- transaction_id (text)
```

#### `leads`
Gestão de leads e potenciais clientes.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- full_name (text)
- phone (text)
- email (text, nullable)
- source (text: website, referral, social_media, walk_in, other)
- status (text: new, contacted, qualified, converted, lost)
- notes (text)
- last_contact (timestamp)
```

#### `conversations`
Conversas com clientes via WhatsApp.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- client_id (uuid, FK)
- client_phone (text)
- last_message (text)
- last_message_at (timestamp)
- unread_count (integer)
- status (text: active, archived)
```

#### `messages`
Mensagens trocadas com clientes.

```sql
- id (uuid, PK)
- conversation_id (uuid, FK)
- sender_type (text: barber, client)
- content (text)
- status (text: sent, delivered, read, failed)
- sent_at (timestamp)
```

#### `email_campaigns`
Campanhas de email marketing.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- name (text)
- subject (text)
- template_id (uuid, FK, nullable)
- status (text: draft, scheduled, sent, cancelled)
- scheduled_for (timestamp, nullable)
- sent_at (timestamp, nullable)
```

#### `email_templates`
Templates reutilizáveis para emails.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- name (text)
- subject (text)
- body (text)
- variables (jsonb)
```

#### `credentials`
Credenciais para integrações externas.

```sql
- id (uuid, PK)
- barbershop_id (uuid, FK)
- service_type (text: whatsapp, email, sms)
- identifier (text) # phone, email sender, etc. (NÃO armazenar tokens aqui)
- is_active (boolean)
```

**⚠️ Importante sobre credenciais:** Nunca armazene tokens de API no banco de dados. Use Supabase Secrets para armazenar tokens sensíveis.

### Funções do Banco de Dados

#### `has_role(user_id, role)`
Verifica se um usuário tem uma role específica. Usada nas políticas RLS.

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

#### `get_user_barbershop(user_id)`
Retorna o ID da barbearia do barbeiro.

```sql
CREATE OR REPLACE FUNCTION public.get_user_barbershop(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT barbershop_id
  FROM public.barbers
  WHERE user_id = _user_id
  LIMIT 1
$$;
```

#### `handle_new_user()`
Trigger que cria perfil e atribui role de cliente automaticamente.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;
```

#### `check_time_slot_available()`
Verifica disponibilidade de horário para agendamento (view segura).

```sql
CREATE OR REPLACE FUNCTION public.check_time_slot_available(
  _barbershop_id uuid,
  _barber_id uuid,
  _scheduled_at timestamp,
  _duration_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Implementação que verifica conflitos de horário sem expor dados sensíveis
$$;
```

### Edge Functions

O sistema utiliza Edge Functions (Supabase Functions) para funcionalidades serverless:

#### `send-booking-confirmation`
Envia confirmação de agendamento por email/WhatsApp após um booking ser criado.

#### `send-whatsapp-notification`
Envia mensagens via WhatsApp para clientes.

**Parâmetros:**
```typescript
{
  to: string,      // Número de telefone do destinatário
  message: string, // Conteúdo da mensagem
  barbershopId: string
}
```

#### `receive-whatsapp-message`
Webhook que recebe mensagens de WhatsApp e as armazena no banco de dados.

#### `send-promotional-email`
Envia campanhas de email para lista de clientes.

#### `webhook-dispatcher`
Dispatcher genérico para webhooks de serviços externos.

### Views Seguras

Para proteger dados sensíveis, o sistema utiliza views que expõem apenas informações públicas:

#### `public_profiles`
Expõe apenas `id`, `phone` e `full_name` dos perfis.

#### `public_barbers`
Expõe informações públicas dos barbeiros (sem `phone` e `user_id`).

#### `public_barbershops`
Expõe informações públicas das barbearias.

## 🔐 Segurança e Permissões

### Sistema de Roles

O sistema utiliza três níveis de permissão:

- **admin**: Acesso total ao sistema
- **barber**: Acesso às funcionalidades da barbearia (agenda, PDV, clientes)
- **client**: Acesso apenas para fazer agendamentos

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado com políticas específicas:

**Exemplo - appointments:**
```sql
-- Clientes podem criar seus próprios agendamentos
CREATE POLICY "Clients can create appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id);

-- Usuários podem ver seus próprios agendamentos ou da sua barbearia
CREATE POLICY "Users can view own appointments"
ON appointments FOR SELECT
TO authenticated
USING (
  auth.uid() = client_id 
  OR has_role(auth.uid(), 'admin') 
  OR (has_role(auth.uid(), 'barber') AND barbershop_id = get_user_barbershop(auth.uid()))
);
```

### Rotas Protegidas

O componente `ProtectedRoute` garante que apenas usuários autenticados acessem rotas administrativas:

```typescript
<Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/pdv" element={<PDV />} />
  // ... outras rotas protegidas
</Route>
```

## 🚀 Deploy

### Via Lovable

O deploy é automático ao conectar com Lovable Cloud:
1. Clique em "Publish" no editor
2. Seu app estará disponível em `<seu-projeto>.lovable.app`

### Deploy Manual (Netlify, Vercel, etc.)

1. Build do projeto:
```bash
npm run build
# ou
bun run build
```

2. A pasta `dist/` contém os arquivos estáticos

3. Configure as variáveis de ambiente no seu provedor de hospedagem

4. Configure redirecionamento para SPA:
```
/*    /index.html   200
```

### Configuração de Domínio Personalizado

1. No dashboard de configurações, adicione seu domínio em "Domínio & Emails"
2. Configure os seguintes registros DNS:
   - **A Record**: `@` → `185.158.133.1`
   - **A Record**: `www` → `185.158.133.1`
3. Aguarde propagação (até 48h)
4. SSL será provisionado automaticamente

## 📖 Como Usar

### Para Administradores

1. **Configuração Inicial:**
   - Acesse `/settings` para configurar dados da barbearia
   - Cadastre barbeiros em `/barbers`
   - Cadastre serviços em `/services`
   - Configure horários em `/schedule`
   - Configure credenciais de WhatsApp e Email em `/settings`

2. **Personalização do Catálogo:**
   - Acesse `/catalog`
   - Defina cores, logo e imagem hero
   - Configure opções de visualização
   - Copie o link público para compartilhar

3. **Gestão Diária:**
   - Use `/pdv` para visualizar agendamentos do dia
   - Registre pagamentos após atendimentos
   - Monitore status dos barbeiros

4. **CRM e Leads:**
   - Acesse `/crm` para visualizar leads
   - Filtre por status (novo, contatado, qualificado, convertido, perdido)
   - Visualize métricas e KPIs
   - Entre em contato via WhatsApp diretamente do painel
   - Adicione notas e acompanhe o histórico de cada lead

5. **Mensagens:**
   - Acesse `/messages` para ver conversas ativas
   - Responda mensagens de clientes
   - Visualize informações do cliente no painel lateral
   - Envie mensagens via WhatsApp com um clique

### Para Barbeiros

1. Acesse o sistema com suas credenciais
2. Visualize seus agendamentos em `/schedule`
3. Use `/pdv` para ver próximos clientes
4. Atualize seu perfil em `/barbers`
5. Responda mensagens de clientes em `/messages`

### Para Clientes

1. Acesse o catálogo público da barbearia (via link compartilhado)
2. Escolha o serviço desejado
3. Selecione barbeiro, data e horário
4. Preencha seus dados (nome, telefone, email)
5. Confirme o agendamento
6. Receba confirmação por WhatsApp ou Email

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint

# Type check
npm run type-check
```

## 🐛 Troubleshooting

### Problema: Não consigo fazer agendamento no dia atual
**Solução:** Verifique se a função `startOfDay` está sendo usada na comparação de datas no `BookingModal.tsx`.

### Problema: Erro "User already registered" ao fazer agendamento
**Solução:** Isso é esperado quando o email já existe. O sistema detecta e usa o perfil existente.

### Problema: RLS bloqueando operações
**Solução:** Verifique se o usuário tem as roles corretas na tabela `user_roles` e se está autenticado.

### Problema: Redirecionamento para localhost após login
**Solução:** Configure as URLs corretas nas configurações de Auth do Supabase.

### Problema: WhatsApp abrindo bloqueado (ERR_BLOCKED_BY_RESPONSE)
**Solução:** O sistema usa `wa.me` para links diretos do WhatsApp. Se o navegador bloquear, use o botão de copiar link (📋) e cole em outra aba. Alternativamente, verifique as configurações de pop-up do navegador.

### Problema: Edge Functions não estão sendo executadas
**Solução:** Verifique se as credenciais necessárias estão configuradas em Supabase Secrets. Edge Functions são deployadas automaticamente.

## 📝 Licença

Este projeto está sob a licença MIT.

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📧 Suporte

Para suporte e dúvidas, abra uma issue no GitHub.

---

Desenvolvido com ❤️ usando [Lovable](https://lovable.dev)
