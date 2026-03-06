

## Plano: CRM Mobile -- Cards compactos + Sheet para detalhes

### Problemas identificados
1. No mobile, o sistema usa **Tabs** para alternar lista/detalhes -- fluxo confuso, requer descobrir a aba "Detalhes"
2. Cards dos leads ainda ocupam muito espaço vertical no mobile
3. Ao clicar num lead no mobile, nada visível acontece (muda aba silenciosamente)

### Solucao

**Abordagem: Sheet (drawer) bottom-up no mobile**
- Ao clicar num lead no mobile, abre um `Sheet` (vaul drawer) de baixo para cima com os detalhes completos
- Remove o sistema de Tabs no mobile -- a lista fica sempre visivel
- Mais intuitivo: toque no card -> detalhes sobem como drawer

### Mudancas

**1. `src/components/crm/LeadCard.tsx` -- Cards ultra-compactos no mobile**
- Usar layout de 1 linha: avatar pequeno (h-8 w-8), nome + status na mesma linha, stats inline
- Remover telefone visivel no card (aparece no drawer)
- Resultado: cada card ocupa ~48px em vez de ~80px

**2. `src/pages/CRM.tsx` -- Mobile: remover Tabs, usar Sheet**
- Remover todo o bloco `if (isMobile)` com Tabs
- No mobile: lista full-height + `Sheet` que abre ao selecionar lead
- Sheet usa `LeadDetailsPanel` dentro
- Metricas colapsáveis no mobile (um `Collapsible` com toggle)
- Aumentar scroll area: `max-h-[calc(100vh-180px)]`

**3. `src/components/crm/LeadDetailsPanel.tsx` -- Sem alteracoes**
- Ja funciona bem como conteudo do Sheet

### Resultado esperado
- Cards ~40% menores no mobile
- Toque no lead -> drawer sobe com detalhes + acoes
- Lista sempre visivel, sem necessidade de navegar entre abas
- Scroll area maximizada

