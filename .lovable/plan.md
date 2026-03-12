

## Auditoria Completa — 3 Bugs Confirmados no Banco

### Bug #1 — CRÍTICO (bloqueia TODO novo agendamento): query sem filtro de data

**Local:** `src/hooks/useBooking.ts` linhas 176-181

A query `overlappingBefore` busca **todos os agendamentos passados do barbeiro sem nenhum filtro de data**:

```typescript
// Pega TODO o histórico do barbeiro desde o início dos tempos
.lt('scheduled_at', scheduledAt.toISOString())
.not('status', 'in', '(cancelled,no_show,completed)')
```

Resultado confirmado no banco: **RAFAEL (Anjus) tem 17 agendamentos "scheduled" no passado** (10/03 a 11/03). Cada um deles tem `scheduled_at < agora`, então a lógica de `aptEnd > scheduledAt` sempre retorna `true` → `hasOverlap = true` → booking BLOQUEADO antes mesmo de chegar ao banco.

**Impacto por barbearia:**
- Anjus: 17 stale → **100% bloqueado**
- Artesanal: 11 stale → **bloqueado**
- Minha Barbearia: 3 stale → **bloqueado**
- Procedimento Barber: 2 stale → **bloqueado**

**Fix:** Adicionar `.gte('scheduled_at', new Date(scheduledAt.getTime() - 8 * 60 * 60 * 1000).toISOString())` — só olha as últimas 8h, suficiente para detectar overlaps reais.

---

### Bug #2 — CRÍTICO (todos os slots aparecem livres): `appointments` sem SELECT público

Não existe nenhuma política `SELECT` para usuários anônimos na tabela `appointments`. Resultado: `fetchOccupiedTimes()` recebe array vazio → **todos os horários aparecem como disponíveis** na UI.

O usuário seleciona um horário "livre" que na verdade está ocupado → submete → o trigger `check_appointment_conflict()` no banco detecta o conflito → lança `CONFLITO_AGENDAMENTO` → booking falha.

**Fix:** Criar política SELECT pública restrita: anônimos podem ler `scheduled_at`, `barber_id`, `barbershop_id` e `service_id` apenas — suficiente para exibir slots ocupados, sem expor dados PII do cliente (`lead_id`, `client_id`, `notes`).

Para isso, a solução segura é criar uma **view** `public_appointment_slots` com apenas os campos necessários, com `security_invoker=on`, e criar a política no SELECT da view.

---

### Bug #3 — MODERADO: `daily_schedules` sem SELECT público

Só existe uma política (`ALL`) que usa `has_role(admin/barber)`. Usuários anônimos **não conseguem ler** `daily_schedules`.

Resultado: `generateAvailableTimes()` e `fetchBarbers()` no modal sempre caem no fallback (`public_barbershops.operating_hours`) e nunca usam exceções de horário configuradas pelo admin (ex: "aberto até 20h no sábado").

**Fix:** Adicionar política SELECT pública em `daily_schedules` (sem PII — só horários).

---

## Plano de Correção — 2 etapas, sem apagar dados

### Etapa 1 — Migration SQL (apenas estrutura/políticas, zero DELETE de dados)

```sql
-- Fix 2: View pública segura para verificação de disponibilidade
CREATE OR REPLACE VIEW public.public_appointment_slots
WITH (security_invoker=on) AS
  SELECT id, barbershop_id, barber_id, service_id, scheduled_at, status
  FROM public.appointments
  WHERE status NOT IN ('cancelled', 'no_show', 'completed');

-- Política SELECT pública na view (NÃO na tabela base)
-- A tabela base já tem RLS que protege dados PII

-- Fix 3: Política SELECT pública em daily_schedules
CREATE POLICY "Public can read daily schedules"
ON public.daily_schedules
FOR SELECT
TO public
USING (true);
```

### Etapa 2 — Código: `useBooking.ts` — adicionar filtro de 8h na query

Linha 180, trocar:
```typescript
// ANTES (pega TODO histórico)
.lt('scheduled_at', scheduledAt.toISOString())
```
por:
```typescript
// DEPOIS (só últimas 8h — tempo suficiente para serviços longos)
.gte('scheduled_at', new Date(scheduledAt.getTime() - 8 * 60 * 60 * 1000).toISOString())
.lt('scheduled_at', scheduledAt.toISOString())
```

E no `BookingModal.tsx` — `fetchOccupiedTimes()` — trocar a query de `appointments` para usar a nova view `public_appointment_slots`:

```typescript
// ANTES
.from('appointments')
// DEPOIS
.from('public_appointment_slots')
```

---

## Resumo de impacto

| Bug | Causa | Fix | Dados tocados? |
|---|---|---|---|
| #1 — Todo agendamento bloqueado | `overlappingBefore` sem filtro de data | +1 linha no hook | Nenhum |
| #2 — Slots ocupados não aparecem | Sem SELECT público em `appointments` | View + política | Nenhum |
| #3 — Horários customizados ignorados | Sem SELECT público em `daily_schedules` | +1 política | Nenhum |

**Nenhum dado de Anjus ou qualquer barbearia é modificado ou apagado.** Os 23 agendamentos futuros de Anjus ficam intactos. Os 17 stale permanecem no banco — só param de interferir com novos agendamentos porque a query passa a ter limite de 8h.

