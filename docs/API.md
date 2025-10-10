# Documentação da API

## Visão Geral

Este documento descreve as principais operações de banco de dados e Edge Functions disponíveis no sistema.

## Operações de Banco de Dados

### Appointments (Agendamentos)

#### Criar Agendamento
```typescript
const { data, error } = await supabase
  .from('appointments')
  .insert({
    barbershop_id: 'uuid',
    service_id: 'uuid',
    barber_id: 'uuid',
    client_id: 'uuid',
    scheduled_at: '2024-01-01T10:00:00Z',
    status: 'scheduled'
  });
```

#### Listar Agendamentos do Dia
```typescript
const today = new Date().toISOString().split('T')[0];

const { data, error } = await supabase
  .from('appointments')
  .select(`
    *,
    services (name, price, duration_minutes),
    barbers (name, photo_url),
    profiles (full_name, phone)
  `)
  .eq('barbershop_id', barbershopId)
  .gte('scheduled_at', `${today}T00:00:00`)
  .lte('scheduled_at', `${today}T23:59:59`)
  .order('scheduled_at', { ascending: true });
```

#### Atualizar Status do Agendamento
```typescript
const { data, error } = await supabase
  .from('appointments')
  .update({ status: 'completed' })
  .eq('id', appointmentId);
```

### Barbershops (Barbearias)

#### Buscar por Slug ou Domínio
```typescript
const { data, error } = await supabase
  .from('barbershops')
  .select('*')
  .or(`slug.eq.${slug},custom_domain.eq.${domain}`)
  .single();
```

#### Atualizar Dados da Barbearia
```typescript
const { data, error } = await supabase
  .from('barbershops')
  .update({
    name: 'Nome da Barbearia',
    address: 'Endereço',
    phone: '(11) 99999-9999',
    email: 'contato@barbearia.com'
  })
  .eq('id', barbershopId);
```

### Barbers (Barbeiros)

#### Listar Barbeiros Disponíveis
```typescript
const { data, error } = await supabase
  .from('barbers')
  .select('*')
  .eq('barbershop_id', barbershopId)
  .eq('is_available', true)
  .order('name');
```

#### Criar Barbeiro
```typescript
const { data, error } = await supabase
  .from('barbers')
  .insert({
    barbershop_id: 'uuid',
    name: 'Nome do Barbeiro',
    phone: '(11) 99999-9999',
    specialty: 'Cortes Clássicos',
    is_available: true
  });
```

### Services (Serviços)

#### Listar Serviços Ativos
```typescript
const { data, error } = await supabase
  .from('services')
  .select('*')
  .eq('barbershop_id', barbershopId)
  .eq('is_active', true)
  .order('name');
```

#### Criar Serviço
```typescript
const { data, error } = await supabase
  .from('services')
  .insert({
    barbershop_id: 'uuid',
    name: 'Corte de Cabelo',
    description: 'Corte tradicional masculino',
    price: 50.00,
    duration_minutes: 30,
    is_popular: false,
    is_active: true
  });
```

### Catalog Settings

#### Buscar Configurações do Catálogo
```typescript
const { data, error } = await supabase
  .from('catalog_settings')
  .select('*')
  .eq('barbershop_id', barbershopId)
  .single();
```

#### Salvar Configurações
```typescript
const { data, error } = await supabase
  .from('catalog_settings')
  .upsert({
    barbershop_id: 'uuid',
    theme_color: '#8B4513',
    logo_url: 'https://...',
    hero_image_url: 'https://...',
    show_popular_badge: true
  });
```

### Daily Schedules (Agenda Diária)

#### Salvar Configuração do Dia
```typescript
const { data, error } = await supabase
  .from('daily_schedules')
  .upsert({
    barbershop_id: 'uuid',
    date: '2024-01-01',
    working_hours_start: '09:00',
    working_hours_end: '19:00',
    barbers_working: ['uuid1', 'uuid2'],
    blocked_slots: ['10:00', '14:30']
  });
```

### Payments (Pagamentos)

#### Registrar Pagamento
```typescript
const { data, error } = await supabase
  .from('payments')
  .insert({
    barbershop_id: 'uuid',
    client_id: 'uuid',
    appointment_id: 'uuid',
    amount: 50.00,
    payment_method: 'card',
    status: 'completed'
  });
```

## Edge Functions

### send-booking-confirmation

Envia email de confirmação de agendamento.

**Endpoint:** `/functions/v1/send-booking-confirmation`

**Método:** POST

**Headers:**
```
Authorization: Bearer <SUPABASE_ANON_KEY>
Content-Type: application/json
```

**Body:**
```json
{
  "barbershop_id": "uuid",
  "client_email": "cliente@email.com",
  "client_name": "João Silva",
  "service_name": "Corte de Cabelo",
  "barber_name": "Pedro Barbeiro",
  "scheduled_at": "2024-01-01T10:00:00Z"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Email enviado com sucesso"
}
```

**Resposta de Erro:**
```json
{
  "error": "Descrição do erro"
}
```

## Funções Auxiliares do Banco de Dados

### has_role(user_id, role)

Verifica se um usuário tem uma role específica.

```sql
SELECT has_role(auth.uid(), 'admin');
```

**Retorna:** `boolean`

**Roles disponíveis:**
- `admin`
- `barber`
- `client`

### get_user_barbershop(user_id)

Retorna o ID da barbearia associada ao barbeiro.

```sql
SELECT get_user_barbershop(auth.uid());
```

**Retorna:** `uuid` ou `null`

## Políticas RLS

### Verificar Permissões

As políticas RLS são aplicadas automaticamente. Para verificar se um usuário tem acesso:

```typescript
// Exemplo: Listar agendamentos (RLS aplicado automaticamente)
const { data, error } = await supabase
  .from('appointments')
  .select('*');

// Se o usuário não tiver permissão, data será vazio
```

### Roles e Permissões

| Tabela | Admin | Barber | Client |
|--------|-------|--------|--------|
| appointments | CRUD | CRUD (própria barbearia) | R (próprios) + C |
| barbers | CRUD | R | R |
| barbershops | CRUD | RU (própria) | R |
| services | CRUD | CRUD (própria barbearia) | R (ativos) |
| catalog_settings | CRUD | CRUD (própria barbearia) | R |
| daily_schedules | CRUD | CRUD (própria barbearia) | - |
| payments | CRUD | C (própria barbearia) + R | R (próprios) |

**Legenda:**
- C: Create (Criar)
- R: Read (Ler)
- U: Update (Atualizar)
- D: Delete (Deletar)

## Tratamento de Erros

### Erros Comuns

#### Permissão Negada
```typescript
{
  code: '42501',
  message: 'new row violates row-level security policy'
}
```
**Solução:** Verificar se o usuário tem as permissões necessárias.

#### Registro Não Encontrado
```typescript
{
  code: 'PGRST116',
  message: 'The result contains 0 rows'
}
```
**Solução:** Usar `.maybeSingle()` em vez de `.single()` quando o resultado pode ser nulo.

#### Violação de Constraint
```typescript
{
  code: '23505',
  message: 'duplicate key value violates unique constraint'
}
```
**Solução:** Verificar se o registro já existe antes de inserir.

## Exemplos de Uso Completo

### Fluxo de Agendamento

```typescript
// 1. Cliente escolhe serviço
const { data: services } = await supabase
  .from('services')
  .select('*')
  .eq('barbershop_id', barbershopId)
  .eq('is_active', true);

// 2. Cliente escolhe barbeiro
const { data: barbers } = await supabase
  .from('barbers')
  .select('*')
  .eq('barbershop_id', barbershopId)
  .eq('is_available', true);

// 3. Verificar disponibilidade
const { data: conflicts } = await supabase
  .from('appointments')
  .select('id')
  .eq('barber_id', barberId)
  .eq('scheduled_at', scheduledAt)
  .neq('status', 'cancelled');

if (conflicts && conflicts.length > 0) {
  throw new Error('Horário não disponível');
}

// 4. Criar agendamento
const { data: appointment, error } = await supabase
  .from('appointments')
  .insert({
    barbershop_id: barbershopId,
    service_id: serviceId,
    barber_id: barberId,
    client_id: clientId,
    scheduled_at: scheduledAt,
    status: 'scheduled'
  })
  .select()
  .single();

// 5. Enviar confirmação por email
await supabase.functions.invoke('send-booking-confirmation', {
  body: {
    barbershop_id: barbershopId,
    client_email: clientEmail,
    client_name: clientName,
    service_name: serviceName,
    barber_name: barberName,
    scheduled_at: scheduledAt
  }
});
```

## Webhooks e Realtime

### Escutar Mudanças em Tempo Real

```typescript
const channel = supabase
  .channel('appointments-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'appointments',
      filter: `barbershop_id=eq.${barbershopId}`
    },
    (payload) => {
      console.log('Mudança detectada:', payload);
      // Atualizar UI
    }
  )
  .subscribe();

// Cleanup
return () => {
  supabase.removeChannel(channel);
};
```

---

Para mais informações, consulte a [documentação oficial do Supabase](https://supabase.com/docs).
