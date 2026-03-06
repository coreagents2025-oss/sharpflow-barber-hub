

## Esclarecimento: Como o email funciona no seu projeto

Quando você configurou o domínio de email via Lovable (`notify.www.barberplus.shop`), o Lovable provisionou automaticamente uma chave Resend (`RESEND_API_KEY`) nos bastidores. Você não precisa gerenciar isso manualmente -- faz parte do Lovable Cloud.

**Custo**: O envio de emails faz parte do uso do Lovable Cloud, com pricing baseado em uso. Há uma quantidade gratuita incluída. Para volumes maiores, o custo é marginal. Consulte a [documentação de pricing do Cloud](https://docs.lovable.dev/features/cloud) para detalhes exatos.

**Observação**: Seu domínio `www.barberplus.shop` ainda está com verificação DNS pendente (status: `initiated`). Até que o DNS seja verificado, os emails não serão enviados. Recomendo concluir a verificação:

<lov-actions>
<lov-open-email-setup>Configurar domínio de email</lov-open-email-setup>
</lov-actions>

---

## Plano: Simplificar Configurações de Email em Settings

A seção atual pede `from_email` e `from_name` (campos de remetente), mas o remetente real é sempre o domínio da plataforma. Vamos trocar por **informações de contato** que aparecem no corpo dos emails.

### Mudanças

**`src/pages/Settings.tsx`**
- Renomear seção de "Configurações de Email" para "Informações de Contato nos Emails"
- Trocar campos `from_email` / `from_name` por: `contact_email`, `contact_phone`, `contact_whatsapp`
- Manter toggle `notifications_enabled`
- Descrição: "Estes dados aparecerão nos emails enviados aos seus clientes"

**Edge Functions** (3 arquivos):
- `send-booking-confirmation/index.ts`
- `send-promotional-email/index.ts`  
- `send-subscription-reminder/index.ts`

Em todos:
- Remetente fixo: `BarberPLUS <noreply@notify.www.barberplus.shop>`
- Ler `contact_email`, `contact_phone`, `contact_whatsapp` de `barbershop_credentials.email_credentials`
- Inserir bloco de contato no rodapé do email:
  ```
  📧 contato@barbearia.com
  📱 (11) 99999-9999
  💬 WhatsApp: (11) 99999-9999
  ```
- Remover lógica que verifica `from_email` para decidir se envia (usar apenas `notifications_enabled`)

### Sem migração de banco
`email_credentials` é JSONB -- a estrutura muda sem alterar schema.

