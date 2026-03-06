

## Plano: Adicionar formulário de cadastro de novo lead no AddSubscriberDialog

### Problema
O dialog atual só permite buscar leads existentes. O usuário quer poder cadastrar um novo cliente diretamente ali, sem precisar ir ao CRM antes. Além disso, há um bug no `handleConfirm` -- o `billing_method` do plano pode não existir no tipo `SubscriptionPlan`, causando erro ao inserir o payment.

### Mudanças

**1. `src/components/subscriptions/AddSubscriberDialog.tsx` -- Adicionar step de cadastro**

- Adicionar novo step `'new-lead'` ao fluxo (lead → new-lead → plan)
- Na tela de busca de leads, adicionar botão "Cadastrar novo cliente" abaixo da lista
- Step `new-lead`: formulário com campos Nome completo, Telefone, Email (opcional)
- Ao submeter, usar a função `find_or_create_lead` do banco (já existe) para criar o lead
- Após criação, selecionar automaticamente o lead e ir para step `plan`
- Corrigir bug no `handleConfirm`: o `billing_method` referenciado como `plan.billing_method` pode ser undefined -- usar fallback `'pix'`
- Corrigir lógica do payment: buscar o `subscription_id` de forma mais robusta (usar o retorno do insert em vez de query separada)

### Resultado
- Botão "Cadastrar novo cliente" visível na tela de busca
- Formulário limpo com nome, telefone e email
- Usa `find_or_create_lead` (evita duplicatas por telefone)
- Fluxo: busca OU cadastra → seleciona plano → confirma

