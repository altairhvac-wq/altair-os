# Altair UI redesign roadmap

Living tracker for the Mission Control / workspace UI redesign.

**Surface system:** Dashboard, Customers, Customer Profile, Leads, Jobs, Estimates, Invoices, and Payments use MC v2 light paper (`shared/design-system/components/mc-surface.ts`). Reports uses dark elevated chrome (`report-surface.ts`) plus categorical icon-chip tints (`report-icon-tints.ts`). Dispatch is a deliberate dark exception (Graphite / report-surface tokens, horizontal Gantt). See `.cursor/rules/altair-design-system.mdc`.

**Related:** Feature gaps that must not be faked → [`altair-feature-gaps.md`](./altair-feature-gaps.md). Broader product inventory → [`product/ALTair_BRAIN.md`](./product/ALTair_BRAIN.md).

| # | Panel | Route | Status | Notes |
|---|-------|-------|--------|-------|
| 1 | Dashboard | `/` | **Done** | Mission Control v2 (`mission-control-v2/`, `mc-surface`) |
| 2 | Reports | `/reports` | **Done** | Dark `report-surface` + `report-icon-tints` (Reports only) |
| 3 | Customers | `/customers` | **Done** | List + filters on MC v2 paper register |
| 4 | Customer Profile | `/customers/[customerId]` | **Done** | Detail / 360; payment-ledger Total Spent |
| 5 | Dispatch | `/dispatch` | **Done** | Dark elevated combined board (deliberate MC v2 exception): viewport-fill workbench (no page scroll on md+); KPI strip; Unassigned sidebar left (internal list scroll); fixed/vh-capped Mapbox map above technician Gantt (Gantt is the contained vertical+horizontal scrollport; rows sticky left, 7am–6pm core + shoulders, start-time chips); detail panel on job/pin select; no Schedule/Map toggle; job-location pins only (cached geocode via `NEXT_PUBLIC_MAPBOX_TOKEN`) — no technician tracking/routes |
| 6 | Jobs | `/jobs` | **Done** | List: header status glance pills (`JobsStatStrip`); thinned filter bar + More filters; All Jobs Type column; Today day-at-a-glance (`JobScheduleRow`, schedule sort + Now/gap markers); assignee as first name + last initial. **Job Details** (`/jobs/[jobId]`): condensed MC v2 header; Customer Profile–matched workflow chrome row (back + segmented progress + Next command); real tab gating (`JobDetailTabbedWorkspace` / `job-detail-tabs`); Job Description card + Job Summary sidebar (parts from `job_materials`, closed labor hours; labor $ only when `labor_cost_rate` set); no Tasks / Est. Duration (see feature gaps); money path / office review / profitability / history + customer/dispatch rails kept |
| 7 | Estimates | `/estimates` | **Done** | List: header status glance pills (`EstimatesStatStrip`); removed `EstimateQueueTabs` / `EstimateSummaryCards`; Date column on table. **Estimate Details** (`/estimates/[estimateId]`): consolidated header; document labels unified (`Created` / `Valid until`); trimmed Bill to; always-visible Summary; single document DOM instance (duplicate mount fixed) |
| 8 | Invoices | `/invoices` | **Done** | List: header status glance pills (`InvoicesStatStrip`); removed `InvoiceQueueTabs` / orphan `InvoiceSummaryCards` + cash-flow banner; owed pills use `sum(balanceDue)`, Paid uses payment-ledger sum; Past = void+cancelled count-only. Customer Profile invoice load uses overdue billing sync. **Invoice Details** (`/invoices/[invoiceId]`): consolidated header; always-visible Summary; single document DOM instance (duplicate mount fixed) |
| 9 | Payments | `/payments` | **Done** | Collected-payments ledger on MC v2; `PaymentsStatStrip` (this week / this month from payment ledger); table + mobile cards; `listInvoicePayments` joins invoice/customer; client pagination; Money nav item + billing access |
| 10 | Leads | `/leads` | **Done** | Header filter pills + MC v2 list (Customers pattern); no Value column (see feature gaps) |
| 11 | Expenses | `/expenses` | Not started | Receipts and categories |
| 12 | Price Book | `/price-book` | Not started | Services / parts catalog |
| 13 | Labor & payroll | `/time` | Not started | Time review (+ `/time-clock`) |
| 14 | Marketing | `/marketing` | Not started | Posts / campaigns |
| 15 | Network / Community | `/network` | Not started | Referrals and community |
| 16 | Feedback | `/alpha-tracker` | Not started | Alpha feedback tracker |
| 17 | Settings | `/settings` | Not started | Company configuration |

## Status legend

| Status | Meaning |
|--------|---------|
| **Done** | Redesign pass landed on the target surface system with honest data wiring |
| Not started | Still on prior / North Star / legacy chrome; redesign not begun |

## Working rules

1. One panel (or a thin vertical slice) per pass — verify before moving on.
2. Audit real data and permissions before wiring numbers.
3. Do not mix MC paper chrome with Reports dark chrome.
4. Do not invent metrics to fill empty slots — see feature gaps.
