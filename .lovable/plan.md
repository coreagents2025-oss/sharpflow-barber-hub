
## Diagnóstico do Problema de Horário no Email

### Causa raiz: fuso horário (timezone)

O `scheduledAt` é construído no frontend assim:
```typescript
const scheduledAt = new Date(data.date);
scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
```

Isso cria um objeto `Date` no **fuso horário local do browser do cliente** (ex: `America/Sao_Paulo`, UTC-3). Quando `.toISOString()` é chamado, ele converte para UTC — ou seja, um agendamento para `10:00` no Brasil vira `13:00Z` no ISO string.

No Edge Function, o código é:
```typescript
const scheduledDate = new Date(scheduled_at); // recebe "2025-03-11T13:00:00.000Z"
const formattedTime = scheduledDate.toLocaleTimeString("pt-BR", {
  hour: "2-digit", minute: "2-digit",
});
```

**O problema:** Deno (Deno Deploy) roda em servidores com fuso UTC. `toLocaleTimeString("pt-BR")` sem especificar `timeZone` usa o fuso do servidor — que é **UTC, não Brasília**. Então `13:00Z` é formatado como `13:00` em vez de `10:00`.

### Solução

Passar explicitamente `timeZone: "America/Sao_Paulo"` nos métodos de formatação de data/hora no Edge Function:

```typescript
const formattedDate = scheduledDate.toLocaleDateString("pt-BR", {
  weekday: "long", year: "numeric", month: "long", day: "numeric",
  timeZone: "America/Sao_Paulo",  // ← adicionar
});
const formattedTime = scheduledDate.toLocaleTimeString("pt-BR", {
  hour: "2-digit", minute: "2-digit",
  timeZone: "America/Sao_Paulo",  // ← adicionar
});
```

Isso garante que independentemente do fuso do servidor Deno, o horário exibido no email sempre será convertido corretamente para horário de Brasília (UTC-3).

## Arquivo a modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/send-booking-confirmation/index.ts` | Adicionar `timeZone: "America/Sao_Paulo"` nas chamadas `toLocaleDateString` e `toLocaleTimeString` (linhas 119-124) |

Nenhuma mudança de banco, nenhum outro arquivo envolvido.
