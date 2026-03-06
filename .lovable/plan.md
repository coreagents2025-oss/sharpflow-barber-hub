

## Diagnóstico: Entrada duplicada no fluxo de caixa

### Problema encontrado

Para o agendamento `7d41ae00` (Acabamento/Pezinho, cliente Rafael), existem **duas entradas de R$32 no cash_flow** (total R$64):

1. **Entrada manual** (criada pelo `PaymentModal.tsx` linha 189): "Pagamento - Acabamento (Pezinho) - Rafael" — inserida diretamente no código ao registrar pagamento
2. **Entrada automática** (criada pela trigger `sync_payment_to_cash_flow`): "Pagamento - Appointment ID: 7d41ae00..." — inserida automaticamente quando o pagamento é criado na tabela `payments`

O código do `PaymentModal.tsx` insere no `payments` (linha 172) **e** manualmente no `cash_flow` (linha 189). Porém, a trigger `sync_payment_to_cash_flow` já faz exatamente isso automaticamente quando um registro é inserido em `payments`. Resultado: **duplicação**.

A trigger tem um `WHERE NOT EXISTS` para evitar duplicatas, mas como ambas as inserções acontecem quase no mesmo instante (diferença de ~1 segundo), a verificação de duplicata falha por questão de timing.

### Correção

**Remover a inserção manual no `cash_flow` do `PaymentModal.tsx`** (linhas 186-208). A trigger `sync_payment_to_cash_flow` já garante a sincronia. O próprio comentário no código (linha 202) já diz: "trigger garante a sincronia".

A trigger continuará funcionando normalmente e não haverá mais duplicatas.

### Sobre o valor R$32

O serviço "Acabamento (Pezinho)" tem preço de R$20, mas o pagamento foi registrado como R$32. Isso pode ter sido um valor personalizado digitado manualmente pelo operador no PDV (ex: com adicional). Não é bug do sistema — é o valor que foi informado no momento do pagamento.

### Resumo das alterações

| Arquivo | Ação |
|---|---|
| `src/components/PaymentModal.tsx` | Remover inserção manual no `cash_flow` (linhas 186-208), manter apenas o insert em `payments` + update do appointment |

