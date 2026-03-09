
## Objetivo
Permitir que o cliente, ao abrir o modal de agendamento (clicando "Agendar Agora" em um serviço), possa **adicionar outros serviços** à mesma sessão antes de confirmar.

## Análise do fluxo atual
- `PublicCatalog.tsx`: passa **um único serviço** ao `BookingModal` via `service: Service | null`
- `BookingModal.tsx`: recebe `service` (singular), exibe nome/preço/duração no header, e envia `serviceId` único ao `useBooking`
- `useBooking.ts`: cria **um appointment por chamada** com `service_id` único
- A duração calculada para verificar conflitos e slots usa apenas o serviço principal

## O que será construído

### Comportamento esperado
```
Cliente clica "Agendar" em "Corte" (30min, R$45)
  ↓
Modal abre com "Corte" pré-selecionado
  ↓
Seção "+ Adicionar serviços" lista outros serviços como checkboxes
  ↓
Cliente marca "Barba" (30min, R$35)
  ↓
Header atualiza: "2 serviços · R$ 80,00 · 60 min"
  ↓
Duração total = 60min → slots bloqueados calculados com duração somada
  ↓
Confirmar → cria 2 appointments (um por serviço) sequencialmente
```

### Estratégia para múltiplos serviços
Criar **um appointment por serviço**, agendados sequencialmente:
- Serviço 1: horário selecionado (ex: 10:00, 30min → ocupa 10:00-10:30)
- Serviço 2: horário = horário anterior + duração do serviço anterior (ex: 10:30, 30min)
- Assim o sistema de conflitos existente funciona sem alterações no banco

### Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/BookingModal.tsx` | Adicionar estado `additionalServices`, seção de checkboxes para serviços extras, calcular duração total no header e nos slots ocupados |
| `src/hooks/useBooking.ts` | Aceitar `additionalServices[]` e criar múltiplos appointments sequencialmente |
| `src/pages/PublicCatalog.tsx` | Passar lista completa de `services` ao `BookingModal` para exibir opções de adicionais |

### Detalhes da UI no `BookingModal`

Nova seção entre "Serviço principal" (já exibido no header) e a seleção de data:

```
┌─────────────────────────────────┐
│ Agendar Corte Clássico          │
│ R$ 45,00 · 30 min               │
├─────────────────────────────────┤
│ + Adicionar serviços            │
│ □ Barba Completa  R$35  30min   │
│ □ Tratamento Cap. R$40  40min   │
│ ─────────────────────────────── │
│ Total: R$ 80,00 · 60 min        │
├─────────────────────────────────┤
│ Escolha a Data ...              │
└─────────────────────────────────┘
```

- Serviço principal não aparece na lista de adicionais
- Seleção de tempo recalcula slots bloqueados com duração total
- Resumo dinâmico mostra total de serviços, valor e duração

### Mudança no `useBooking`

```typescript
interface BookingData {
  serviceId: string;
  additionalServiceIds?: string[]; // novo
  barberId: string;
  date: Date;
  time: string;
  // ...
}
```

Para cada serviço adicional, calcula `scheduledAt = scheduledAt_anterior + duration_anterior` e cria um novo appointment. Todas as validações (expediente, overlap) já existem e continuam funcionando.

### Mudança no `PublicCatalog`

`BookingModal` receberá nova prop `allServices: Service[]`:

```typescript
<BookingModal
  ...
  allServices={services}
/>
```

### Impacto no banco
Nenhuma mudança de schema necessária. Múltiplos appointments na mesma tabela, com `barber_id` e `barbershop_id` iguais, horários sequenciais.
