
## Diagnóstico

O `CreateAppointmentDialog.tsx` (usado pelo barbeiro no CRM para criar agendamentos manuais) ainda utiliza o modelo antigo com **seleção de um único serviço** via `<Select>`. A lógica de múltiplos serviços que existe no `BookingModal.tsx` (público/cliente) não foi replicada aqui.

Comparando os dois:

| | `BookingModal.tsx` (cliente) | `CreateAppointmentDialog.tsx` (barbeiro) |
|---|---|---|
| Múltiplos serviços | Sim (checkboxes) | Não (select único) |
| Cálculo de duração total | Sim | Não |
| Agendamentos sequenciais | Sim (via `useBooking`) | Sim (via `useBooking`), mas só 1 serviço |
| Ocupação baseada em duração total | Sim | Parcial |

A solução é **adicionar seleção de serviços adicionais** no `CreateAppointmentDialog`, reutilizando a mesma lógica já testada.

---

## O que será construído

### Mudanças em `CreateAppointmentDialog.tsx`

**1. Estado novo:**
```typescript
const [additionalServiceIds, setAdditionalServiceIds] = useState<string[]>([]);
```

**2. Substituir o `<Select>` de serviço por dois blocos:**
- **Serviço principal**: mantém o `<Select>` atual para o serviço obrigatório
- **Serviços adicionais**: lista de checkboxes abaixo do serviço principal (mesma UI do `BookingModal`)

**3. Cálculo de duração total:**
```typescript
const selectedAdditionalServices = services.filter(s => additionalServiceIds.includes(s.id));
const totalDuration = (services.find(s => s.id === selectedService)?.duration_minutes || 0)
  + selectedAdditionalServices.reduce((acc, s) => acc + s.duration_minutes, 0);
const totalPrice = ...; // mesmo padrão
```

**4. Atualizar `handleSubmit`** para passar `additionalServiceIds` ao `createBooking`:
```typescript
const success = await createBooking({
  serviceId: selectedService,
  additionalServiceIds,  // novo
  ...
});
```

**5. `fetchOccupiedTimes`**: atualizar a dependência para usar `totalDuration` (em vez de `selectedService`) para bloquear slots corretamente, idêntico ao `BookingModal`.

**6. Reset**: limpar `additionalServiceIds` ao fechar o dialog.

---

## Layout proposto

```
┌─────────────────────────────────────────────┐
│ Serviço principal *                          │
│ [Select: Corte de Cabelo - R$45 - 30min]    │
│                                              │
│ Serviços adicionais (opcional)               │
│ ┌───────────────────────────────────────┐   │
│ │ ☐  Barba Completa   30min   R$ 35,00  │   │
│ │ ☑  Sobrancelha      15min   R$ 20,00  │   │
│ │ ☐  Hidratação       20min   R$ 30,00  │   │
│ └───────────────────────────────────────┘   │
│  2 serviços · 45 min · R$ 65,00             │
│                                              │
│ Barbeiro *                                   │
│ [Select: João Silva]                         │
│                                              │
│ Data * [...calendário...]                    │
│                                              │
│ Horário * (baseado na agenda do barbeiro)    │
│ [09:00] [09:30] ~~10:00~~ [10:30] ...       │
└─────────────────────────────────────────────┘
```

---

## Arquivo a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/crm/CreateAppointmentDialog.tsx` | Adicionar estado `additionalServiceIds`, bloco de checkboxes de serviços extras, cálculo de `totalDuration`, atualizar `fetchOccupiedTimes` e `handleSubmit` |

Nenhuma mudança de banco, hooks ou edge functions necessária — o `useBooking` já suporta `additionalServiceIds`.
