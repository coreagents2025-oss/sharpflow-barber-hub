
## Problemas encontrados no sistema de agendamento

### Problema 1 — CRÍTICO: `BookingModal` usa fallback errado (7h–22h)
**Arquivo**: `src/components/BookingModal.tsx`, linhas 138-150

Quando **não existe `daily_schedule`** configurado para a data selecionada, os horários são gerados com fallback hardcoded de `startHour = 7` e `endHour = 22`. Isso significa que se o admin não configurou a agenda para um dia específico, qualquer horário entre 07:00 e 22:00 fica disponível para o cliente — incluindo os proibidos.

Além disso, o `useBooking` (validação de submissão) **só bloqueia se `schedule` existir** com `working_hours_start` e `working_hours_end`. Se não há schedule cadastrado, ele não valida nada, deixando o agendamento passar.

**Raiz do problema**: O sistema depende de `daily_schedules` para controlar horários, mas quando nenhum schedule foi criado para aquele dia, não há fallback para os `operating_hours` da barbearia (`barbershops.operating_hours`).

---

### Problema 2 — CRÍTICO: Validação de horário no `useBooking` é string comparison fraca
**Arquivo**: `src/hooks/useBooking.ts`, linha 55

```ts
if (data.time < schedule.working_hours_start || data.time > schedule.working_hours_end)
```

Comparação de strings `"20:00" > "20:00"` retorna `false`, então o horário exato de fechamento é permitido. Se o horário de fechamento é `20:00`, um agendamento às `20:00` para um serviço de 60min iria ultrapassar o horário.

---

### Problema 3 — MODERADO: Fallback do `CreateAppointmentDialog` também fraco
**Arquivo**: `src/components/crm/CreateAppointmentDialog.tsx`, linhas 147-148

Fallback de `startHour = 9` e `endHour = 19` no painel interno, mas sem usar os `operating_hours` reais da barbearia.

---

## Solução

### A — Buscar `operating_hours` da barbearia como fallback
Quando não há `daily_schedule` para o dia, usar o `operating_hours` da barbearia (campo JSONB com `{ monday: {open, close}, tuesday: ...}`).

### B — Corrigir lógica de geração de horários disponíveis
No `BookingModal.generateAvailableTimes()`:
1. Se há `schedule` → usar `working_hours_start/end` do schedule
2. Se **não** há schedule → buscar `operating_hours` da barbearia pelo dia da semana e usar o horário de abertura/fechamento
3. Se não há `operating_hours` → fallback conservador de 09:00–18:00 (não 07:00–22:00)

### C — Corrigir validação no `useBooking`
No check de horário de funcionamento:
- Além do `daily_schedule`, usar `operating_hours` da barbearia quando não há schedule
- Validar que o **horário de término** do serviço (não apenas início) está dentro do expediente: `endTime <= working_hours_end`

### D — Aplicar a mesma correção ao `CreateAppointmentDialog`
Mesma lógica de fallback para o agendamento interno no CRM.

---

## Arquivos a modificar

1. **`src/components/BookingModal.tsx`**
   - `generateAvailableTimes()`: buscar `operating_hours` da barbearia como fallback + mudar fallback padrão de 07/22 para 09/18
   - Passar `barbershop.operating_hours` como prop ou buscar internamente

2. **`src/hooks/useBooking.ts`**
   - Buscar `operating_hours` quando não há `daily_schedule`
   - Validar que o **fim do serviço** também está dentro do horário (não só o início)
   - Corrigir comparação: `data.time >= schedule.working_hours_end` (bloquear horário exato de fechamento)

3. **`src/components/crm/CreateAppointmentDialog.tsx`**
   - Mesma correção de fallback via `operating_hours`
   - Mudar fallback padrão de 09/19 para 09/18

---

## Lógica de extração de horários do `operating_hours`

```ts
const DAY_MAP = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const dayName = DAY_MAP[selectedDate.getDay()];
const dayHours = barbershop.operating_hours?.[dayName];

if (dayHours?.open && dayHours?.close) {
  startHour = parseInt(dayHours.open.split(':')[0]);
  endHour = parseInt(dayHours.close.split(':')[0]);
} else {
  // Dia fechado ou sem configuração → sem horários disponíveis
  startHour = 0; endHour = 0;
}
```

Isso resolve o caso do usuário: barbearia com fechamento às 20h configurado em `operating_hours`, sem `daily_schedule` criado → antes mostrava até 22h, após a correção mostrará somente até 20h.
