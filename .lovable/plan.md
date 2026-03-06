

## Problema e Melhorias para a Seção Financeira

### Problema atual
A tabela de fluxo de caixa (`CashFlowTable`) nao tem botoes de editar ou excluir. O hook `useCashFlow` ja tem `deleteTransaction` mas nao tem `updateTransaction`, e a tabela nao usa nenhum dos dois. As RLS policies do banco permitem UPDATE e DELETE para staff, entao o problema e apenas no frontend.

### Correcoes e melhorias

#### 1. Adicionar `updateTransaction` ao hook `useCashFlow`
- Nova funcao para atualizar lancamentos existentes no banco

#### 2. Adicionar botoes de Editar/Excluir na `CashFlowTable`
- Coluna "Acoes" com dropdown menu (tres pontinhos) contendo Editar e Excluir
- Dialogo de confirmacao antes de excluir
- Indicar visualmente lancamentos automaticos (vindos de pagamentos via trigger) com icone/tooltip, impedindo exclusao deles para nao quebrar a sincronia

#### 3. Reutilizar `TransactionModal` para edicao
- Aceitar prop opcional `editingTransaction` para pre-preencher o formulario
- Alterar titulo para "Editar Lancamento" quando estiver editando
- Chamar `updateTransaction` em vez de `addTransaction`

#### 4. Melhorias adicionais na secao
- **Filtros na tabela**: adicionar filtro por tipo (Entrada/Saida) e categoria acima da tabela
- **Totalizador na tabela**: linha de rodape com soma das entradas e saidas filtradas
- **Protecao de lancamentos automaticos**: lancamentos com `reference_type = 'appointment'` mostram badge "Automatico" e nao podem ser editados/excluidos (sao geridos pela trigger)

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| `src/hooks/useCashFlow.ts` | Adicionar `updateTransaction` |
| `src/components/financial/CashFlowTable.tsx` | Adicionar coluna Acoes com editar/excluir, filtros, totalizador, badge "Automatico" |
| `src/components/financial/TransactionModal.tsx` | Suportar modo edicao via prop `editingTransaction` |
| `src/pages/Financial.tsx` | Passar callbacks de editar/excluir, estado de edicao, filtros |

