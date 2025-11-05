# Documentação Atualizada do Banco de Dados - Sistema Multi-Tenant

## Visão Geral

Este é um sistema **multi-tenant** (múltiplas barbearias independentes) com as seguintes características:

- **Clientes Livres**: Podem agendar em qualquer barbearia
- **Auto-Registro SaaS**: Qualquer pessoa pode criar sua própria barbearia
- **Slugs e Domínios Personalizados**: Cada barbearia pode ter seu próprio slug (`app.com/minha-barbearia`) e domínio personalizado
- **Criação Automática**: Quando um admin se registra, uma barbearia "Minha Barbearia" é criada automaticamente

---

## Modelo de Dados

### Tabelas Principais

#### **barbershops**
Armazena informações básicas das barbearias.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| name | TEXT | Nome da barbearia |
| slug | TEXT | URL slug (ex: `minha-barbearia`) |
| custom_domain | TEXT | Domínio personalizado opcional |
| email | TEXT | Email de contato |
| phone | TEXT | Telefone |
| address | TEXT | Endereço |
| operating_hours | JSONB | Horários de funcionamento |
| logo_url | TEXT | URL do logotipo |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

**⚠️ Importante**: As colunas `whatsapp_settings` e `email_settings` foram movidas para a tabela `barbershop_credentials` por segurança.

---

#### **barbershop_staff** ⭐ NOVA
Vincula usuários (admins e barbeiros) às barbearias.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| user_id | UUID | FK para auth.users |
| barbershop_id | UUID | FK para barbershops |
| role | app_role | 'admin' ou 'barber' |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

**Constraint**: `UNIQUE(user_id, barbershop_id)` - um usuário pode estar em apenas uma barbearia por vez.

---

#### **barbershop_credentials** ⭐ NOVA
Armazena credenciais sensíveis de APIs (protegida por RLS).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| barbershop_id | UUID | PK/FK para barbershops |
| whatsapp_credentials | JSONB | Tokens WhatsApp API |
| email_credentials | JSONB | Credenciais email |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

**Estrutura JSON de whatsapp_credentials**:
```json
{
  "whatsapp_api_token": "string",
  "whatsapp_phone_number_id": "string",
  "evolution_api_url": "string",
  "evolution_api_key": "string",
  "evolution_instance_name": "string",
  "z_api_instance_id": "string",
  "z_api_token": "string"
}
```

---

#### **profiles**
Informações adicionais dos usuários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK/FK para auth.users |
| full_name | TEXT | Nome completo |
| phone | TEXT | Telefone |
| avatar_url | TEXT | URL do avatar |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

---

#### **user_roles**
Controle de permissões dos usuários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| user_id | UUID | FK para auth.users |
| role | app_role | 'admin', 'barber' ou 'client' |
| created_at | TIMESTAMPTZ | Data de criação |

**Enum app_role**: `'admin' | 'barber' | 'client'`

---

#### **barbers**
Informações específicas dos barbeiros (perfil profissional).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| user_id | UUID | FK para auth.users (opcional) |
| barbershop_id | UUID | FK para barbershops |
| name | TEXT | Nome do barbeiro |
| phone | TEXT | Telefone |
| specialty | TEXT | Especialidade |
| bio | TEXT | Biografia |
| photo_url | TEXT | URL da foto |
| rating | NUMERIC | Avaliação média |
| is_available | BOOLEAN | Disponível para agendamentos |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

**Nota**: A tabela `barbers` continua existindo para armazenar dados específicos do perfil profissional, mas o vínculo com a barbearia agora é gerenciado também pela tabela `barbershop_staff`.

---

#### **services**
Serviços oferecidos pelas barbearias.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| barbershop_id | UUID | FK para barbershops |
| category_id | UUID | FK para service_categories |
| name | TEXT | Nome do serviço |
| description | TEXT | Descrição |
| price | NUMERIC | Preço |
| duration_minutes | INTEGER | Duração em minutos |
| image_url | TEXT | URL da imagem |
| is_active | BOOLEAN | Ativo/Inativo |
| is_popular | BOOLEAN | Destacado como popular |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

---

#### **appointments**
Agendamentos dos clientes.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| client_id | UUID | FK para auth.users |
| barber_id | UUID | FK para barbers |
| service_id | UUID | FK para services |
| barbershop_id | UUID | FK para barbershops |
| scheduled_at | TIMESTAMPTZ | Data/hora agendada |
| status | TEXT | 'scheduled', 'completed', 'cancelled' |
| notes | TEXT | Observações |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

---

### Outras Tabelas

- **service_categories**: Categorias de serviços
- **catalog_settings**: Configurações de exibição do catálogo público
- **daily_schedules**: Horários disponíveis por dia
- **client_notes**: Anotações sobre clientes
- **reviews**: Avaliações de clientes
- **payments**: Registro de pagamentos
- **client_subscriptions**: Assinaturas/planos de clientes
- **subscription_plans**: Planos disponíveis

---

## Funções do Banco de Dados

### **get_user_barbershop(_user_id UUID)**
Retorna o ID da barbearia associada ao usuário.

```sql
CREATE OR REPLACE FUNCTION public.get_user_barbershop(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT barbershop_id
  FROM barbershop_staff
  WHERE user_id = _user_id
  LIMIT 1;
$$;
```

**Uso**: Usada pelas RLS policies para verificar permissões baseadas na barbearia.

---

### **has_role(_user_id UUID, _role app_role)**
Verifica se um usuário tem uma role específica.

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

---

### **handle_new_user()**
Trigger executado quando um novo usuário se registra.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_barbershop_id UUID;
  user_name TEXT;
BEGIN
  -- Extrair nome do usuário
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  
  -- Criar perfil
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, user_name);
  
  -- Auto-assign client role por padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  -- Se o usuário tiver metadata indicando que é admin, criar barbearia
  IF (NEW.raw_user_meta_data->>'role' = 'admin') THEN
    -- Criar nova barbearia "Minha Barbearia"
    INSERT INTO public.barbershops (
      name,
      slug,
      email,
      operating_hours
    )
    VALUES (
      'Minha Barbearia',
      'minha-barbearia-' || substring(NEW.id::text from 1 for 8),
      NEW.email,
      jsonb_build_object(
        'monday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'tuesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'wednesday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'thursday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'friday', jsonb_build_object('open', '09:00', 'close', '18:00'),
        'saturday', jsonb_build_object('open', '09:00', 'close', '14:00')
      )
    )
    RETURNING id INTO new_barbershop_id;
    
    -- Atualizar role para admin
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.id;
    
    -- Vincular usuário à barbearia em barbershop_staff
    INSERT INTO public.barbershop_staff (user_id, barbershop_id, role)
    VALUES (NEW.id, new_barbershop_id, 'admin');
    
    -- Criar credenciais vazias para a barbearia
    INSERT INTO public.barbershop_credentials (barbershop_id)
    VALUES (new_barbershop_id);
    
    -- Criar configurações de catálogo
    INSERT INTO public.catalog_settings (barbershop_id)
    VALUES (new_barbershop_id);
  END IF;
  
  RETURN NEW;
END;
$$;
```

**Trigger**:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Row Level Security (RLS)

### Princípios de Segurança

1. **Clientes**: Acessam apenas seus próprios dados
2. **Barbeiros**: Acessam dados da sua barbearia
3. **Admins**: Acesso total às suas barbearias

### Políticas Principais

#### **profiles**
```sql
-- Usuários veem apenas próprio perfil
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Staff (admin/barber) pode ver todos os perfis
CREATE POLICY "Staff can view customer profiles"
ON profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'barber')
);
```

#### **barbershops**
```sql
-- View pública para dados não-sensíveis
CREATE VIEW public_barbershops AS
SELECT 
  id, name, address, phone, logo_url, 
  slug, custom_domain, operating_hours, created_at
FROM barbershops;

-- Apenas staff pode ver dados completos
CREATE POLICY "Public can view basic barbershop info"
ON barbershops FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'barber') OR
  id IN (
    SELECT barbershop_id FROM appointments WHERE client_id = auth.uid()
  )
);
```

#### **barbershop_credentials** 🔒
```sql
-- Apenas admins da própria barbearia
CREATE POLICY "Only admins can manage credentials"
ON barbershop_credentials FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  barbershop_id IN (
    SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
  )
);
```

#### **appointments**
```sql
-- Clientes veem próprios agendamentos
CREATE POLICY "Clients can view own appointments"
ON appointments FOR SELECT
USING (auth.uid() = client_id);

-- Staff vê agendamentos da barbearia
CREATE POLICY "Staff can view barbershop appointments"
ON appointments FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  (has_role(auth.uid(), 'barber') AND barbershop_id = get_user_barbershop(auth.uid()))
);
```

---

## Fluxos de Trabalho

### 1. Registro de Novo Admin
1. Usuário preenche formulário com opção "Quero criar minha própria barbearia"
2. Frontend chama `signUp(email, password, fullName, 'admin')`
3. Trigger `handle_new_user()` detecta role='admin' nos metadados
4. Sistema cria automaticamente:
   - Perfil do usuário
   - Nova barbearia "Minha Barbearia"
   - Vínculo em `barbershop_staff`
   - Credenciais vazias em `barbershop_credentials`
   - Configurações de catálogo
5. Usuário é redirecionado para `/pdv` após confirmação de email

### 2. Registro de Novo Cliente
1. Usuário preenche formulário normalmente
2. Frontend chama `signUp(email, password, fullName, 'client')`
3. Trigger cria apenas perfil e role 'client'
4. Cliente pode agendar em qualquer barbearia

### 3. Criação de Novo Barbeiro
1. Admin acessa "Gerenciar Barbeiros"
2. Cria novo barbeiro fornecendo dados profissionais
3. Sistema cria registro em `barbers`
4. Opcionalmente, pode vincular a um usuário existente via `user_id`
5. Se vincular, adiciona entrada em `barbershop_staff` com role='barber'

### 4. Agendamento de Cliente
1. Cliente acessa catálogo público via slug ou domínio
2. Escolhe serviço e barbeiro
3. Sistema cria `appointment` com `barbershop_id`, `client_id`, `barber_id`, `service_id`
4. Cliente pode ver apenas seus próprios agendamentos
5. Staff da barbearia vê todos os agendamentos da barbearia

---

## Views Públicas

### **public_barbershops**
Dados públicos das barbearias acessíveis sem autenticação.

```sql
CREATE VIEW public_barbershops AS
SELECT 
  id,
  name,
  address,
  phone,
  logo_url,
  slug,
  custom_domain,
  operating_hours,
  created_at
FROM barbershops;
```

**Uso**: Listagem pública de barbearias, catálogo público.

---

## Índices de Performance

```sql
-- Appointments
CREATE INDEX idx_appointments_barbershop_date 
ON appointments(barbershop_id, scheduled_at);

CREATE INDEX idx_appointments_client 
ON appointments(client_id, scheduled_at DESC);

-- Barbers
CREATE INDEX idx_barbers_barbershop 
ON barbers(barbershop_id) WHERE is_available = true;

-- Services
CREATE INDEX idx_services_barbershop_active 
ON services(barbershop_id) WHERE is_active = true;

-- User roles
CREATE INDEX idx_user_roles_lookup 
ON user_roles(user_id, role);

-- Barbershop staff
CREATE INDEX idx_barbershop_staff_user 
ON barbershop_staff(user_id);

CREATE INDEX idx_barbershop_staff_barbershop 
ON barbershop_staff(barbershop_id);
```

---

## Triggers Automáticos

### Updated_at
Todas as tabelas principais têm trigger para atualizar `updated_at`:

```sql
CREATE TRIGGER update_<table>_updated_at 
  BEFORE UPDATE ON <table> 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Tabelas com trigger:
- barbershops
- barbers
- services
- appointments
- profiles
- catalog_settings
- daily_schedules
- client_subscriptions
- subscription_plans
- integrations
- barbershop_staff
- barbershop_credentials

---

## Mudanças Recentes (Migração)

### ✅ Adicionado
- Tabela `barbershop_staff` para gerenciar vínculos usuário-barbearia
- Tabela `barbershop_credentials` para armazenar credenciais de APIs de forma segura
- View `public_barbershops` para dados públicos
- Triggers de `updated_at` em todas as tabelas
- Trigger `on_auth_user_created` para criação automática de barbearias
- Função `get_user_barbershop()` atualizada para buscar em `barbershop_staff`

### 🔄 Modificado
- Políticas RLS de `profiles` (agora restrito)
- Políticas RLS de `barbershops` (agora usa view pública)
- Função `handle_new_user()` (agora cria barbearia automaticamente para admins)

### ⚠️ Deprecado (mas mantido por compatibilidade)
- As colunas `whatsapp_settings` e `email_settings` em `barbershops` agora armazenam apenas configurações não-sensíveis
- Credenciais foram movidas para `barbershop_credentials`

---

## Queries Comuns

### Listar barbeiros de uma barbearia
```sql
SELECT b.*, p.full_name, p.avatar_url
FROM barbers b
LEFT JOIN profiles p ON p.id = b.user_id
WHERE b.barbershop_id = '<id_barbearia>'
  AND b.is_available = true
ORDER BY b.rating DESC;
```

### Verificar staff de uma barbearia
```sql
SELECT 
  bs.role,
  p.full_name,
  p.phone,
  ur.role as user_role
FROM barbershop_staff bs
JOIN profiles p ON p.id = bs.user_id
JOIN user_roles ur ON ur.user_id = bs.user_id
WHERE bs.barbershop_id = '<id_barbearia>';
```

### Listar agendamentos futuros de um cliente
```sql
SELECT 
  a.*,
  s.name as service_name,
  b.name as barber_name,
  bb.name as barbershop_name
FROM appointments a
JOIN services s ON s.id = a.service_id
JOIN barbers b ON b.id = a.barber_id
JOIN barbershops bb ON bb.id = a.barbershop_id
WHERE a.client_id = auth.uid()
  AND a.scheduled_at > NOW()
ORDER BY a.scheduled_at ASC;
```

### Verificar integridade (usuários sem barbearia)
```sql
-- Admins/Barbers sem vínculo
SELECT 
  p.full_name,
  ur.role,
  p.created_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN barbershop_staff bs ON bs.user_id = p.id
WHERE ur.role IN ('admin', 'barber')
  AND bs.barbershop_id IS NULL;
```

---

## Próximos Passos Recomendados

1. **Implementar Sistema de Convites**: Permitir admins convidarem barbeiros
2. **Dashboard de Métricas**: Estatísticas de agendamentos, receita, etc.
3. **Sistema de Notificações**: Lembrete de agendamentos via WhatsApp/Email
4. **Integração de Pagamentos**: Stripe ou similar
5. **Sistema de Avaliações**: Ampliar `reviews` para incluir serviços
6. **Relatórios Financeiros**: Controle de receitas e comissões

---

**Última atualização**: Migração completa para sistema multi-tenant  
**Versão**: 2.0  
**Data**: Novembro 2025