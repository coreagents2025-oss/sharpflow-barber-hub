

## Diagnóstico completo — problema identificado com precisão

### Bug Principal (UX) — `setSelectedTime('')` no `toggleAdditionalService`

**Local:** `src/components/BookingModal.tsx` linha 146

O screenshot confirma o problema: na tela de resumo aparece **"13 de mar. às"** — sem hora. O campo de hora está em branco apesar do usuário ter selecionado.

**Fluxo que reproduz o bug:**
1. Step 1 — usuário seleciona barbeiro ✓
2. Step 2 — usuário seleciona data e hora (ex: "09:00") → `selectedTime = "09:00"` ✓
3. Step 3 — usuário clica em "Barboterapia" como serviço extra → `toggleAdditionalService()` é chamada
4. **BUG:** `toggleAdditionalService` executa `setSelectedTime('')` na linha 146 → **`selectedTime` vira `''`**
5. Step 4 — `isFormValid` é `false` porque `selectedTime === ''` → botão "Confirmar" fica **disabled (opaco)** → clique não funciona
6. Resumo mostra "13 de mar. às" sem hora porque `selectedTime` está vazio

**Por que `setSelectedTime('')` existe aí?** Foi adicionado para forçar o usuário a re-escolher o horário quando muda a duração total (ao adicionar serviços extras, o slot pode não ter espaço). A intenção era boa, mas a execução causa silenciosamente o estado inválido sem alertar o usuário.

**Dado confirmado no banco:** Barboterapia tem 30 minutos, o serviço principal selecionado também tem 30 min → duração total = 75 min. O horário disponível era válido, mas foi apagado.

---

### Bug Secundário — Trigger `check_appointment_conflict` ativo

**Confirmado via `pg_trigger`:** O trigger `prevent_appointment_conflict` está ativo (`tgenabled: O`). Ele verifica conflito na inserção usando a duração real do serviço — correto. Mas isso quer dizer que mesmo que o frontend passe, se houver conflito no banco, lança `CONFLITO_AGENDAMENTO`. O lookback de 8h no `useBooking` está corretamente implementado. **Esse bug já foi corrigido e está funcionando.**

---

### Análise do estado do banco

- RAFAEL (Anjus) tem **35 agendamentos futuros reais** de 12/03 a 14/03 — todos legítimos, devem ser preservados
- Os agendamentos de 11/03 (passados) são **17 registros stale** que **ainda causam problema** porque a validação `scheduledAt <= now` no código tenta bloquear datas passadas, mas o `overlappingBefore` com 8h de lookback ainda pega alguns deles dependendo do horário de tentativa

---

## Plano de correção — 2 mudanças cirúrgicas no mesmo arquivo

### Fix 1 — Remover `setSelectedTime('')` do `toggleAdditionalService`

Em vez de silenciosamente apagar o horário, manter o horário selecionado e **apenas recalcular a disponibilidade**. Se o novo tempo total não cabe no slot selecionado, o `useEffect` de `totalDuration` já chama `generateAvailableTimes()` que atualiza a lista. O hook de booking também valida a duração final contra o horário de fechamento.

```typescript
// ANTES (linha 142-147):
const toggleAdditionalService = (serviceId: string) => {
  setAdditionalServiceIds(prev =>
    prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
  );
  setSelectedTime('');  // ← REMOVE ESTA LINHA
};

// DEPOIS:
const toggleAdditionalService = (serviceId: string) => {
  setAdditionalServiceIds(prev =>
    prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
  );
  // selectedTime é mantido; o useEffect de totalDuration já atualiza availableTimes
  // Se o slot ficar inválido, aparecerá marcado como ocupado na grade de horários
};
```

### Fix 2 — Remover o `setSelectedTime('')` do `useEffect` de `totalDuration`

**Local:** linha 103 — `useEffect` que dispara quando `totalDuration` muda.

Esse efeito zera o horário quando a duração total muda (ao adicionar serviços no step 3), **mesmo o usuário já estando no step 4**. Deve ser restrito a só resetar se o step atual ainda for o step de seleção de horário (step 2).

```typescript
// ANTES (linha 100-105):
useEffect(() => {
  if (selectedDate) {
    generateAvailableTimes();
    setSelectedTime('');  // ← problemático quando o usuário já passou desse step
  }
}, [selectedDate, barbershopId, totalDuration]);

// DEPOIS — só resetar o horário se ainda estiver no step 2:
useEffect(() => {
  if (selectedDate) {
    generateAvailableTimes();
    if (step === 2) setSelectedTime('');  // só reseta se está escolhendo horário
  }
}, [selectedDate, barbershopId, totalDuration, step]);
```

---

## Arquivos a modificar

| Arquivo | Linhas | Mudança |
|---|---|---|
| `src/components/BookingModal.tsx` | 100-105 | Condicionar `setSelectedTime('')` ao `step === 2` |
| `src/components/BookingModal.tsx` | 142-147 | Remover `setSelectedTime('')` de `toggleAdditionalService` |

**Zero mudanças no banco. Zero risco de perda de dados. Dois removals de linha.**

---

## Verificação de segurança — o booking ainda valida corretamente?

Sim. O `useBooking.ts` já valida no servidor:
- Horário dentro do expediente ✓
- Duração total não ultrapassa fechamento ✓  
- Conflito de agendamento via `existingAppointments` e `overlappingBefore` ✓
- Trigger `prevent_appointment_conflict` no banco como última barreira ✓

Se o usuário mantiver um horário inválido após adicionar serviços, o backend rejeitará com mensagem clara.

