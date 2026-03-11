
## Análise da situação

O sistema atualmente **não possui** nenhum mecanismo de cancelamento ou reagendamento para:
- **Cliente** (no painel `ClientDashboard.tsx`): apenas visualiza os agendamentos futuros, sem nenhuma ação disponível
- **Barbeiro/Admin** (no PDV `PDV.tsx`): só tem ações de "Presente", "Faltou" e "Finalizar" — sem botão de cancelar

O banco já tem o status `cancelled` na tabela `appointments` e a RLS permite que clientes façam UPDATE em seus próprios agendamentos (`Clients can update own appointments`), então **nenhuma mudança de banco é necessária**.

## O que será construído

### 1. Cancelamento pelo cliente (ClientDashboard)

Nos cards de "Próximos agendamentos", adicionar um botão **"Cancelar"** que:
- Abre um dialog de confirmação com mensagem clara ("Tem certeza que deseja cancelar este agendamento?")
- Executa `UPDATE appointments SET status = 'cancelled'` via Supabase
- Mostra toast de sucesso e atualiza a lista localmente (move o card para Histórico como "Cancelado")
- Regra: só permite cancelar agendamentos com status `scheduled` (não `in_progress`) e com pelo menos 1 hora de antecedência

### 2. Cancelamento pelo barbeiro/admin (PDV)

Nos cards de agendamentos `scheduled` do PDV (hoje e datas futuras), adicionar um botão **"Cancelar"** ao lado dos existentes ("Presente" / "Faltou"):
- Abre um dialog de confirmação simples
- Executa UPDATE do status para `cancelled`
- Recarrega a lista de agendamentos do dia

### 3. Reagendamento pelo barbeiro/admin (PDV) — opcional via dialog

Adicionar um botão **"Reagendar"** nos cards `scheduled` que:
- Abre um dialog compacto com seletor de nova data + horário
- Lista os horários disponíveis do mesmo barbeiro na nova data
- Atualiza `scheduled_at` do agendamento existente (sem criar novo)
- Recarrega o dia atual e o dia de destino

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/ClientDashboard.tsx` | Adicionar botão "Cancelar" nos cards de próximos agendamentos + dialog de confirmação + lógica de update |
| `src/hooks/useClientPortal.ts` | Adicionar função `cancelAppointment(id)` no retorno do hook |
| `src/pages/PDV.tsx` | Adicionar botão "Cancelar" e "Reagendar" nos cards scheduled + dialog de reagendamento + lógica de update |

## Layout proposto — Cliente

```
┌─────────────────────────────────────────────────────┐
│ 📅 Corte de Cabelo     Sex, 14 Mar às 10:00         │
│    João · em 3 dias                    [Agendado]   │
│                                                     │
│                              [Cancelar agendamento] │
└─────────────────────────────────────────────────────┘
```

## Layout proposto — PDV (barbeiro)

```
┌──────────────────────────────────────────────────────┐
│  Carlos Silva          10:00      [Agendado]          │
│  Corte de Cabelo · R$ 35  ·  Barbeiro: João           │
│                                                       │
│  [✓ Presente] [✗ Faltou] [Reagendar] [Cancelar]      │
└──────────────────────────────────────────────────────┘
```

## Regras de negócio aplicadas

- **Cliente** só pode cancelar com `status = 'scheduled'` e `scheduled_at > now() + 1 hora`
- **Barbeiro/Admin** pode cancelar qualquer `scheduled` ou `in_progress` em dias hoje ou futuros
- **Reagendamento** (PDV): valida disponibilidade antes de salvar, reutiliza a lógica de horários disponíveis já existente no `useBarberAvailability`
- Sem mudanças de banco necessárias
