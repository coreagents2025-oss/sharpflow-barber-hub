
## Diagnóstico

O painel do cliente (`ClientDashboard.tsx`) já exibe uma seção "Últimos Agendamentos", mas com duas limitações:

1. **Hook limita a 5 registros** — `.limit(5)` no `useClientPortal.ts` restringe a apenas 5 agendamentos recentes
2. **Só mostra passados/todos misturados** — não separa agendamentos futuros (próximos horários) dos já realizados
3. **Título é "Últimos Agendamentos"** — não deixa claro para o cliente quais são os agendamentos futuros (ainda por vir)

## O que será feito

### 1. Separar agendamentos em "Próximos" e "Histórico"

Dividir a seção de agendamentos em duas abas/grupos:
- **Próximos agendamentos**: status `scheduled` ou `in_progress` com `scheduled_at >= agora` — exibidos primeiro, com destaque visual
- **Histórico**: agendamentos passados (concluídos, cancelados, faltou)

### 2. Aumentar o limite de busca no hook

Alterar `.limit(5)` para `.limit(20)` no `useClientPortal.ts` para garantir que o histórico completo recente seja exibido.

### 3. Melhorar o layout dos agendamentos futuros

Para os próximos agendamentos, mostrar um card mais destacado com:
- Data e hora com destaque (ex: "Amanhã às 10:00" ou "Seg, 15 Mar")
- Nome do serviço e barbeiro
- Badge de status
- Texto de contagem regressiva (ex: "em 2 dias")

### 4. Tabs ou seções separadas com contadores

```
[ Próximos (2) ]  [ Histórico (8) ]
```

Usar tabs para separar os dois grupos, com contador em cada aba.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/hooks/useClientPortal.ts` | Aumentar limit de 5 para 20; separar em `upcomingAppointments` e `pastAppointments` |
| `src/pages/ClientDashboard.tsx` | Substituir a seção "Últimos Agendamentos" por dois grupos: próximos (destacados) e histórico em tabs |

## Layout proposto

```
┌─────────────────────────────────────────────────────┐
│ MEUS AGENDAMENTOS                                   │
│  [Próximos (2)]  [Histórico (8)]                    │
│                                                     │
│ PRÓXIMOS:                                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📅 Corte de Cabelo       Seg, 15 Mar às 10:00  │ │
│ │    João · em 2 dias      [Agendado]             │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ HISTÓRICO:                                          │
│  Corte + Barba   12/03  · João  [Concluído]         │
│  Corte           05/03  · João  [Concluído]         │
└─────────────────────────────────────────────────────┘
```

Sem mudanças de banco necessárias.
