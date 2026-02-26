

## Plano: PWA Completa para BarberPLUS (Android + iOS)

### Situacao Atual
- Nenhum manifest, service worker ou configuracao PWA existe no projeto
- Favicon aponta para URL externa (Google Storage)
- Logo da marca esta em URL externa: `storage.googleapis.com/...Black and White Modern Barbershop Logo`
- Projeto usa Vite sem plugin PWA
- Cores da marca: preto (#171717) e dourado/accent (#E8930C)

---

### Arquivos a Criar/Modificar

#### 1. Instalar dependencia: `vite-plugin-pwa`
Adicionar `vite-plugin-pwa` e `workbox-window` ao projeto.

#### 2. `public/manifest.webmanifest` (CRIAR)
```json
{
  "name": "BarberPLUS - Gestao Completa para Barbearias",
  "short_name": "BarberPLUS",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#171717",
  "theme_color": "#171717",
  "categories": ["business", "productivity"],
  "prefer_related_applications": false,
  "id": "/?app-id=barberplus-pwa",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/apple-touch-icon-180.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

#### 3. Icones PNG (CRIAR em `public/icons/`)
Como nao temos acesso a ferramentas de geracao de imagem neste modo, criaremos icones SVG inline convertidos para PNG usando canvas no build, OU usaremos a imagem da logo que ja esta no projeto como referencia.

**Abordagem pratica**: Criar um script/componente que gera os icones a partir de um SVG da marca (a tesoura + texto "BarberPLUS"), ou usar icones PNG placeholder com a cor da marca que o usuario pode substituir depois.

Os arquivos necessarios:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/maskable-192.png`
- `public/icons/maskable-512.png`
- `public/icons/apple-touch-icon-180.png`

**Nota importante**: Vou criar icones SVG que serao referenciados, mas o usuario devera gerar os PNGs a partir da logo real da marca. Incluirei instrucoes claras.

#### 4. `vite.config.ts` (MODIFICAR)
Adicionar `VitePWA` plugin com:
- Manifest inline (ou link para o webmanifest)
- Workbox config com `navigateFallbackDenylist: [/^\/~oauth/]`
- Estrategia NetworkFirst para navegacao
- StaleWhileRevalidate para assets

#### 5. `index.html` (MODIFICAR)
Adicionar no `<head>`:
- `<link rel="manifest" href="/manifest.webmanifest">`
- `<meta name="theme-color" content="#171717">`
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `<meta name="apple-mobile-web-app-title" content="BarberPLUS">`
- `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">`

#### 6. `public/offline.html` (CRIAR)
Pagina offline simples com a marca BarberPLUS, informando que o usuario esta sem conexao.

#### 7. `src/components/InstallPWA.tsx` (CRIAR)
Componente com:
- **Android**: Captura `beforeinstallprompt`, mostra botao "Instalar App"
- **iOS**: Detecta Safari iOS, mostra instrucoes "Toque em Compartilhar > Adicionar a Tela de Inicio"
- Banner discreto (toast/banner fixo no bottom) que aparece apenas 1x (localStorage)

#### 8. `src/App.tsx` (MODIFICAR)
Importar e renderizar `<InstallPWA />` dentro do layout.

#### 9. `src/main.tsx` (MODIFICAR)
Registrar o service worker gerado pelo vite-plugin-pwa.

---

### Detalhes Tecnicos

**Service Worker (via vite-plugin-pwa + Workbox)**:
- `registerType: 'autoUpdate'` - atualiza automaticamente
- Runtime caching:
  - Navegacao: NetworkFirst (fallback offline.html)
  - JS/CSS: StaleWhileRevalidate
  - Imagens: CacheFirst com expiracao de 30 dias
- `navigateFallbackDenylist: [/^\/~oauth/]` - nunca cachear OAuth
- `skipWaiting: true`, `clientsClaim: true`

**Icones - Acao do usuario necessaria**:
O usuario precisara gerar os PNGs a partir da logo real. Vou criar placeholders funcionais e instrucoes. Alternativa: posso usar a URL externa da logo existente para baixar e processar, mas como sao arquivos estaticos PNG, o ideal e o usuario fornecer os arquivos.

**Cores do tema**:
- `theme_color`: `#171717` (--primary, preto da marca)
- `background_color`: `#171717`

---

### Checklist de Validacao (pos-implementacao)

- [ ] GET /manifest.webmanifest retorna 200 e content-type correto
- [ ] GET /icons/icon-192.png retorna 200
- [ ] GET /icons/icon-512.png retorna 200
- [ ] GET /icons/maskable-192.png retorna 200
- [ ] GET /icons/maskable-512.png retorna 200
- [ ] GET /icons/apple-touch-icon-180.png retorna 200
- [ ] Service Worker registrado e "controlled" no DevTools
- [ ] start_url "/?source=pwa" abre 200 apos refresh
- [ ] Android: instala, abre standalone e aparece no launcher
- [ ] iOS: adiciona a Tela de Inicio, abre standalone e icone e o da marca

