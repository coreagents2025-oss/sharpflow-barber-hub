
## Diagnóstico confirmado — 2 bugs relacionados ao serviço de 180 minutos

### Bug #1 — CRÍTICO (UI): `getOccupiedSlotsForBarber` só lê `duration_minutes` da view, mas a view `public_appointment_slots` **não tem o campo `services`**

A view `public_appointment_slots` expõe:
```
id, barbershop_id, barber_id, service_id, scheduled_at, status
```

Ela **não inclui `duration_minutes`** do serviço. Em `fetchOccupiedTimes()`, o código faz:
```typescript
const { data: appointments } = await supabase
  .from('public_appointment_slots')
  .select('scheduled_at, service_id')  // ← service_id correto
```

Depois busca os `duration_minutes` via query separada aos `services`:
```typescript
const svcsMap = new Map((svcsData || []).map(s => [s.id, s.duration_minutes]));
const enrichedAppointments = (appointments || []).map(apt => ({
  ...apt,
  services: { duration_minutes: svcsMap.get(apt.service_id) || 30 }  // ← fallback 30
}));
```

**Ponto do bug:** quando `svcsData` retorna vazio (RLS ou erro silencioso), `svcsMap.get(apt.service_id)` retorna `undefined` → fallback de `|| 30` é usado → o agendamento de 180 min aparece como se ocupasse apenas **30 minutos** no calendário.

Confirmado: a tabela `services` tem uma política RLS `Users can view services from their barbershop or public` que exige `is_active = true`. Se o serviço de 180 min tem `is_active = false` por algum motivo, a query retorna vazio e o fallback 30 é aplicado.

**Cenário alternativo:** se `svcsData` retorna corretamente, o agendamento bloqueia `Math.ceil(180/30) = 6` slots. Mas o agendamento de 180 minutos é **um único registro no banco** com `service_id` de 180 min — e a view só retorna esse slot de início, não os 6 slots de 30 min. O `getOccupiedSlotsForBarber` calcula corretamente os 6 slots a bloquear, **mas só se `aptDuration` vier correto (não cair no fallback 30)**.

### Bug #2 — CRÍTICO (backend): `check_appointment_conflict` trigger usa duração do serviço agendado, mas o booking de 180 min cria **apenas 1 appointment** com `service_id = serviço_180min`

No `useBooking.ts`, quando só há um serviço (sem adicionais), `servicesToBook` tem 1 item com `duration_minutes = 180`. Um único INSERT é feito com `service_id = serviço_180min`. O trigger `check_appointment_conflict` busca `duration_minutes` do serviço para calcular o `new_end_time`. Isso está correto no banco.

**O problema visual real está no `fetchOccupiedTimes`:** o código busca as `services` na tabela `services` via `.in('id', svcIds)`, mas o serviço de 180 min pode ter `is_active` inconsistente ou a query está falhando silenciosamente. Quando falha, o fallback `|| 30` faz o front-end só bloquear 1 slot de 30 min na grade visual.

### Root Cause Definitivo

`getOccupiedSlotsForBarber` recebe o `aptDuration` de um campo `services.duration_minutes` que pode ser `undefined` → `|| 30`. 

**O fix precisa garantir que `aptDuration` sempre reflita a duração real.** A solução mais robusta é incluir `duration_minutes` **diretamente na view** `public_appointment_slots` via JOIN com `services`, eliminando a segunda query separada e o ponto de falha.

---

## Plano de correção — 2 mudanças precisas

### Fix 1 — Migration: adicionar `duration_minutes` na view `public_appointment_slots`

Recriar a view com JOIN na tabela `services`:

```sql
CREATE OR REPLACE VIEW public.public_appointment_slots
WITH (security_invoker = on) AS
  SELECT 
    a.id,
    a.barbershop_id,
    a.barber_id,
    a.service_id,
    a.scheduled_at,
    a.status,
    COALESCE(s.duration_minutes, 30) AS duration_minutes
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE a.status NOT IN ('cancelled', 'no_show', 'completed');
```

Isso elimina a necessidade da segunda query ao `services` e o ponto de falha `|| 30`.

### Fix 2 — `BookingModal.tsx`: usar `duration_minutes` da view diretamente

Em `fetchOccupiedTimes` (linhas 334-353), remover a segunda query aos `services` e usar o campo `duration_minutes` diretamente do resultado da view:

```typescript
// ANTES — query separada à tabela services:
const { data: appointments } = await supabase
  .from('public_appointment_slots')
  .select('scheduled_at, service_id')  // sem duration_minutes
  ...
const svcIds = [...new Set((appointments || []).map(a => a.service_id))];
const { data: svcsData } = ... // segunda query separada
const svcsMap = new Map(...)
const enrichedAppointments = appointments.map(apt => ({
  ...apt,
  services: { duration_minutes: svcsMap.get(apt.service_id) || 30 } // ponto de falha
}))

// DEPOIS — duration_minutes vem direto da view:
const { data: appointments } = await supabase
  .from('public_appointment_slots')
  .select('scheduled_at, service_id, duration_minutes')  // ← inclui duration_minutes
  ...
const enrichedAppointments = appointments.map(apt => ({
  ...apt,
  services: { duration_minutes: apt.duration_minutes || 30 }  // fallback seguro, valor real sempre presente
}))
```

Mesmo fix para o bloco `ANY_BARBER` (linhas 299-330).

---

## Arquivos a modificar

| Arquivo/Recurso | Mudança |
|---|---|
| Migration SQL | Recriar `public_appointment_slots` com JOIN em `services` para incluir `duration_minutes` |
| `src/components/BookingModal.tsx` | Remover segunda query aos `services`; usar `duration_minutes` da view diretamente (2 blocos: barber específico + ANY_BARBER) |

**Zero mudanças em dados. Zero mudança em RLS. A tabela `appointments` não é tocada.**

### Garantia de correção

Após o fix:
- Serviço de 180 min → view retorna `duration_minutes = 180`
- `getOccupiedSlotsForBarber` calcula `Math.ceil(180/30) = 6` slots bloqueados
- Slots 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 bloqueados para o usuário seguinte
- Slots antes do agendamento que causariam overflow também bloqueados
- O trigger `check_appointment_conflict` no banco permanece como barreira final
