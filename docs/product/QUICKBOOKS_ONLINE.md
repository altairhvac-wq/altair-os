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
2. Sandbox test (done 2026-11-28, on "Sandbox Company US 31bb", manual sales tax): connect and setup read the company's accounts and tax codes; 21 customers, 11 items, 27 open invoices and 2 payments sent with every customer balance matching Altair to the cent; no duplicate customers; a payment recorded in the Altair UI arrived within seconds; an edit updated the same invoice; a void zeroed the balance; an expired access token refreshed; disconnect revoked at Intuit (consent was asked again) and deleted keys and records; reconnecting the same company offered "From today only" and queued nothing. Fixed on the way: `select *` queries (Intuit error 4001 on field lists), duplicate open invoices on reconnect (`previous_realm_id`). **Still untested:** Automated Sales Tax, because this sandbox company uses manual tax. The engine flags any total difference either way.
3. Production questionnaire (the owner submits), production keys, then the website and FAQ say "works with QuickBooks Online" and `quickbooks_online` leaves `PLANNED_INTEGRATIONS` and `shared/lib/site/not-yet.ts`.

## Not in version 1

Nothing comes back from QuickBooks. Expenses, payroll and time are not sent. Card processing fees are not recorded (the bookkeeper adds them when grouping a payout deposit). A refund recorded in Altair would need a refund there too; Altair has no refunds today.
