
## Problema identificado

O e-mail de boas-vindas enviado ao assinante (`type === "welcome"`) tem dois problemas:

1. **Logo não aparece**: A função busca `logo_url` da view `public_barbershops`, que SIM expõe `logo_url`. Porém o campo pode ser `null` (barbearia sem logo cadastrado), e nesse caso só aparece um emoji `✂️` — que em muitos clientes de e-mail não é renderizado como imagem/bloco visual adequado.

2. **Nenhum link/instrução para o portal do cliente**: O e-mail não informa onde o assinante pode acessar sua área (dashboard de assinante em `/:slug/cliente`), nem fornece um botão de acesso direto. O cliente recebe a confirmação de assinatura mas não sabe como acessar a plataforma.

## O que será corrigido

### 1. Buscar `slug` da barbearia

A view `public_barbershops` já expõe o campo `slug`. A query na edge function precisa incluir `slug` na seleção:

```typescript
// Antes
.select("id, name, logo_url, phone")

// Depois
.select("id, name, logo_url, phone, slug")
```

O mesmo ajuste precisa ser feito na função `buildWelcomeEmail` (e outras onde fizer sentido) para receber `slug`.

### 2. Adicionar bloco de acesso ao portal no e-mail de boas-vindas

No `buildWelcomeEmail`, logo após o bloco de detalhes do plano, adicionar:

- Um botão **"Acessar Minha Área"** que aponta para `https://sharpflow-barber-hub.lovable.app/:slug/cliente`
- Uma linha de texto explicativa: "Acesse sua área exclusiva para acompanhar seus créditos e benefícios"

### 3. Melhorar o fallback quando não há logo

Quando `logo_url` é nulo, melhorar o bloco visual usando as iniciais do nome da barbearia em vez do emoji, tornando-o mais profissional e compatível com clientes de e-mail.

### 4. Adicionar link de acesso também no e-mail de renovação e pagamento confirmado

Os e-mails de renovação (`renewal`) e pagamento confirmado (`payment_confirmed`) também se beneficiam de ter o botão de acesso ao portal, pois o cliente pode querer verificar seus créditos atualizados.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/send-subscription-email/index.ts` | Adicionar `slug` na query, passar para as funções de build, adicionar botão de acesso + fallback de logo melhorado |

## Como ficará o e-mail de boas-vindas

```
┌─────────────────────────────────────────┐
│ ✂️ BarberPLUS (barra preta topo)         │
├─────────────────────────────────────────┤
│ [LOGO ou INICIAIS] (fundo amber)         │
│ Mensagem de: NOME DA BARBEARIA           │
├─────────────────────────────────────────┤
│ 🎉 Bem-vindo ao plano [PLANO]!           │
│                                          │
│ Olá, [NOME]!                             │
│ Sua assinatura foi criada com sucesso.   │
│                                          │
│ ┌──────────────────────────────────┐    │
│ │ Seu Plano                        │    │
│ │ 📋 Plano: [nome]                 │    │
│ │ 💰 Valor: R$ XX,XX               │    │
│ │ 🎫 Créditos: X por ciclo         │    │
│ │ 📅 Válido até: XX de XXX de XXXX │    │
│ └──────────────────────────────────┘    │
│                                          │
│ ┌──────────────────────────────────┐    │
│ │      [ Acessar Minha Área ]      │    │  ← NOVO botão
│ └──────────────────────────────────┘    │
│ "Acesse sua área para ver créditos..."  │  ← NOVA frase
│                                          │
│ [contatos da barbearia se houver]        │
├─────────────────────────────────────────┤
│ Este email foi enviado por [BARBEARIA]  │
│ gerenciado via ✂️ BarberPLUS             │
└─────────────────────────────────────────┘
```

Nenhuma mudança de banco necessária. A função já tem acesso ao `slug` via `public_barbershops`.
