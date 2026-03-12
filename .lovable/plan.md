
## Diagnóstico — por que o agendamento manual falha

Encontrei **dois problemas distintos** que bloqueiam o agendamento manual no CRM:

---

### Problema 1 — Validação de data passada em `useBooking.ts` (linha 103-107)

```typescript
const now = new Date();
if (scheduledAt <= now) {
  toast.error('Não é possível agendar para datas passadas.');
  return false;
}
```

O `scheduledAt` é construído com `new Date(data.date)` + `setHours(horas, minutos)` usando **hora local do browser**. Mas em seguida, ao comparar com `now`, pequenas diferenças de milissegundos ou o fuso do servidor podem tornar um horário "futuro" igual ou menor que `now`. Além disso, o agendamento manual deve ser **permitido para horários passados** (o barbeiro pode registrar atendimentos já realizados). Esta validação não faz sentido para o fluxo do CRM.

**Fix**: Relaxar a validação para que bloqueie apenas datas (dias) passados, não horas do dia atual. Ou, para o agendamento manual do staff, remover completamente essa validação pois não se aplica ao contexto administrativo.

A solução ideal: o `useBooking` deve aceitar um parâmetro `isStaffBooking` — quando `true`, pula a validação de data passada (staff pode criar agendamentos em qualquer hora do dia atual ou dias futuros).

---

### Problema 2 — View `appointments_with_client` não inclui `total_duration_minutes`

A view (criada na migration `20251106135336`) seleciona colunas fixas de `appointments` e **não inclui `total_duration_minutes`**. Isso significa que o PDV ao buscar via `appointments_with_client` não consegue passar `total_duration_minutes` para a verificação de ocupação de slots em `fetchOccupiedTimes` do `CreateAppointmentDialog`.

**Fix**: Atualizar a view para incluir `a.total_duration_minutes`.

---

### Problema 3 — `fetchOccupiedTimes` no `CreateAppointmentDialog` usa `services.duration_minutes` do appointment antigo, ignorando `total_duration_minutes`

No `CreateAppointmentDialog.tsx` linha 220:
```typescript
const duration = (apt.services as any)?.duration_minutes || 30;
```
Não leva em conta `apt.total_duration_minutes`, então agendamentos consolidados com múltiplos serviços são tratados como se tivessem a duração apenas do serviço principal.

**Fix**: Usar `apt.total_duration_minutes || apt.services?.duration_minutes || 30`.

---

## Plano de implementação — 3 arquivos + 1 migration

### 1. Migration SQL — atualizar `appointments_with_client` para incluir `total_duration_minutes`

```sql
CREATE OR REPLACE VIEW public.appointments_with_client AS
SELECT 
  a.id,
  a.barbershop_id,
  a.service_id,
  a.barber_id,
  a.scheduled_at,
  a.status,
  a.notes,
  a.created_at,
  a.updated_at,
  a.lead_id,
  a.client_id,
  a.total_duration_minutes,   -- NOVO
  COALESCE(l.id, p.id) as unified_client_id,
  COALESCE(l.full_name, p.full_name) as client_name,
  COALESCE(l.phone, p.phone) as client_phone,
  COALESCE(l.email, '') as client_email,
  CASE 
    WHEN a.lead_id IS NOT NULL THEN 'lead'
    WHEN a.client_id IS NOT NULL THEN 'client'
  END as client_type,
  l.status as lead_status,
  l.source as lead_source
FROM appointments a
LEFT JOIN leads l ON a.lead_id = l.id
LEFT JOIN profiles p ON a.client_id = p.id;
```

### 2. `src/hooks/useBooking.ts` — aceitar `isStaffBooking` e corrigir validação de data

Adicionar parâmetro opcional `isStaffBooking?: boolean` e ajustar a validação:

```typescript
// ANTES (bloqueia qualquer hora <= agora):
const now = new Date();
if (scheduledAt <= now) {
  toast.error('Não é possível agendar para datas passadas.');
  return false;
}

// DEPOIS (staff pode agendar hoje; bloqueia só datas de ontem ou anterior):
const now = new Date();
const todayMidnight = new Date();
todayMidnight.setHours(0, 0, 0, 0);
if (!isStaffBooking && scheduledAt <= now) {
  toast.error('Não é possível agendar para datas passadas.');
  return false;
}
if (isStaffBooking && scheduledAt < todayMidnight) {
  toast.error('Não é possível agendar para dias anteriores.');
  return false;
}
```

O hook receberá `isStaffBooking` como segundo parâmetro: `useBooking(barbershopId, isStaffBooking?)`.

### 3. `src/components/crm/CreateAppointmentDialog.tsx` — passar `isStaffBooking: true`

Linha 60:
```typescript
// ANTES:
const { createBooking, isSubmitting } = useBooking(barbershopId);

// DEPOIS:
const { createBooking, isSubmitting } = useBooking(barbershopId, true);
```

### 4. `src/components/crm/CreateAppointmentDialog.tsx` — corrigir `fetchOccupiedTimes` para usar `total_duration_minutes`

Linha 220:
```typescript
// ANTES:
const duration = (apt.services as any)?.duration_minutes || 30;

// DEPOIS:
const duration = (apt as any).total_duration_minutes || (apt.services as any)?.duration_minutes || 30;
```

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar `total_duration_minutes` na view `appointments_with_client` |
| `src/hooks/useBooking.ts` | Aceitar `isStaffBooking` como 2° parâmetro; ajustar validação de data |
| `src/components/crm/CreateAppointmentDialog.tsx` | Passar `isStaffBooking: true`; corrigir `fetchOccupiedTimes` |

O `BookingModal.tsx` (catálogo público) não muda — continua validando datas passadas normalmente para clientes.
