# QuickBooks Online connection

Status: **built, not yet live.** Hidden in every deployment until the `QUICKBOOKS_*` keys are set (see `.env.example`). Design approved by the owner on 2026-11-28 (`reports/QuickBooks Online - design - 2026-11-28/`), included on every plan.

## What it does

One way, Altair to QuickBooks: customers (on first use), price book items (on first use), invoices (once they leave draft; edits and voids follow) and payments (manual and card). Altair never edits or deletes a record somebody made in QuickBooks.

## How it fits together

| Piece | File |
| --- | --- |
| Tables, queue trigger | `supabase/migrations/222_quickbooks_online_connection.sql` |
| Engine (order, duplicates, money checks) | `lib/accounting/engine.ts` |
| Request bodies, error classes | `lib/accounting/quickbooks/payloads.ts`, `errors.ts` |
| Intuit API, sign-in, keys | `lib/accounting/quickbooks/http-api.ts`, `oauth.ts`, `oauth-state.ts`, `lib/accounting/connection.ts` |
| Store, runner, setup, panel | `lib/accounting/store.ts`, `run.ts`, `setup.ts`, `panel.ts` |
| Actions and routes | `app/actions/quickbooks.ts`, `app/api/integrations/quickbooks/callback`, `app/api/cron/accounting-sync` |
| Screens | `shared/components/settings/integrations/QuickBooksPanel.tsx`, `QuickBooksSetupForm.tsx`, `app/(admin)/settings/integrations/quickbooks`, `shared/components/invoices/InvoiceQuickBooksLabel.tsx` |

- **Queueing** is done by the database: a trigger on invoices, invoice payments, customers and service items writes a pending row for a company with an active connection. No mutation path can forget it (the Stripe webhook and the overdue sweep included).
- **Sending** happens right after send, edit, void, manual payment and Stripe card payment (`scheduleAccountingSync`, via `after()`), from the owner's "Send waiting records now", and from the daily job, which also refreshes quiet connections before Intuit's 100-day limit. One sender per company (`sync_lock_until`).
- **Money is never changed quietly.** After an invoice is written, QuickBooks' total is compared with Altair's. A difference (sales tax, almost always) goes to the owner's "Needs attention" list with both numbers.
- **Keys** are AES-256-GCM encrypted with the integrations key, refreshed one at a time, and deleted at disconnect together with every sync record (Intuit's developer terms, in force 2026-12-12).

## Checks

- `npm run verify:quickbooks`: the real engine against a practice QuickBooks that enforces Intuit's rules (unique names, SyncTokens, its own sales tax, idempotency keys). Part of `verify:all`.
- `scripts/verify-integration-migrations.mjs` holds migration 222 to the tenant, secret-table and reviewed-function rules.

## Before real customers

1. The owner opens the Intuit developer account and app (legal terms are his).
2. Sandbox keys into the environment; connect Intuit's free test company and run every case: new and existing customers, edits, voids, partial payments, Automated Sales Tax (Intuit's documents contradict each other on whether it keeps the tax an app sends), disconnect and reconnect.
3. Production questionnaire (the owner submits), production keys, then the website and FAQ say "works with QuickBooks Online" and `quickbooks_online` leaves `PLANNED_INTEGRATIONS` and `shared/lib/site/not-yet.ts`.

## Not in version 1

Nothing comes back from QuickBooks. Expenses, payroll and time are not sent. Card processing fees are not recorded (the bookkeeper adds them when grouping a payout deposit). A refund recorded in Altair would need a refund there too; Altair has no refunds today.
