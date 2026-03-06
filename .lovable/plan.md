

## Melhorias para o PDV — Painel Operacional

Após analisar o código e a sessão do usuário, identifiquei melhorias em 3 categorias:

---

### 1. Bug: Labels de pagamento desatualizados
Na seção "Pagamentos Hoje" (linha 958-960), os labels ainda verificam `credit` e `debit` mas o banco agora usa `credit_card` e `debit_card` (corrigido no PaymentModal). Os pagamentos em cartão aparecem sem label.

**Fix**: Atualizar para `credit_card` e `debit_card` + adicionar `subscription`.

### 2. UX: Dashboard mais informativo
- **Faturamento diário destacado**: Adicionar card de "Faturamento Hoje" nos stats (além do mensal), pois é a métrica mais relevante no dia a dia do PDV.
- **Contagem por status nos filtros**: Mostrar quantidade em cada botão de filtro (ex: "Pendentes (3)", "Atendendo (1)").
- **Preço do serviço visível**: Exibir o valor (R$) ao lado do nome do serviço em cada card de agendamento para facilitar conferência rápida.

### 3. UX: Ações rápidas
- **Botão "Confirmar Presença" com confirmação visual**: Após clicar, desabilitar o botão brevemente para evitar duplo clique.
- **Auto-refresh timer**: Mostrar indicador de "última atualização" para dar confiança de que os dados estão atualizados.

---

### Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `src/pages/PDV.tsx` | Fix labels pagamento, contagem nos filtros, preço nos cards, card faturamento diário |

Alterações puramente de frontend — sem mudanças no banco.

