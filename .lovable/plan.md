

## Problema: PWA abre offline mesmo com internet

### Causa raiz

Existem **dois problemas** na configuração atual:

1. **Service Worker nao esta sendo registrado**: O `vite-plugin-pwa` com `registerType: "autoUpdate"` precisa que o registro do SW seja injetado no app. Por padrao, o plugin usa `injectRegister: "auto"` que injeta um script no HTML. Porem, como `manifest: false` esta configurado (manifest externo), o plugin pode nao estar injetando corretamente. Sem registro explícito, o SW nao e ativado e o cache nunca e populado.

2. **Conflito no runtime caching de navegacao**: A regra de runtime caching para `request.mode === "navigate"` com `NetworkFirst` **intercepta as requisicoes de navegacao antes do `navigateFallback` do precache**. Na primeira abertura apos instalar (quando o cache ainda esta vazio), o NetworkFirst tenta a rede, e se houver qualquer lentidao ou falha, retorna erro em vez de servir o app do precache.

### Correcoes

#### 1. Registrar o SW explicitamente no `main.tsx`
Importar `registerSW` do modulo virtual `virtual:pwa-register` para garantir que o service worker seja registrado e atualizado automaticamente.

#### 2. Remover a regra de runtime cache para navegacao no `vite.config.ts`
A regra `request.mode === "navigate"` com `NetworkFirst` conflita com o `navigateFallback` do precache. O Workbox precache ja cuida da navegacao via `navigateFallback: "/index.html"`. Remover essa regra evita que o runtime cache intercepte e cause falhas.

#### 3. Adicionar regra de runtime cache para chamadas API (Supabase)
Manter cache das chamadas API com `NetworkFirst` para que dados carreguem mesmo com conexao instavel.

### Arquivos alterados

| Arquivo | Acao |
|---|---|
| `src/main.tsx` | Adicionar `import { registerSW } from 'virtual:pwa-register'` e chamar `registerSW()` |
| `src/vite-env.d.ts` | Adicionar type reference para `vite-plugin-pwa/client` |
| `vite.config.ts` | Remover regra de runtime cache para navegacao, adicionar regra para API do Supabase, adicionar `injectRegister: null` (registro manual) |

### Resultado esperado
- SW registrado corretamente na primeira visita
- Assets pre-cacheados incluindo `index.html`
- App abre normalmente apos instalacao do PWA, mesmo com conexao lenta
- Navegacao offline funciona servindo o shell do SPA do precache

