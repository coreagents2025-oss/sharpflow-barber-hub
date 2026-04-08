

## Correção: Agendamentos não aparecem no PDV em tempo real (stale closure)

### Problema

No `src/pages/PDV.tsx`, o `useEffect` da linha 126 cria o canal realtime com dependência apenas de `[authBarbershopId]`. O callback (linha 145-148) captura `selectedDate` do momento da montagem. Quando o usuário muda de data, o callback continua chamando `fetchAppointmentsForDate` com a data antiga — os agendamentos do dia atual não aparecem ou se "perdem" após navegação.

### Solução

**Arquivo: `src/pages/PDV.tsx`**

1. Adicionar `useRef` para `selectedDate`:
   ```typescript
   import { useState, useEffect, useRef } from 'react';
   // ...
   const selectedDateRef = useRef(selectedDate);
   ```

2. Manter o ref sincronizado (após cada render):
   ```typescript
   useEffect(() => {
     selectedDateRef.current = selectedDate;
   }, [selectedDate]);
   ```

3. No callback do realtime (linha 146), usar o ref em vez da variável:
   ```typescript
   () => {
     fetchAppointmentsForDate(selectedDateRef.current);
     fetchBarberStatuses();
   }
   ```

Isso garante que o canal realtime — criado uma única vez por `authBarbershopId` — sempre busque os dados da data que o usuário está vendo, sem reconexões desnecessárias.

---

### Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/PDV.tsx` | Importar `useRef`; criar `selectedDateRef`; usar no callback do realtime |

Nenhuma migration SQL necessária.

