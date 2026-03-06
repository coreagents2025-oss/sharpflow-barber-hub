
## Understanding the full scope

The user wants 3 things:
1. **Automated recurring email** to remind subscriber clients about plan expiration — needs a new Edge Function + pg_cron job
2. **Rename the project** from "BarberPro" to "barber-plus-shop" — update `index.html`, `manifest.webmanifest`
3. **Barbershop-specific emails** should clearly show which barbershop sent it — update both `send-booking-confirmation` and `send-promotional-email` edge functions, plus the new reminder function

### Key architecture findings:
- `client_subscriptions` has `expires_at`, `next_billing_date`, `status`, `lead_id`, `client_id`, `barbershop_id`
- `leads` table has `email`, `full_name`, `phone` — this is the primary client store (most clients are leads without auth accounts)
- `subscription_payments` has `status='pending'` for unpaid dues
- Resend is already configured (`RESEND_API_KEY` secret exists) and used in `send-booking-confirmation` and `send-promotional-email`
- `barbershop_credentials` stores `email_credentials` with `from_email`, `from_name`, `notifications_enabled`
- `public_barbershops` view has `name`, `logo_url`, `phone`

### Email reminder logic:
- Find subscriptions where `expires_at` is in 3 days OR `next_billing_date` is in 3 days
- Get client email from either `leads.email` (via `lead_id`) or `auth.users` (via `client_id`)
- Send branded email with barbershop name clearly stated
- This needs a pg_cron job to run daily

### For barbershop-specific emails:
- `send-booking-confirmation`: already shows barbershop name in body — needs to make it MORE prominent in subject and header
- `send-promotional-email`: same improvement

---

## Plan

### 1. New Edge Function: `send-subscription-reminder`
Location: `supabase/functions/send-subscription-reminder/index.ts`

Logic:
1. Query `client_subscriptions` where `status = 'active'` AND (`expires_at` BETWEEN now() AND now()+3 days OR `next_billing_date` BETWEEN now() AND now()+3 days)
2. For each subscription, get:
   - Barbershop name + logo from `public_barbershops` (via `barbershop_id`)
   - Client email from `leads.email` (via `lead_id`) OR auth user email (via `client_id`)
   - Plan name from `services.name` (via `service_id`)
   - Barbershop `email_credentials` from `barbershop_credentials` (for `from_email`)
3. Send email via Resend with branded HTML template
4. `verify_jwt = false` in config.toml (called by cron, no JWT)

### 2. pg_cron job (via supabase insert tool, not migration)
Run daily at 9am: invoke `send-subscription-reminder`

### 3. Update email templates for barbershop clarity
Update `send-booking-confirmation/index.ts`:
- Subject line: `Agendamento Confirmado — {barbershop.name}` (already does this ✓)  
- Email header: display barbershop name prominently (enhance visual emphasis)
- Footer: add "Este email foi enviado pela **{barbershop.name}** via BarberPLUS"

Update `send-promotional-email/index.ts`:
- Same footer enhancement

### 4. Rename project
- `index.html`: title, meta tags → "BarberPLUS - Gestão Completa para Barbearias"
- `manifest.webmanifest`: `name` → "BarberPLUS", `short_name` → "BarberPLUS"

### 5. Auth email templates: add barbershop context note
The auth templates (signup, invite, etc.) are platform-level, not barbershop-specific — they correctly use the platform name "BarberPLUS". The CLIENT-specific auth emails (via `/:slug/cliente`) don't go through the auth-email-hook differently. So for auth emails the current templates are correct. No changes needed there.

---

## Files to create/edit:

| File | Action |
|---|---|
| `supabase/functions/send-subscription-reminder/index.ts` | CREATE — new reminder edge function |
| `supabase/config.toml` | EDIT — add `verify_jwt = false` for new function |
| `supabase/functions/send-booking-confirmation/index.ts` | EDIT — improve barbershop branding |
| `supabase/functions/send-promotional-email/index.ts` | EDIT — improve barbershop branding |
| `index.html` | EDIT — rename to BarberPLUS |
| `public/manifest.webmanifest` | EDIT — rename to BarberPLUS |

The cron job SQL will be run via the supabase insert tool (not a migration, contains project-specific URL and anon key).

---

## Email template design for reminder

```
✂️ BarberPLUS
─────────────────────────
📍 Barbearia: [NOME DA BARBEARIA]  ← PROMINENT
─────────────────────────
Olá [NOME DO CLIENTE]!

Seu plano [NOME DO PLANO] vence em 3 dias.
Data de vencimento: [DATA]

[BOTÃO: Renovar Plano]

─────────────────────────
Este email foi enviado pela [NOME DA BARBEARIA]
gerenciado via BarberPLUS
```

The "from" address will use the barbershop's configured `from_email` in `barbershop_credentials.email_credentials`. If not configured, skip that barbershop (same behavior as existing functions).

---

## Concerns/edge cases handled:
- Client with only `lead_id` (no auth account): get email from `leads.email`
- Client with `client_id` (auth account): get email from `auth.users` via admin API
- Barbershop with notifications disabled: skip
- No `from_email` configured: skip (consistent with existing behavior)
- Already sent today: no dedup logic needed — cron runs once/day and the 3-day window is specific enough
