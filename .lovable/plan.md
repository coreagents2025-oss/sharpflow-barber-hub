

## Problema identificado

O PWA está configurado com `navigateFallback: "/offline.html"`, o que significa que **qualquer navegação offline mostra a página estática de "Sem conexão"** em vez de carregar o app cacheado. Além disso, o `main.tsx` registra manualmente o service worker (`/sw.js`), conflitando com o registro automático do `vite-plugin-pwa`.

## Correções

### 1. Alterar `navigateFallback` para `/index.html` (vite.config.ts)
- Trocar `"/offline.html"` por `"/index.html"` para que o service worker sirva o shell do app (SPA) quando offline
- Adicionar `"/index.html"` e `"/offline.html"` ao `globPatterns` para garantir que sejam pré-cacheados

### 2. Remover registro manual do SW (main.tsx)
- O `vite-plugin-pwa` com `registerType: "autoUpdate"` já gera e registra o service worker automaticamente
- O registro manual de `/sw.js` conflita e pode impedir o cache correto

### 3. Adicionar `globPatterns` para pré-cachear os assets do app (vite.config.ts)
- Incluir `*.html`, `*.js`, `*.css`, e ícones no precache do workbox para que o app funcione offline de verdade

### Resultado esperado
- App carrega normalmente mesmo sem internet (usando cache do SPA)
- A página `offline.html` só apareceria se o cache do index.html falhasse (cenário extremo)

