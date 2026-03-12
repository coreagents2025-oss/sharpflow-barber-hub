
## Layout: Mover planos de assinatura para depois dos serviços + card compacto

### Situação atual
A seção de "Planos de Assinatura" aparece **antes** dos serviços no `PublicCatalog.tsx` (linha 239-264), com cards grandes usando grid de 3 colunas e muito espaço interno (`p-5`, ícone grande, preço `text-3xl`).

### O que será feito

**1. `src/pages/PublicCatalog.tsx`** — reordenar seções
- Mover o bloco `{/* Subscription Plans Section */}` para **depois** da seção de serviços
- Reduzir o título para `text-xl` e deixar a seção mais discreta

**2. `src/components/SubscriptionPlanCard.tsx`** — card menor, layout horizontal
- Layout horizontal compacto: ícone + nome + preço à esquerda, botão "Assinar" à direita
- Remover o ícone grande (`h-10 w-10`) → ícone pequeno inline
- Preço de `text-3xl` → `text-xl font-bold`
- Padding interno de `p-5` → `p-3`
- Gradiente top de `h-1` → manter (identificação visual)
- Grid de planos: `grid-cols-1 sm:grid-cols-2` com `gap-3` (em vez de `gap-6`)
- Resultado: card de ~72px de altura vs ~200px atual

### Layout resultante no catálogo:
```text
[ Hero ]
[ Info da barbearia ]
[ Banner Área do Assinante ]

[ Nossos Serviços ]       ← primeiro
  [serviço] [serviço] [serviço]

[ Planos de Assinatura ]  ← depois, compacto
  [plano compacto] [plano compacto]

[ Footer ]
```

**Arquivos a modificar:** `src/pages/PublicCatalog.tsx` e `src/components/SubscriptionPlanCard.tsx`
