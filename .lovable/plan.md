
## Diagnóstico

Na página PDV (`src/pages/PDV.tsx`), a função `fetchTodayAppointments` filtra os agendamentos com:
```typescript
.gte('scheduled_at', today.toISOString())
.lt('scheduled_at', tomorrow.toISOString())
```

Isso limita a visualização ao dia atual. Não há como navegar para outros dias — nem passados nem futuros.

## O que será feito

### 1. Adicionar seletor de data na seção "Todos os Agendamentos"

Acima da lista de agendamentos (linha ~773), adicionar um controle de navegação de data com:
- Botão **◀** para dia anterior
- Data atual exibida como texto clicável (ex: "Hoje, 10 Mar" / "Ontem" / "Amanhã" / "10 Mar")
- Botão **▶** para próximo dia
- Botão **"Hoje"** para voltar rapidamente ao dia atual

### 2. Tornar `fetchTodayAppointments` dinâmica por data

Renomear para `fetchAppointmentsForDate(date: Date)` e substituir o filtro fixo de hoje por filtros baseados na data selecionada:

```typescript
const fetchAppointmentsForDate = async (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from('appointments_with_client')
    .select(...)
    .eq('barbershop_id', authBarbershopId)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .order('scheduled_at', { ascending: true });
  ...
};
```

### 3. Adicionar estado `selectedDate`

```typescript
const [selectedDate, setSelectedDate] = useState<Date>(new Date());
```

- O `refreshAll` e o useEffect continuam funcionando, mas agora passando `selectedDate`
- Quando mudar a data, recarregar os agendamentos automaticamente

### 4. Ajustar o título da seção

O CardTitle "Todos os Agendamentos de Hoje" passa a mostrar a data selecionada dinamicamente:

```
"Agendamentos de Hoje" → se for o dia atual
"Agendamentos de Ontem" → se for o dia anterior
"Agendamentos de 09/03/2025" → outros dias
```

### 5. Remover botões de ação para dias passados

Para agendamentos de dias passados, não exibir os botões "Presente", "Faltou" e "Finalizar" (status `scheduled` ou `in_progress` de dias passados não fazem sentido operacional). Apenas mostrar o status.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/PDV.tsx` | Adicionar estado `selectedDate`, refatorar `fetchTodayAppointments` para aceitar data, adicionar navegador de data na UI da seção de agendamentos |

## Layout do novo controle de data

```
┌─────────────────────────────────────────────────────┐
│ Todos os Agendamentos                               │
│                                                     │
│  [◀]  [ Hoje, 10 Mar ▾ ]  [▶]  [Hoje]              │
│                                                     │
│  [Todos(3)] [Pendentes(1)] [Atendendo(1)] [Fim(1)] │
└─────────────────────────────────────────────────────┘
```

Nenhuma mudança de banco necessária.
