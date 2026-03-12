
## Diagnóstico dos problemas reais

Há **3 bugs** na lógica de horários que fazem slots inválidos aparecerem como selecionáveis:

### Bug 1 — `generateAvailableTimes` usa apenas a hora inteira (`parseInt(split(':')[0])`)

```typescript
startHour = parseInt(schedule.working_hours_start.split(':')[0]);
endHour = parseInt(schedule.working_hours_end.split(':')[0]);
```

Se o fechamento é `20:00`, o loop vai até `hour < 20`, gerando `19:00` e `19:30` — correto.  
Mas se o serviço dura 60 min e começa às 19:30, termina às 20:30 = **fora do expediente**. Slots que, somada a duração total do serviço, ultrapassam o horário de fechamento não são filtrados.

### Bug 2 — Slots passados do dia atual não são bloqueados

O calendário bloqueia datas anteriores a hoje, mas se o cliente seleciona **hoje**, horários que já passaram continuam aparecendo como disponíveis (ex: são 14h e aparece 09:00, 09:30...).

### Bug 3 — "Qualquer disponível" não verifica ocupação real

Quando `selectedBarber === ANY_BARBER`, `fetchOccupiedTimes` retorna array vazio (`setOccupiedTimes([])`), mostrando todos os horários como livres — mesmo que **todos os barbeiros** estejam ocupados naquele slot.

---

## Solução para os 3 bugs

### Correção 1 — Filtrar slots que ultrapassam o horário de fechamento

Em `generateAvailableTimes`, após gerar os slots, filtrar qualquer slot onde `slotTime + totalDuration > endTime`:

```typescript
// Ao invés de só checar horário de início, checar se o término cabe dentro do expediente
const toMinutes = (h: number, m: number) => h * 60 + m;
const [endHourFull, endMinFull] = workingHoursEnd.split(':').map(Number);
const endInMinutes = toMinutes(endHourFull, endMinFull);

times = times.filter(t => {
  const [h, m] = t.split(':').map(Number);
  return toMinutes(h, m) + totalDuration <= endInMinutes;
});
```

Isso se aplica tanto ao `BookingModal` quanto ao `CreateAppointmentDialog`. Como `totalDuration` é estado reativo, o filtro se reatualiza quando o cliente adiciona ou remove serviços.

### Correção 2 — Filtrar horários passados quando a data é hoje

```typescript
const now = new Date();
const isToday = selectedDate.toDateString() === now.toDateString();
if (isToday) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  times = times.filter(t => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m > nowMinutes;
  });
}
```

### Correção 3 — "Qualquer disponível" calcular ocupação real

Para o `BookingModal`, quando `ANY_BARBER` é selecionado, buscar os agendamentos de **todos os barbeiros** e só bloquear um slot se **nenhum** barbeiro estiver livre:

```typescript
// Buscar appointments de todos os barbers do dia
// Para cada slot em availableTimes, verificar se todos os barbers têm conflito
// Marcar como ocupado apenas os slots onde count(barbers ocupados) === total barbers
```

---

## Arquivos a modificar

| Arquivo | Mudanças |
|---|---|
| `src/components/BookingModal.tsx` | Corrigir `generateAvailableTimes`: filtrar slots pelo término do serviço, filtrar horários passados. Corrigir `fetchOccupiedTimes` para "qualquer disponível" verificar todos os barbeiros. Adicionar `totalDuration` como dependência do `useEffect` que chama `generateAvailableTimes`. |
| `src/components/crm/CreateAppointmentDialog.tsx` | Mesmas correções em `generateAvailableTimes`: filtrar slots pelo término do serviço, filtrar horários passados. |

As correções garantem que **nenhum slot apareça como clicável** se:
- Já passou no horário atual (data de hoje)
- O serviço terminaria após o fechamento da barbearia
- Todos os barbeiros estão ocupados (no modo "qualquer disponível")
