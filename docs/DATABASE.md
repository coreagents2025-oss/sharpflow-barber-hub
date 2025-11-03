# Documentação do Banco de Dados

## Diagrama de Relacionamentos

```
┌─────────────────┐
│   barbershops   │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴────────────────────────────┐
    │                                 │
┌───▼─────┐                      ┌───▼──────┐
│ barbers │                      │ services │
└───┬─────┘                      └───┬──────┘
    │                                │
    │ N:1                            │ N:1
    │                                │
    └───────────┐         ┌──────────┘
                │         │
            ┌───▼─────────▼───┐
            │  appointments   │
            └───┬─────────────┘
                │
                │ N:1
                │
            ┌───▼─────┐
            │profiles │
            └─────────┘
```

## Tabelas Detalhadas

### barbershops

**Descrição:** Armazena informações das barbearias cadastradas no sistema.

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | gen_random_uuid() | Identificador único |
| name | text | Não | - | Nome da barbearia |
| slug | text | Não | '' | Slug para URL pública (único) |
| custom_domain | text | Sim | null | Domínio personalizado |
| address | text | Sim | null | Endereço completo |
| phone | text | Sim | null | Telefone de contato |
| email | text | Sim | null | Email de contato |
| logo_url | text | Sim | null | URL do logo |
| operating_hours | jsonb | Sim | null | Horários de funcionamento |
| email_settings | jsonb | Sim | {} | Configurações de email |
| whatsapp_settings | jsonb | Sim | {} | Configurações de notificações WhatsApp |
| created_at | timestamptz | Não | now() | Data de criação |
| updated_at | timestamptz | Não | now() | Data de atualização |

**Índices:**
- PRIMARY KEY: id
- UNIQUE: slug
- UNIQUE: custom_domain (quando não null)

**Exemplo de operating_hours:**
```json
{
  "monday": { "open": "09:00", "close": "19:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "19:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "19:00", "closed": false },
  "thursday": { "open": "09:00", "close": "19:00", "closed": false },
  "friday": { "open": "09:00", "close": "19:00", "closed": false },
  "saturday": { "open": "09:00", "close": "15:00", "closed": false },
  "sunday": { "open": "09:00", "close": "13:00", "closed": true }
}
```

**Exemplo de email_settings:**
```json
{
  "from_email": "contato@barbearia.com",
  "from_name": "Barbearia Premium",
  "notifications_enabled": true
}
```

**Exemplo de whatsapp_settings:**
```json
{
  "enabled": true,
  "phone_number": "5511999999999",
  "api_provider": "official",
  "message_template": "Olá {{client_name}}! Seu agendamento foi confirmado para {{date}} às {{time}}. Serviço: {{service_name}} com {{barber_name}}. Aguardamos você!",
  "daily_offer_message": "🔥 Oferta do dia! Corte + Barba por apenas R$ 50,00. Válido até hoje!",
  "whatsapp_api_token": "EAAxxxxxxxxxxxxx",
  "whatsapp_phone_number_id": "123456789012345",
  "evolution_api_url": "https://sua-api.com",
  "evolution_api_key": "sua-api-key",
  "evolution_instance_name": "minha-instancia",
  "z_api_instance_id": "SUA_INSTANCIA",
  "z_api_token": "SEU_TOKEN"
}
```

**Provedores de API WhatsApp suportados:**
- `official`: WhatsApp Business API (Oficial) - Requer `whatsapp_api_token` e `whatsapp_phone_number_id`
- `evolution_api`: Evolution API (Não oficial) - Requer `evolution_api_url`, `evolution_api_key` e `evolution_instance_name`
- `z_api`: Z-API (Não oficial) - Requer `z_api_instance_id` e `z_api_token`

**Variáveis disponíveis no template de mensagem:**
- `{{client_name}}`: Nome do cliente
- `{{date}}`: Data formatada do agendamento
- `{{time}}`: Hora formatada do agendamento
- `{{service_name}}`: Nome do serviço
- `{{barber_name}}`: Nome do barbeiro

### barbers

**Descrição:** Cadastro dos barbeiros que trabalham nas barbearias.

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | gen_random_uuid() | Identificador único |
| barbershop_id | uuid | Não | - | FK para barbershops |
| user_id | uuid | Sim | null | FK para auth.users (login) |
| name | text | Sim | null | Nome do barbeiro |
| phone | text | Sim | null | Telefone |
| photo_url | text | Sim | null | URL da foto de perfil |
| specialty | text | Sim | null | Especialidade |
| bio | text | Sim | null | Biografia/descrição |
| rating | numeric | Sim | 0 | Avaliação média |
| is_available | boolean | Sim | true | Se está disponível para agendamentos |
| created_at | timestamptz | Não | now() | Data de criação |
| updated_at | timestamptz | Não | now() | Data de atualização |

**Índices:**
- PRIMARY KEY: id
- FK: barbershop_id → barbershops(id)
- FK: user_id → auth.users(id)

### services

**Descrição:** Serviços oferecidos pelas barbearias.

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | gen_random_uuid() | Identificador único |
| barbershop_id | uuid | Não | - | FK para barbershops |
| category_id | uuid | Sim | null | FK para service_categories |
| name | text | Não | - | Nome do serviço |
| description | text | Sim | null | Descrição detalhada |
| price | numeric | Não | - | Preço do serviço |
| duration_minutes | integer | Não | - | Duração em minutos |
| image_url | text | Sim | null | URL da imagem |
| is_popular | boolean | Sim | false | Se é um serviço popular |
| is_active | boolean | Sim | true | Se está ativo no catálogo |
| created_at | timestamptz | Não | now() | Data de criação |
| updated_at | timestamptz | Não | now() | Data de atualização |

**Índices:**
- PRIMARY KEY: id
- FK: barbershop_id → barbershops(id)
- FK: category_id → service_categories(id)

### appointments

**Descrição:** Agendamentos realizados pelos clientes.

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | gen_random_uuid() | Identificador único |
| barbershop_id | uuid | Não | - | FK para barbershops |
| service_id | uuid | Não | - | FK para services |
| barber_id | uuid | Não | - | FK para barbers |
| client_id | uuid | Não | - | FK para profiles |
| scheduled_at | timestamptz | Não | - | Data e hora do agendamento |
| status | text | Não | 'scheduled' | Status do agendamento |
| notes | text | Sim | null | Observações |
| created_at | timestamptz | Não | now() | Data de criação |
| updated_at | timestamptz | Não | now() | Data de atualização |

**Status possíveis:**
- `scheduled`: Agendado
- `confirmed`: Confirmado
- `completed`: Concluído
- `cancelled`: Cancelado

**Índices:**
- PRIMARY KEY: id
- FK: barbershop_id → barbershops(id)
- FK: service_id → services(id)
- FK: barber_id → barbers(id)
- FK: client_id → profiles(id)
- INDEX: scheduled_at
- INDEX: status

### profiles

**Descrição:** Perfis de usuários do sistema (criado automaticamente via trigger).

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | - | FK para auth.users |
| full_name | text | Sim | null | Nome completo |
| phone | text | Sim | null | Telefone |
| avatar_url | text | Sim | null | URL do avatar |
| created_at | timestamptz | Não | now() | Data de criação |
| updated_at | timestamptz | Não | now() | Data de atualização |

**Índices:**
- PRIMARY KEY: id
- FK: id → auth.users(id) ON DELETE CASCADE

### user_roles

**Descrição:** Sistema de permissões baseado em roles.

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | gen_random_uuid() | Identificador único |
| user_id | uuid | Não | - | FK para auth.users |
| role | app_role | Não | - | Role do usuário |
| created_at | timestamptz | Não | now() | Data de criação |

**Tipo app_role (ENUM):**
- `admin`: Administrador
- `barber`: Barbeiro
- `client`: Cliente

**Índices:**
- PRIMARY KEY: id
- FK: user_id → auth.users(id) ON DELETE CASCADE
- UNIQUE: (user_id, role)

### catalog_settings

**Descrição:** Configurações visuais do catálogo público.

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | gen_random_uuid() | Identificador único |
| barbershop_id | uuid | Não | - | FK para barbershops |
| theme_color | text | Sim | '#8B4513' | Cor principal do tema |
| logo_url | text | Sim | null | URL do logo do catálogo |
| hero_image_url | text | Sim | null | URL da imagem hero |
| show_popular_badge | boolean | Sim | true | Mostrar badge em populares |
| created_at | timestamptz | Não | now() | Data de criação |
| updated_at | timestamptz | Não | now() | Data de atualização |

**Índices:**
- PRIMARY KEY: id
- FK: barbershop_id → barbershops(id)

### daily_schedules

**Descrição:** Configuração de horários disponíveis por dia.

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | gen_random_uuid() | Identificador único |
| barbershop_id | uuid | Não | - | FK para barbershops |
| date | date | Não | - | Data da agenda |
| working_hours_start | time | Não | - | Horário de início |
| working_hours_end | time | Não | - | Horário de término |
| barbers_working | uuid[] | Não | {} | Array de IDs dos barbeiros |
| blocked_slots | text[] | Não | {} | Array de horários bloqueados |
| created_at | timestamptz | Sim | now() | Data de criação |
| updated_at | timestamptz | Sim | now() | Data de atualização |

**Índices:**
- PRIMARY KEY: id
- FK: barbershop_id → barbershops(id)
- INDEX: (barbershop_id, date)

### payments

**Descrição:** Registro de pagamentos realizados.

| Coluna | Tipo | Nulo | Default | Descrição |
|--------|------|------|---------|-----------|
| id | uuid | Não | gen_random_uuid() | Identificador único |
| barbershop_id | uuid | Não | - | FK para barbershops |
| client_id | uuid | Não | - | FK para profiles |
| appointment_id | uuid | Sim | null | FK para appointments |
| amount | numeric | Não | - | Valor pago |
| payment_method | text | Não | - | Forma de pagamento |
| status | text | Não | 'pending' | Status do pagamento |
| transaction_id | text | Sim | null | ID da transação |
| created_at | timestamptz | Não | now() | Data de criação |

**Payment Methods:**
- `cash`: Dinheiro
- `credit_card`: Cartão de Crédito
- `debit_card`: Cartão de Débito
- `pix`: PIX

**Status possíveis:**
- `pending`: Pendente
- `completed`: Concluído
- `failed`: Falhou
- `refunded`: Reembolsado

**Índices:**
- PRIMARY KEY: id
- FK: barbershop_id → barbershops(id)
- FK: client_id → profiles(id)
- FK: appointment_id → appointments(id)

## Triggers

### handle_new_user

**Gatilho:** AFTER INSERT ON auth.users

**Função:** Cria automaticamente um perfil na tabela `profiles` e atribui a role `client` ao novo usuário.

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### update_updated_at_column

**Gatilho:** BEFORE UPDATE em várias tabelas

**Função:** Atualiza automaticamente o campo `updated_at` sempre que um registro é modificado.

```sql
CREATE TRIGGER update_<table>_updated_at
  BEFORE UPDATE ON <table>
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

## Funções Auxiliares

### has_role(_user_id uuid, _role app_role) → boolean

Verifica se um usuário possui uma role específica.

```sql
-- Exemplo de uso
SELECT has_role(auth.uid(), 'admin');

-- Resultado: true ou false
```

### get_user_barbershop(_user_id uuid) → uuid

Retorna o ID da barbearia associada a um barbeiro.

```sql
-- Exemplo de uso
SELECT get_user_barbershop(auth.uid());

-- Resultado: uuid da barbearia ou null
```

## Políticas de Segurança (RLS)

Todas as tabelas possuem Row Level Security (RLS) habilitado. As políticas garantem que:

- **Admins** têm acesso total
- **Barbeiros** acessam apenas dados da sua barbearia
- **Clientes** acessam apenas seus próprios dados

### Exemplo de Política

```sql
-- Política para appointments
CREATE POLICY "Users can view own appointments"
ON appointments FOR SELECT
TO authenticated
USING (
  auth.uid() = client_id 
  OR has_role(auth.uid(), 'admin') 
  OR (has_role(auth.uid(), 'barber') AND barbershop_id = get_user_barbershop(auth.uid()))
);
```

## Queries Comuns

### Dashboard: Estatísticas do Dia

```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  SUM(s.price) FILTER (WHERE a.status = 'completed') as revenue
FROM appointments a
JOIN services s ON s.id = a.service_id
WHERE a.barbershop_id = $1
  AND DATE(a.scheduled_at) = CURRENT_DATE;
```

### Agenda: Próximos Agendamentos

```sql
SELECT 
  a.*,
  s.name as service_name,
  s.duration_minutes,
  b.name as barber_name,
  p.full_name as client_name,
  p.phone as client_phone
FROM appointments a
JOIN services s ON s.id = a.service_id
JOIN barbers b ON b.id = a.barber_id
JOIN profiles p ON p.id = a.client_id
WHERE a.barbershop_id = $1
  AND a.scheduled_at >= NOW()
  AND a.status IN ('scheduled', 'confirmed')
ORDER BY a.scheduled_at ASC
LIMIT 10;
```

### Relatório: Top Serviços

```sql
SELECT 
  s.name,
  COUNT(*) as total_appointments,
  SUM(s.price) as total_revenue
FROM appointments a
JOIN services s ON s.id = a.service_id
WHERE a.barbershop_id = $1
  AND a.status = 'completed'
  AND a.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.id, s.name
ORDER BY total_appointments DESC
LIMIT 5;
```

## Manutenção

### Backup

Recomenda-se fazer backup diário do banco de dados:

```bash
# Supabase CLI
supabase db dump --file backup.sql

# Ou via dashboard do Supabase
# Projects → Database → Backups
```

### Limpeza de Dados Antigos

```sql
-- Remover agendamentos cancelados antigos (>90 dias)
DELETE FROM appointments
WHERE status = 'cancelled'
  AND created_at < NOW() - INTERVAL '90 days';

-- Remover logs antigos (se aplicável)
DELETE FROM audit_logs
WHERE created_at < NOW() - INTERVAL '180 days';
```

---

Para mais informações sobre PostgreSQL e Supabase, consulte:
- [Documentação PostgreSQL](https://www.postgresql.org/docs/)
- [Documentação Supabase](https://supabase.com/docs)
