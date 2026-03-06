

## Varredura de Responsividade Mobile — Problemas Encontrados

Analisei os componentes e páginas principais do app. A maioria já tem bom suporte mobile (CRM, Financial, PDV usam breakpoints adequados). Os problemas concentram-se nas **páginas e componentes recém-criados/atualizados**:

---

### Problemas Identificados

**1. SubscriptionsManagement — Header**
- Linha 62-69: `flex items-center justify-between` sem wrap. Em telas pequenas, o título e o botão "Novo Plano" ficam comprimidos lado a lado.
- **Fix**: Adicionar `flex-col sm:flex-row gap-3` e `w-full sm:w-auto` no botão.

**2. SubscriptionsManagement — TabsList**
- Linha 75-80: 4 abas ("Planos", "Assinaturas Ativas", "Cobranças", "Recompensas") em uma `TabsList` sem `overflow-x-auto` nem grid. Em telas < 400px, o texto trunca ou transborda.
- **Fix**: Usar `grid grid-cols-2 sm:grid-cols-4` ou `overflow-x-auto` com `flex-nowrap`.

**3. PlanFormDialog — Benefícios de serviço (linha 244)**
- Os itens de benefício usam `flex items-end gap-2` com inputs de largura fixa (`w-20`, `w-24`). Em mobile, os 4 elementos (select + 2 inputs + botão delete) não cabem em uma linha.
- **Fix**: Mudar para layout empilhado em mobile: `flex flex-col sm:flex-row` e inputs `w-full sm:w-20`.

**4. PlanFormDialog — Programa de Pontos (linha 331)**
- `grid grid-cols-3 gap-3` sem breakpoint. Em telas pequenas, os 3 campos ficam espremidos.
- **Fix**: `grid grid-cols-1 sm:grid-cols-3 gap-3`.

**5. PlanFormDialog — DialogContent**
- `max-w-2xl` pode ser largo demais no mobile. Já tem `max-h-[90vh] overflow-y-auto`, o que é bom.
- **Fix**: Adicionar `w-full` para garantir que não excede a viewport.

**6. ActiveSubscriptionsList — Tabela sem responsividade**
- 7 colunas sempre visíveis. Em mobile, a tabela fica muito larga mesmo com `overflow-x-auto`.
- **Fix**: Esconder colunas menos críticas em mobile: `hidden sm:table-cell` para "Créditos", "Recorrência" e "Expira em". Botões de ação empilhados.

**7. PaymentHistoryTable — Mesma questão**
- 6 colunas sempre visíveis.
- **Fix**: Esconder "Método" e "Pago em" em mobile com `hidden sm:table-cell`.

**8. RewardsManager — Cards grid**
- Já usa `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, está OK.
- O dialog interno (`max-w-md`) está OK para mobile.

**9. CashFlowTable — Footer totalizador (linha 206)**
- `colSpan={5}` com texto "Entradas: X | Saídas: Y | Saldo: Z" em uma linha. Em mobile fica cortado.
- **Fix**: Quebrar em linhas separadas com `flex flex-col sm:flex-row sm:gap-2`.

---

### Arquivos a Alterar

| Arquivo | Mudança |
|---|---|
| `src/pages/SubscriptionsManagement.tsx` | Header responsivo, TabsList com grid/overflow |
| `src/components/subscriptions/PlanFormDialog.tsx` | Benefícios empilhados em mobile, pontos grid responsivo |
| `src/components/subscriptions/ActiveSubscriptionsList.tsx` | Esconder colunas em mobile, botões empilhados |
| `src/components/subscriptions/PaymentHistoryTable.tsx` | Esconder colunas em mobile |
| `src/components/financial/CashFlowTable.tsx` | Footer totalizador responsivo |

Nenhuma mudança de lógica ou banco — apenas ajustes de CSS/Tailwind.

