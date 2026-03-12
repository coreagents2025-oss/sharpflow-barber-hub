

## Análise do estado atual

### O problema central
`useBooking.ts` linhas 206-233: loop `for (const svc of servicesToBook)` cria **N registros** separados em `appointments`, um por serviço, cada um com `scheduled_at` sequencial. Para Corte (30min) + Barba (30min) às 09:00, o banco tem:
```
appointments:
 A1 | service_id: corte  | scheduled_at: 09:00 | status: scheduled
 A2 | service_id: barba  | scheduled_at: 09:30 | status: scheduled
```

### Impacto em cascata
- **PDV**: 2 cards separados para o mesmo cliente/sessão
- **Botão "Presente"**: precisa ser clicado 2x
- **Botão "Finalizar"**: abre 2 checkouts, um por serviço → 2 pagamentos separados no banco
- **PaymentModal**: recebe `service: { name, price }` singular → soma apenas 1 serviço
- **`handleOpenPaymentModal`** (PDV linha 1181-1191): passa `services: apt.services` que contém apenas o serviço daquele appointment específico

---

## Plano de implementação — 4 mudanças cirúrgicas

### 1. Migration SQL — nova tabela `appointment_services` + coluna `total_duration_minutes`

```sql
-- Tabela de junção: lista todos os serviços de um agendamento
CREATE TABLE public.appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  position integer NOT NULL DEFAULT 1,
  duration_minutes integer NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS: INSERT anônimo (para agendamentos públicos) + SELECT/UPDATE para staff
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert appointment_services" ON public.appointment_services FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can view appointment_services" ON public.appointment_services FOR SELECT USING (
  EXISTS (SELECT 1 FROM appointments a JOIN barbershop_staff bs ON bs.barbershop_id = a.barbershop_id WHERE a.id = appointment_id AND bs.user_id = auth.uid())
);

-- Coluna de duração total no appointment principal
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS total_duration_minutes integer;

-- Atualizar view pública para usar total_duration_minutes
CREATE OR REPLACE VIEW public.public_appointment_slots
WITH (security_invoker = on) AS
  SELECT a.id, a.barbershop_id, a.barber_id, a.service_id, a.scheduled_at, a.status,
    COALESCE(a.total_duration_minutes, s.duration_minutes, 30) AS duration_minutes
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.status NOT IN ('cancelled', 'no_show', 'completed');

-- Atualizar trigger de conflito para usar total_duration_minutes
CREATE OR REPLACE FUNCTION public.check_appointment_conflict() ...
  -- usar COALESCE(NEW.total_duration_minutes, service_duration) em vez de só service_duration
```

### 2. `src/hooks/useBooking.ts` — substituir loop por 1 appointment + batch insert

**Remover** linhas 206-233 (loop `for (const svc of servicesToBook)`).

**Substituir por:**
```typescript
// 1. Criar UM appointment com service_id principal e total_duration_minutes
const { data: appt, error: apptError } = await supabase
  .from('appointments')
  .insert({
    barbershop_id: barbershopId,
    service_id: data.serviceId,           // serviço principal (retrocompatibilidade)
    barber_id: data.barberId,
    lead_id: leadId,
    client_id: null,
    scheduled_at: scheduledAt.toISOString(),
    status: 'scheduled',
    total_duration_minutes: totalDurationMinutes,
  })
  .select('id')
  .single();

if (apptError) throw apptError;

// 2. Inserir TODOS os serviços em appointment_services (batch)
const { error: servicesError } = await supabase
  .from('appointment_services')
  .insert(
    servicesToBook.map((svc, i) => ({
      appointment_id: appt.id,
      service_id: svc.id,
      position: i + 1,
      duration_minutes: svc.duration_minutes,
      price: svc.price,
    }))
  );

if (servicesError) throw servicesError;
```

**Também precisará buscar `price` dos serviços** na query existente (linha 134): adicionar `price` ao select:
```typescript
const { data: servicesData } = await supabase
  .from('services')
  .select('id, duration_minutes, name, price')  // + price
  .in('id', allServiceIds);
```
E atualizar a interface `ServiceInfo` para incluir `price`.

### 3. `src/pages/PDV.tsx` — query + card + botão Finalizar com multi-serviço

**3a. Interface `Appointment`** (linha 27): adicionar campo `appointment_services`:
```typescript
interface Appointment {
  // ...campos existentes...
  total_duration_minutes?: number;
  appointment_services?: Array<{
    service_id: string;
    position: number;
    duration_minutes: number;
    price: number;
    services: { name: string };
  }>;
}
```

**3b. `fetchAppointmentsForDate`** (linha 164): adicionar join:
```typescript
.select(`
  id, scheduled_at, status, notes, unified_client_id,
  client_name, client_phone, client_type, barbershop_id, barber_id,
  services (name, duration_minutes, price),
  barbers (name),
  appointment_services (service_id, position, duration_minutes, price, services(name))
`)
```

**3c. Card no PDV** (linha 1125-1135): exibir lista de serviços quando `appointment_services` existir:
```typescript
// Nome dos serviços
const serviceNames = apt.appointment_services?.length > 0
  ? apt.appointment_services.sort((a,b) => a.position - b.position).map(s => s.services?.name).join(' + ')
  : apt.services?.name || 'Serviço';

// Preço total
const totalPrice = apt.appointment_services?.length > 0
  ? apt.appointment_services.reduce((sum, s) => sum + s.price, 0)
  : apt.services?.price || 0;
```

**3d. `handleOpenPaymentModal`** (linha 1181-1191): passar lista de serviços e preço total:
```typescript
onClick={() => handleOpenPaymentModal({
  id: apt.id,
  unified_client_id: apt.unified_client_id,
  client_type: apt.client_type,
  barbershop_id: apt.barbershop_id,
  services: apt.appointment_services?.length > 0
    ? apt.appointment_services.map(s => ({ name: s.services?.name || '', price: s.price }))
    : [{ name: apt.services?.name || 'Serviço', price: apt.services?.price || 0 }],
  totalPrice: totalPrice,
  client_name: apt.client_name,
})}
```

### 4. `src/components/PaymentModal.tsx` — suportar lista de serviços + preço total consolidado

**Interface `PaymentModalProps`**: atualizar `appointment.service` para `appointment.services[]` + `totalServicePrice`:
```typescript
appointment: {
  id: string;
  unified_client_id: string;
  client_type: 'lead' | 'client';
  barbershop_id: string;
  services: Array<{ name: string; price: number }>;  // era: service: { name, price }
  totalServicePrice: number;                         // preço somado de todos
  client: { full_name: string; };
};
```

**`totalAmount`** (linha 49): usar `totalServicePrice`:
```typescript
const totalAmount = appointment.totalServicePrice + Number(tip);
```

**Resumo visual** (linha 221-228): listar todos os serviços quando `services.length > 1`:
```typescript
{appointment.services.length === 1 ? (
  <div className="flex justify-between">
    <span>Serviço:</span>
    <span>{appointment.services[0].name}</span>
  </div>
) : (
  appointment.services.map((svc, i) => (
    <div key={i} className="flex justify-between text-sm">
      <span>{svc.name}</span>
      <span>R$ {svc.price.toFixed(2)}</span>
    </div>
  ))
)}
```

---

## Retrocompatibilidade garantida

- Agendamentos antigos (sem `appointment_services`) continuam funcionando: PDV usa fallback `apt.services.name` e `apt.services.price`
- O trigger de conflito usa `COALESCE(total_duration_minutes, service_duration)` — sem quebra para agendamentos existentes
- A view `public_appointment_slots` usa `COALESCE` — sem quebra no `BookingModal`

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| Migration SQL | Criar `appointment_services` + `total_duration_minutes` + atualizar view + trigger |
| `src/hooks/useBooking.ts` | Substituir loop por 1 appointment + batch insert; adicionar `price` ao select de serviços |
| `src/pages/PDV.tsx` | Interface + query com join + card exibindo todos serviços + `handleOpenPaymentModal` com preço total |
| `src/components/PaymentModal.tsx` | Interface `services[]` + `totalServicePrice` + resumo multi-serviço |

