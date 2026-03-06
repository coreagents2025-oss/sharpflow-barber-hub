
## Diagnóstico completo

### O que o usuário fez
O usuário configurou o email direto pelo painel do Lovable (Cloud → Email), sem criar conta no Resend. Isso significa que o Lovable gerencia a entrega via **`LOVABLE_API_KEY`** — que já está disponível como secret.

### O problema atual
Todas as edge functions de email do projeto (incluindo `send-subscription-email`, `send-booking-confirmation`, `send-promotional-email`, `send-subscription-reminder`) estão usando **`RESEND_API_KEY`** diretamente com o SDK do Resend. Isso é errado para integração via Lovable Cloud.

Quando o email é configurado pelo Lovable (não pelo Resend diretamente), o envio deve ser feito via **API REST do Lovable** usando o `LOVABLE_API_KEY` + endpoint `https://api.lovable.dev/projects/{project_id}/email/send`.

Há também outro problema: o domínio configurado é `notify.www.barberplus.shop` (status: `initiated`/pendente). Esse subdomínio duplo é problemático. O correto seria `notify.barberplus.shop`.

### Status atual dos secrets
- `LOVABLE_API_KEY` — disponível ✅
- `RESEND_API_KEY` — disponível mas **provavelmente inválida/desnecessária** ❌

### Mudanças necessárias

**Todas as 4 edge functions** precisam trocar o mecanismo de envio:

- `supabase/functions/send-subscription-email/index.ts`
- `supabase/functions/send-booking-confirmation/index.ts`
- `supabase/functions/send-promotional-email/index.ts`
- `supabase/functions/send-subscription-reminder/index.ts`

**Em cada função:**
- Remover a dependência do `RESEND_API_KEY` e do SDK `resend@2.0.0`
- Usar `LOVABLE_API_KEY` com chamada REST direta ao endpoint de email do Lovable
- Manter exatamente os mesmos templates HTML e lógica de negócio
- Remetente: `noreply@notify.www.barberplus.shop` (ou ajustar para `notify.barberplus.shop` após reconfigurar o domínio)

**Novo padrão de envio (substituição do SDK Resend):**
```ts
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
const projectId = Deno.env.get("VITE_SUPABASE_PROJECT_ID") || "jgpffcjktwsohfyljtsg";

const res = await fetch(`https://api.lovable.dev/projects/${projectId}/email/send`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${lovableApiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ from, to, subject, html }),
});
```

### Sobre o DNS do Hostinger

O domínio `notify.www.barberplus.shop` está com status **`initiated`** (pendente). Os registros que aparecem na imagem do Hostinger (`ns6.lovable.cloud`) são para o **custom domain do app**, não para email.

O Lovable Cloud Email precisa de registros **TXT e CNAME** específicos que aparecem em **Configurações → Email** do projeto. O usuário deve:
1. Abrir o painel de Email do Lovable (botão abaixo)
2. Copiar os registros DNS exatos mostrados ali
3. Adicionar no Hostinger como **TXT** e **CNAME** (ambos suportados pelo Hostinger ✅)

### Resumo do plano
1. Atualizar as 4 edge functions para usar `LOVABLE_API_KEY` via API REST (sem Resend SDK)
2. Manter todos os templates, lógica e remetente inalterados
3. Orientar sobre os registros DNS corretos via painel de Email
