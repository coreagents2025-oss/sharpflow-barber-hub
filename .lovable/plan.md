
## Goal
Build a **Data Migration Tool** for barbershops onboarding onto BarberPLUS that already have active clients and subscription plans. This tool must allow them to import existing data without disrupting ongoing subscriptions — maintaining credits remaining, expiration dates, and billing cycles exactly as they were.

## How it Works (User Flow)
1. Admin goes to **Settings → Migração de Dados** (new tab)
2. Downloads a CSV template with the correct column structure
3. Fills in their existing clients + subscription data
4. Uploads the file — the tool validates all rows and shows a preview
5. Confirms import — data is inserted into `leads`, `subscription_plans` (if new plan names are detected), `client_subscriptions`, and `subscription_payments`
6. Summary report: X clients imported, X subscriptions created, X errors

## What Gets Imported
The CSV template covers everything in a single file:

| Column | Description |
|---|---|
| `client_name` | Full name of existing client |
| `client_phone` | Phone (required — used to find-or-create lead) |
| `client_email` | Email (optional) |
| `plan_name` | Name of their subscription plan |
| `plan_price` | Monthly price (R$) |
| `billing_interval` | `monthly`, `weekly`, `biweekly` |
| `credits_remaining` | Credits still available this cycle |
| `started_at` | When plan began (dd/MM/yyyy) |
| `expires_at` | When it expires (dd/MM/yyyy) |
| `next_billing_date` | Next charge date (dd/MM/yyyy) |
| `status` | `active`, `expired`, `cancelled` |
| `notes` | Optional notes |

## Key Design Decisions
- **No new DB tables needed** — uses existing `leads`, `subscription_plans`, `client_subscriptions`
- **Plan deduplication**: If two rows share the same `plan_name` + `plan_price`, only one plan record is created and reused
- **Lead deduplication**: Uses existing `find_or_create_lead` RPC — won't duplicate existing clients
- **Preserves original dates**: `started_at`, `expires_at`, `next_billing_date` are taken directly from the CSV — this is the core requirement
- **Dry run preview**: Before committing, user sees a table with parsed data and any validation errors per row
- **Partial import**: Rows with errors are skipped; valid rows proceed. A final summary lists all issues

## Files to Create/Edit

| File | Action |
|---|---|
| `src/components/subscriptions/MigrationImportTab.tsx` | Main migration UI — upload, preview, import |
| `src/pages/SubscriptionsManagement.tsx` | Add "Migração" tab to existing page |

## UI Structure (MigrationImportTab)

```text
┌─────────────────────────────────────────────────────┐
│  Importação em Massa de Assinantes                  │
│                                                     │
│  [Download Template CSV]                            │
│                                                     │
│  [Drop CSV here or click to upload]                 │
│                                                     │
│  ─────────── Preview ───────────                    │
│  ✅ 12 clientes válidos                             │
│  ⚠️  2 linhas com erro (mostrar detalhes)           │
│                                                     │
│  [Table: name | phone | plan | credits | expires]   │
│  row 3: ❌ expires_at inválida                      │
│                                                     │
│  [Cancelar]  [Importar 12 Registros]                │
└─────────────────────────────────────────────────────┘
```

## Implementation Detail
- CSV parsing: native `FileReader` + manual split (no extra deps needed)
- Date parsing: `date-fns/parse` with `dd/MM/yyyy` format (already installed)
- Import logic in `handleImport()`:
  1. Deduplicate plan names → `createPlan` for new ones, match existing by name
  2. For each valid row: call `find_or_create_lead` RPC → insert into `client_subscriptions` with exact dates from CSV
  3. Collect results, show final summary toast
- All Supabase calls use the existing client with RLS — admin-only access guaranteed
