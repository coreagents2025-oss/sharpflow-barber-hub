
## Diagnóstico do Loop

**Fluxo que causa o loop:**
1. Cliente está logado no dashboard (`/:slug/cliente/dashboard`)
2. Vai para o catálogo público (`/:slug`) e clica em "Assinar agora" em um plano
3. O botão do `SubscriptionPlanCard` navega para `/:slug/cliente`
4. A rota `/:slug/cliente` renderiza `ClientAuth`, que tem um `useEffect` na linha 50-56:
   ```typescript
   if (!authLoading && user && userRole === 'client') {
     navigate(`/${slug}/cliente/dashboard`, { replace: true });
   }
   ```
5. Isso redireciona de volta para o dashboard → **o cliente nunca consegue ver o formulário de assinatura**

**Raiz do problema:** O `SubscriptionPlanCard` direciona todos os clientes (logados ou não) para `/:slug/cliente`, que é a **tela de login** — mas clientes já logados são imediatamente bounced de volta para o dashboard por esse guard redirect.

---

## Solução

### 1. `SubscriptionPlanCard.tsx` — detectar se usuário está logado

Transformar de um simples `<Link>` estático para um componente inteligente:
- Se o usuário **não está logado**: continua indo para `/:slug/cliente` (login/cadastro) — comportamento atual correto
- Se o usuário **está logado como client**: vai direto para `/:slug/cliente/dashboard` — pula a tela de login redundante

```typescript
// Importar useAuth e ajustar destino dinamicamente
const { user, userRole } = useAuth();
const destination = (user && userRole === 'client')
  ? `/${slug}/cliente/dashboard`
  : `/${slug}/cliente`;
```

### 2. `ClientAuth.tsx` — preservar contexto de "vem do catálogo"

Atualmente o redirect do `ClientAuth` ao fazer login vai sempre para `/:slug/cliente/dashboard` sem nenhuma mensagem contextual. Melhoria pequena opcional: nada muda aqui se o `SubscriptionPlanCard` já redirecionar corretamente.

---

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/components/SubscriptionPlanCard.tsx` | Importar `useAuth`, calcular destino dinamicamente: logado → dashboard, deslogado → login |

Apenas **1 arquivo** muda. Nenhuma lógica de rota ou guarda precisa ser alterada.

---

## Diagrama do fluxo corrigido

```text
Cliente logado clica "Assinar agora"
         ↓
  useAuth() detecta user+role='client'
         ↓
  Link → /:slug/cliente/dashboard   ✓ (vai direto, sem loop)

Cliente deslogado clica "Assinar agora"
         ↓
  useAuth() → user=null
         ↓
  Link → /:slug/cliente             ✓ (tela de login, comportamento correto)
```
