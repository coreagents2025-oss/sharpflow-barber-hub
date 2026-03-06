

## Correção: Erro de Pagamento em Débito/Crédito

### Causa raiz
A constraint `payments_payment_method_check` no banco aceita os valores: `cash`, `credit_card`, `debit_card`, `pix`, `subscription`.

Porém o `PaymentModal.tsx` envia `credit` e `debit` (linhas 318 e 324), que não correspondem aos valores permitidos.

### Correção
Alterar os `SelectItem` values no `PaymentModal.tsx`:
- `debit` → `debit_card`
- `credit` → `credit_card`

Tambem atualizar a função `getPaymentIcon` que provavelmente usa os mesmos valores incorretos.

### Arquivo alterado
| Arquivo | Mudança |
|---|---|
| `src/components/PaymentModal.tsx` | Corrigir values de `debit` → `debit_card` e `credit` → `credit_card` nos SelectItems e no getPaymentIcon |

Correção simples de 2 linhas + ajustes na função auxiliar de ícone.

