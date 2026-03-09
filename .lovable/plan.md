
## Situação atual — diagnóstico completo

### O que funciona ✅
- `RESEND_API_KEY` configurado nos secrets
- `send-subscription-email` com lógica correta (`=== false`)
- `barbershop_credentials` da barbearia com `notifications_enabled: true`, `from_email` e `from_name` configurados
- `invite-client` Edge Function deployada e funcional
- 2 assinaturas ativas com emails: `agentedonarosa@gmail.com` e `teste@barberplus.shop`

### O problema que persiste ⚠️
O domínio `notify.www.barberplus.shop` está com **status `initiated` (Pending)** — isso significa que o DNS **ainda não foi verificado pela plataforma**, mesmo que você diga que foi feito no provedor.

Isso afeta diretamente:
- **Emails de autenticação** (convite, recuperação de senha) — bloqueados pelo `auth-email-hook` que depende do domínio verificado
- O `send-subscription-email` usa Resend diretamente e **pode** já estar funcionando, mas o remetente `noreply@notify.www.barberplus.shop` pode ser rejeitado pelo Resend se o domínio não estiver verificado lá também

### Por que o DNS pode não estar sendo reconhecido

Existem **duas verificações separadas** necessárias:

1. **Lovable Platform** — verificação do domínio no sistema de email da plataforma (ainda pendente)
2. **Resend** — os registros SPF/DKIM precisam apontar para os servidores do Resend (não apenas para o servidor do app)

Os registros DNS que precisam ser criados no provedor (ex: Cloudflare, Registro.br) são fornecidos pela plataforma e têm formato específico do Resend. Abrir o painel de email vai mostrar exatamente quais registros estão pendentes vs verificados.

### Ação necessária — abrir o painel de email

Para ver quais registros específicos (SPF, DKIM, DMARC) ainda estão pendentes e quais valores exatos precisam ser inseridos no seu provedor de domínio:
