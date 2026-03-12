

## Two features to implement

### Feature 1 — Mostrar assinatura ativa no dashboard logo após o login

**Status atual:** O `ClientDashboard` já exibe o card "Minha Assinatura", mas o problema reportado é que a assinatura não aparece mesmo existindo. A causa já foi resolvida na sessão anterior (filtro OR por `client_id` ou `lead_id` no `useClientPortal`). O que o usuário quer agora é **destacar visualmente o status "Ativa"** logo no topo após o login, para que fique óbvio ao assinante que sua assinatura está em vigor.

**Mudança no `ClientDashboard.tsx`:**  
- Adicionar um banner/destaque no topo da área de boas-vindas quando a assinatura estiver ativa: badge verde "Assinatura Ativa" próximo ao nome da barbearia no header + mensagem de boas-vindas personalizada "Bem-vindo, assinante!"  
- Quando `subscription` existe e não está expirada, exibir um badge `✓ Assinante Ativo` no header e na seção de boas-vindas.

---

### Feature 2 — Agendamento pelo portal usando crédito de assinatura

**Fluxo desejado:** quando um assinante loga no portal e clica em "Agendar horário", o `BookingModal` deve detectar que o usuário tem assinatura ativa e oferecer a opção de usar um crédito.

**Como funciona hoje:**
- `PublicCatalog` passa `loggedInUser` para o `BookingModal`
- O modal pré-preenche nome/telefone/email mas não verifica assinatura
- O `useBooking` cria o appointment normalmente sem debitar créditos

**O que será feito:**

**1. `PublicCatalog.tsx`** — Quando o usuário logado tem `userRole === 'client'`, buscar a assinatura ativa do cliente e passá-la como prop ao `BookingModal`:

```typescript
// Buscar subscription do cliente logado para o BookingModal
const [clientSubscription, setClientSubscription] = useState<{
  id: string; credits_remaining: number; plan_name: string;
} | null>(null);

// Quando slug e user estão disponíveis, buscar assinatura
// usar a mesma lógica de useClientPortal (OR por client_id / lead_id)
```

**2. `BookingModal.tsx`** — Adicionar:
- Nova prop `clientSubscription?: { id: string; credits_remaining: number; plan_name: string } | null`
- No step final (step de dados do cliente), se `clientSubscription` existe com créditos > 0: exibir toggle/switch "Usar crédito de assinatura (X restantes)" com destaque visual  
- Estado `useSubscriptionCredit: boolean` (default `true` se assinante)
- Passar esse estado ao `handleSubmit`

**3. `useBooking.ts`** — Adicionar ao `BookingData`:
```typescript
subscriptionId?: string;  // se preenchido, debitar crédito
```
Após criar o appointment com sucesso, se `subscriptionId` for fornecido:
- Buscar `client_subscriptions` onde `id = subscriptionId`
- Decrementar `credits_remaining` via update: `credits_remaining - 1`
- Inserir em `subscription_credit_usage`: `{ subscription_id, appointment_id: appt.id }`

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/pages/ClientDashboard.tsx` | Badge "Assinante Ativo" no header e boas-vindas personalizadas |
| `src/pages/PublicCatalog.tsx` | Buscar assinatura do cliente logado; passar `clientSubscription` ao `BookingModal` |
| `src/components/BookingModal.tsx` | Prop `clientSubscription`; toggle "Usar crédito" no step final |
| `src/hooks/useBooking.ts` | Campo `subscriptionId` em `BookingData`; debitar crédito após booking bem-sucedido |

Nenhuma migration SQL necessária — a tabela `subscription_credit_usage` e a coluna `credits_remaining` já existem.

