

## Plano: Compactar filtros + reduzir cards + maximizar rolagem

O problema atual: os filtros ocupam muito espaço vertical (busca + label + 10 botões em flex-wrap) e os cards são grandes (p-5, avatar 14x14). Isso reduz drasticamente a area de scroll dos leads.

### Mudanças

**1. `src/components/crm/LeadsFilters.tsx` — Filtros compactos e responsivos**
- Colocar busca e filtro de status **na mesma linha** no desktop (flex-row)
- Trocar os 10 botões de filtro por um **Select/dropdown** (`@radix-ui/react-select`) com todas as opções — economiza ~60px de altura
- No mobile: busca em cima, select embaixo (stack vertical), ambos compactos
- Remover o label "Filtrar por status" (o select já tem placeholder)
- Padding reduzido: `p-3` em vez de `p-4`, `space-y-2` em vez de `space-y-4`

```text
Desktop:  [🔍 Buscar...____________] [▼ Filtrar: Todos    ]
Mobile:   [🔍 Buscar...____________]
          [▼ Filtrar: Todos         ]
```

**2. `src/components/crm/LeadCard.tsx` — Cards menores**
- Padding: `p-5` → `p-3`
- Avatar: `h-14 w-14` → `h-10 w-10`
- Gap: `gap-4` → `gap-3`
- Nome: `text-base` → `text-sm`
- Phone margin: `mb-3` → `mb-1.5`
- Stats icons: `h-4 w-4` → `h-3.5 w-3.5`, text `text-sm` → `text-xs`, gap `gap-4` → `gap-3`

**3. `src/components/crm/LeadMetrics.tsx` — Métricas mais compactas**
- Reduzir padding interno dos cards de métricas
- Valor: `text-2xl` → `text-xl`

**4. `src/pages/CRM.tsx` — Mais espaço vertical**
- Reduzir `py-6` → `py-4`, `mb-6` (header e metrics) → `mb-4`
- Aumentar altura do grid: `h-[calc(100vh-240px)]` → `h-[calc(100vh-200px)]`
- Mobile: `max-h-[calc(100vh-400px)]` → `max-h-[calc(100vh-320px)]`

**5. `src/components/crm/LeadsList.tsx` — Reduzir gap entre cards**
- `space-y-3` → `space-y-2`, padding `p-4` → `p-2`

### Resultado esperado
- Filtros ocupam ~48px (1 linha) em vez de ~120px (3 linhas)
- Cards ~30% menores verticalmente
- Área de scroll ganha ~150-200px extras

