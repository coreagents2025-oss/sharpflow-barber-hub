
## Problema

O componente `<InstallPWA />` está renderizado globalmente em `App.tsx` (linha 77), **fora de qualquer controle de rota**. Isso faz com que apareça em todas as páginas, incluindo o catálogo público (`/:slug`) onde clientes finais da barbearia navegam.

## Solução

Usar `useLocation()` dentro de `InstallPWA` para detectar se a rota atual é uma **página pública de cliente** e suprimir o banner nesses casos.

### Rotas públicas (sem PWA):
- `/catalogo` — catálogo genérico
- `/:slug` — catálogo da barbearia (rota dinâmica)
- `/:slug/privacidade` — política de privacidade
- `/:slug/termos` — termos de uso
- `/` — landing page (Index, também pública)
- `/services` e `/booking` — páginas públicas

### Rotas que mantém o PWA (painel interno):
- `/pdv`, `/services-management`, `/barbers-management`, etc.
- `/super-admin/*`

### Lógica

A forma mais segura é usar uma **lista de prefixos de rotas internas (protegidas)**. Se a rota atual **não** começa com nenhum desses prefixos, o componente retorna `null`.

```
rotas internas = [
  '/pdv', '/services-management', '/barbers-management',
  '/catalog', '/schedule-management', '/crm', '/messages',
  '/financial', '/subscriptions', '/settings', '/super-admin'
]
```

Qualquer rota fora dessa lista (incluindo `/:slug`) é considerada pública → PWA oculto.

### Arquivo modificado

- **`src/components/InstallPWA.tsx`** — adicionar `useLocation` do `react-router-dom` e verificar se a rota atual está na lista de rotas internas. Se não estiver, retornar `null` antes de qualquer lógica.

```tsx
import { useLocation } from "react-router-dom";

const INTERNAL_ROUTES = [
  '/pdv', '/services-management', '/barbers-management',
  '/catalog', '/schedule-management', '/crm', '/messages',
  '/financial', '/subscriptions', '/settings', '/super-admin'
];

export const InstallPWA: React.FC = () => {
  const location = useLocation();
  const isInternalRoute = INTERNAL_ROUTES.some(r => location.pathname.startsWith(r));
  
  if (!isInternalRoute) return null;
  // ... resto da lógica atual
};
```

### Por que não mudar no App.tsx?

Mover `<InstallPWA />` para dentro das rotas protegidas em `App.tsx` seria mais complexo pois exigiria duplicar o componente em cada `<ProtectedRoute>`. A abordagem via `useLocation` é simples, centralizada e não exige mudança na estrutura de rotas.

### Impacto

- **1 arquivo modificado**: `src/components/InstallPWA.tsx`
- Nenhuma mudança de comportamento para usuários do painel interno
- Clientes no catálogo público nunca verão o banner de instalação
