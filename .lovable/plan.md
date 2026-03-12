
## Diagnóstico do problema

A jornada atual do `BookingModal.tsx` tem a seguinte ordem:

```
1. Nome / Telefone / Email
2. Serviços adicionais (checkbox)
3. Escolha a Data (calendário)
4. Escolha o Horário (só aparece após selecionar data)
5. Escolha o Barbeiro (só aparece após data + horário)
   → "Selecione data e horário primeiro para ver os barbeiros disponíveis"
```

**Problemas de UX identificados:**

1. **Barbeiro é a escolha mais emocional** — o cliente geralmente sabe QUEM quer antes de saber QUANDO pode ir
2. **Dados pessoais primeiro** — pedir nome/telefone/email antes de o cliente ver se há disponibilidade é um atrito desnecessário que causa abandono
3. **Calendário gigante no meio** — ocupa muito espaço vertical num modal em Sheet, forçando o cliente a rolar muito
4. **Horários sem contexto de barbeiro** — o cliente vê todos os horários disponíveis mas não sabe quais são para o barbeiro que quer

## Nova ordem proposta (fluxo guiado em steps)

Substituir o scroll longo por um fluxo de **4 passos sequenciais** com indicador de progresso:

```
Step 1: Barbeiro
  → Cards dos barbeiros com foto e especialidade
  → Opção "Qualquer barbeiro disponível" (any)

Step 2: Data + Horário
  → Calendário compacto
  → Grade de horários aparece logo abaixo após selecionar data
  → Horários ocupados marcados em cinza (baseados no barbeiro selecionado)

Step 3: Serviços adicionais (se existirem)
  → Checklist simples de add-ons

Step 4: Seus dados
  → Nome, Telefone, Email
  → Resumo do agendamento antes de confirmar

[Barra de progresso: ● ○ ○ ○]
[Botão "Continuar" / "Confirmar"]
```

## Regras da nova lógica

- **Barbeiro "qualquer"**: se o cliente selecionar "qualquer disponível", os horários mostrados são a **união** de slots disponíveis de todos os barbeiros. No envio, o sistema escolhe automaticamente o primeiro barbeiro disponível naquele horário.
- A verificação de `occupiedTimes` passa a rodar no Step 2 **assim que** o barbeiro for selecionado no Step 1 (sem esperar data)
- A barra de progresso no topo do Sheet indica o step atual (1 de 4)
- Botões "Voltar" e "Continuar" na parte inferior — nenhum scroll longo mais
- Step 3 (serviços extras) é **pulado automaticamente** se não houver serviços adicionais

## Impacto visual

```
┌─────────────────────────────────────────┐
│ Agendar Corte Clássico    R$ 45 · 30min │
│ ━━━━━━━━━━━━━━━░░░░░░░░░░░░░░░░░░░░░░░ │ ← progress bar
│ Passo 1 de 4 · Escolha o profissional  │
│                                         │
│  ┌──────────┐  ┌──────────┐             │
│  │  [foto]  │  │  [foto]  │             │
│  │   João   │  │  Carlos  │             │
│  │  Corte   │  │  Barba   │             │
│  └──────────┘  └──────────┘             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  👤 Qualquer disponível         │    │
│  └─────────────────────────────────┘    │
│                                         │
│              [Continuar →]              │
└─────────────────────────────────────────┘
```

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/BookingModal.tsx` | Refatorar de scroll único para fluxo multi-step com barra de progresso. Toda a lógica de fetch existente é mantida, apenas a ordem e renderização mudam. |

Nenhuma mudança de banco, hooks ou edge functions necessária.
