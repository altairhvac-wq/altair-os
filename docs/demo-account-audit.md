# Demo Account Audit

Audit of Altair OS seed/demo data for beta demos and first-user onboarding.

**Seed pack version:** `5` (stored in `companies.settings.demoData.version`)

---

## Purpose

Demo data lets a new company explore a realistic HVAC (or electrical) field-service workspace without entering real customers or creating Stripe charges.

It is **not** a separate global “Altair Demo” tenant. Owners/admins load sample records into **their own company** from Settings (or the dashboard onboarding card). Records are tagged `[Demo]` / `JOB-DEMO-*` / `EST-DEMO-*` / `INV-DEMO-*` and marked `is_demo = true`.

---

## Demo company / user setup

| Item | How it works |
|------|----------------|
| **Company** | Whatever company the signed-in owner/admin belongs to (no hardcoded demo company name) |
| **Demo user** | The authenticated owner/admin who runs seed; optional technician membership used for job assignment |
| **Customer emails** | All demo customers/leads use the seeder’s account email (safe for estimate/invoice test emails) |
| **Credentials** | Not hardcoded — use normal signup/login for the workspace |
| **Secrets in repo** | None for demo seed |

Fake identity examples (HVAC pack): `[Demo] James Chen`, `[Demo] Lakewood Apartments`, phones like `(512) 555-xxxx`, Austin-area demo addresses, serials like `DEMO-SN-*`.

---

## How to run seed / clear

There is **no** `npm` / CLI seed script in `package.json`.

1. Sign in as **owner** or **admin**.
2. Open **Settings → Sample workspace data** (also available from onboarding / dashboard compact card).
3. **Set up demo data** → confirm.
4. To reset: **Clear demo data**, then seed again.

Server actions:

- `seedDemoDataAction(companyId)` → `seedCompanyDemoData`
- `clearDemoDataAction(companyId)` → RPC `clear_company_demo_data`
- `getDemoDataStatusAction(companyId)`

Trade pack selection: company `trade` → HVAC (default) or electrical (`getDemoSeedDefinitionsForTrade`).

---

## What data is included (HVAC pack v5)

Approximate counts after a successful seed:

| Area | Contents |
|------|----------|
| **Service items** | ~17 HVAC catalog items (`[Demo] …`) |
| **Customers** | 15 residential + light commercial / property / medical / restaurant |
| **Leads** | 3 pipeline leads (emails = seeder email) |
| **Equipment** | Per-customer demo equipment with `DEMO-SN-*` serials |
| **Jobs** | ~39 jobs: today mix (scheduled / in progress / completed), near-term scheduled, ~3 months completed history; assigned to first active technician or seeder |
| **Dispatch** | Assignments for completed + upcoming jobs |
| **Materials** | Job materials for profitability / reports |
| **Estimates** | 10: draft, sent, approved (incl. hero `EST-DEMO-2003`), declined |
| **Invoices** | 10: paid, partially paid, sent, overdue (`INV-DEMO-3008`) |
| **Payments** | Manual `invoice_payments` only (cash / check / card / ACH) — **no Stripe** |
| **Time entries** | Labor on completed/in-progress jobs + demo clock segments |
| **Notifications** | Job assigned / completed / invoice paid samples |

Electrical companies get a parallel electrical pack with the same structure and numbering scheme.

---

## Workflows the demo supports

- Dashboard: today’s work, cash/outstanding signals, operational queue items
- Customers + Customer 360 with history
- Jobs / dispatch board with assigned work
- Estimates list + detail (status mix for follow-up demos)
- Invoices + payment history (manual payments; partial + overdue examples)
- Technician mobile: assigned jobs (when a technician membership exists, or owner acting as assignee)
- Reports: revenue / jobs / customers populated from demo history
- Clear demo data without wiping real (non-demo) company records

---

## Known limitations

1. **Not a dedicated demo login** — each tenant seeds its own workspace.
2. **Re-seed requires clear first** — seed refuses if demo marker / demo rows already exist (`hasDemoData`).
3. **Public payment / approval tokens are not pre-seeded** — create links from invoice/estimate UI when needed (token-scoped RPCs).
4. **No Stripe Checkout from seed** — payments are manual demo rows; Pay Now on public pages still depends on Stripe Connect being configured for the company.
5. **No automatic estimate → invoice conversion rows** — approved estimates exist; conversion is a live product action.
6. **Job statuses** are `scheduled` / `in_progress` / `completed` only (no separate “needs follow-up” status).
7. **Lead names** are not `[Demo]`-prefixed (customers/jobs/docs are); lead emails still use the seeder address.
8. **Marketing screenshots (v4)** intentionally minimized overdue/draft pressure; **v5** restores a modest ops mix (draft/sent/declined estimates, one overdue invoice, diverse payment methods). Clear + reseed after deploy to pick up v5.
9. **Technician** is not auto-created — invite a technician for a true tech-role demo, or jobs assign to the seeder.

---

## Safety notes

- **Fake data only** — 555 phones, demo names, demo serials; do not put real customer PII in seed definitions.
- **Company-scoped only** — inserts and `clear_company_demo_data` filter by `p_company_id` + `is_demo` / demo identifiers.
- **No production-wide truncates** in seed/clear paths.
- **No real Stripe charges** from seed payments.
- **No secrets / passwords** in seed code.
- **Owner/admin only** for seed and clear (`assertDemoDataManagementAccess`).
- **Do not run destructive SQL against production** without explicit review. Prefer the in-app clear action.
- Failed seeds attempt rollback via `clear_company_demo_data`.

---

## Manual QA checklist

After **Clear** → **Set up demo data** on a non-production or throwaway company:

- [ ] Settings shows demo mode / seeded timestamp; records show `[Demo]` where expected
- [ ] Dashboard: today’s jobs non-empty; outstanding / overdue / partial invoice signals present
- [ ] Customers ≥ 10 demo customers; open Lakewood (or equivalent) 360
- [ ] Jobs: scheduled, in progress, completed visible; technician assignment present
- [ ] Estimates: draft (`EST-DEMO-2001`), sent (`EST-DEMO-2002`), approved hero (`EST-DEMO-2003`), declined (`EST-DEMO-2009`)
- [ ] Invoices: paid, partially paid (`INV-DEMO-3002`), sent, overdue (`INV-DEMO-3008`)
- [ ] Payment history methods include check / card / cash / ACH as seeded
- [ ] Reports show non-zero activity
- [ ] As technician (if invited): `/technician` shows assigned demo jobs
- [ ] Create public invoice link for unpaid demo invoice → token page loads; paid invoice shows paid (no Pay Now)
- [ ] Clear demo data removes demo rows; real customers (if any) remain
- [ ] Second seed after clear succeeds without duplicates

---

## Key source files

| Path | Role |
|------|------|
| `app/actions/demo-data.ts` | Server actions |
| `lib/database/services/demo-data-seeder.ts` | Seed orchestration |
| `lib/database/services/demo-data-seed-definitions.ts` | HVAC customers/jobs/catalog |
| `lib/database/services/demo-data-seed-pack-hvac.ts` | HVAC estimates/invoices/materials |
| `lib/database/services/demo-data-seed-pack-electrical.ts` | Electrical pack |
| `lib/database/queries/demo-data.ts` | Status, mark seeded, clear RPC client |
| `shared/lib/demo-data-identifiers.ts` | `JOB-DEMO-` / `EST-DEMO-` / `INV-DEMO-` / `[Demo]` helpers |
| `supabase/migrations/053_demo_data_foundation.sql` (+ later clear fixes) | `is_demo` + `clear_company_demo_data` |

Related: `docs/altair/marketing-screenshot-capture-guide.md` (screenshot route list; written for v4 marketing bias — reseed v5 before capture if you need overdue/draft examples).
