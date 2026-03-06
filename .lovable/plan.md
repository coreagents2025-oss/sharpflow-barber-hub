

## Plano: Melhorar template CSV de migração + data de início no formulário manual

### Problemas atuais
1. Template CSV é básico -- colunas em inglês, sem instruções, difícil para barbeiro leigo
2. `SellSubscriptionDialog` não permite definir data de início (usa `now()` automaticamente)
3. Planilha não inclui método de cobrança (`billing_method`) nem auto-renovação

### Mudanças

**1. `src/components/subscriptions/MigrationImportTab.tsx` -- Template CSV profissional**

- Renomear colunas para português amigável no template: `nome_cliente`, `telefone`, `email`, `nome_plano`, `preco`, `recorrencia`, `metodo_cobranca`, `creditos_restantes`, `data_inicio`, `data_vencimento`, `proxima_cobranca`, `renovacao_auto`, `status`, `observacoes`
- Adicionar uma **seção de instruções** visível na UI (Card com lista de regras: formato de data, valores aceitos para recorrência/status/método)
- Manter mapeamento interno para as mesmas chaves do banco
- Adicionar coluna `metodo_cobranca` (pix/card/boleto/cash) e `renovacao_auto` (sim/nao) ao parse
- Template exemplo com 3 linhas variadas mostrando diferentes combinações
- Validação atualizada para os novos campos

**2. `src/components/subscriptions/SellSubscriptionDialog.tsx` -- Campo de data de início**

- Adicionar um `Popover` + `Calendar` (DatePicker) para o campo "Data de início da assinatura"
- Default: hoje (`new Date()`)
- Permitir selecionar data passada (para migrações manuais) ou futura
- Passar a data selecionada no `onConfirm` callback (alterar assinatura para `onConfirm: (planId: string, startDate: Date) => Promise<boolean>`)

**3. `src/hooks/useLeadSubscription.ts`** (se necessário)
- Ajustar a função que cria assinatura para aceitar `startDate` opcional e calcular `expires_at` / `next_billing_date` baseado nela

### Resultado
- Barbeiro baixa planilha organizada em português com instruções claras
- Formulário manual permite definir data retroativa de início
- Mais campos na planilha para importação completa

