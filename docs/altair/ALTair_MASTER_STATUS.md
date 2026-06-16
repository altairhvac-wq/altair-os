# ALTAIR MASTER STATUS

Last Updated: 2026-06-15

## Current Stage

Status: Internal Beta Preparation + V2 Experience Layer Migration

Altair OS is a production-grade multi-tenant field service operating system preparing for small company beta testing.

Parallel tracks:

1. **Beta readiness** — stability, onboarding, operational trust
2. **V2 Master Shell migration** — experience-layer architecture across admin surfaces (no product logic changes)

The redesign is **experience-layer architecture**, not feature work. Shell migrations do not change product logic, routes, server actions, Supabase behavior, or RLS assumptions.

**North star:** Reduce mental load. Altair should feel calm, organized, intelligent, and premium — not like another management system.

---

## V2 Master Shell — Current State

### Completed

**Master List Shell (7 pages)**

Customers, Leads, Jobs, Estimates, Invoices, Expenses, Service Items / Price Book — all on `MasterListPageLayout` with compact density.

**Master List Loading State (7 pages)**

All seven list pages use `MasterListPageLoadingState` matching their loaded layout.

**Master Detail Shell (5 pages)**

Customer 360, Job Detail, Estimate Detail, Invoice Detail, Team Member Profile — all on `MasterDetailPageLayout`.

**Hub pages**

- **Network** — tabbed relationship hub on Master Shell primitives (`MasterShellPage`, `MasterPageCanvas`, `MasterPageHeader`, `MasterPageSection`, etc.)

**Form / admin hub pages**

- **Settings** — admin/form hub with compact density
- **System Check** — admin/form hub with compact density

**Report / dashboard pages**

- **Reports** — report shell on Master Shell primitives
- **Tax Summary** — report shell on Master Shell primitives
- **Dashboard loaded view** — `OperationalDashboardView` on `MasterShellPage`
- **Dashboard loading state** — `OperationalDashboardLoadingState` aligned to Master Shell skeleton

**Legacy deprecation (files retained; cleanup pending)**

- `ListCommandCenterLayout` — deprecated, **zero active imports**
- `ListCommandCenterLoadingState` — deprecated, **zero active imports**
- Do not delete legacy files until the dedicated cleanup pass

### Page-family shell patterns

| Pattern | Status | Notes |
|---------|--------|-------|
| List page shell | **Done** | 7 reference implementations |
| Detail page shell | **Done** | 5 reference implementations |
| Hub page shell | **Done** | Network reference |
| Settings / admin form hub shell | **Done** | Settings, System Check |
| Report / dashboard shell | **Done** | Reports, Tax Summary, Dashboard (loaded + loading) |
| Board / workbench shell | **Pending** | Dispatch deferred — high-risk board + mobile sheet behavior |

### Remaining page families

| Surface | Status | Notes |
|---------|--------|-------|
| Invoice edit / form-edit route | Not migrated | Form-heavy utility page |
| Customer import wizard | Not migrated | Multi-step wizard at `/customers/import` |
| Time / Time Clock | Not migrated | Admin time-clock surfaces |
| Platform / admin utility surfaces | Not migrated | Internal/alpha utility pages |
| Dispatch board / workbench | Not migrated | Last — board + mobile sheet layout risk |

### Next recommended sequence

1. **Invoice edit** — form-edit route under admin form shell family
2. **Customer import wizard** — multi-step wizard shell
3. **Time / Time Clock** — admin time surfaces
4. **Deprecated ListCommandCenter cleanup** — delete `ListCommandCenterLayout` and `ListCommandCenterLoadingState` after confirming zero imports
5. **Dispatch last** — board/workbench shell (highest layout risk)

---

## Current Priorities

### Priority 1: Beta Readiness

Prepare Altair for real companies to onboard and operate daily.

Focus: friction reduction, trust, polish, duplicate workflow elimination.

### Priority 2: V2 Master Shell (Experience Layer)

Finish remaining admin utility/form surfaces using established page-family patterns. Reuse primitives from `shared/design-system/shell/`. Do not alter business logic.

### Priority 3: Technician Experience

Eliminate legacy `/tech` mock infrastructure. Improve field usability and reduce clicks.

---

## Active Work

### In Progress

- V2 Master Shell — remaining admin utility/form pages (invoice edit next)
- Beta readiness improvements
- Technician `/tech` cleanup

### Upcoming

- Customer import wizard shell migration
- Time / Time Clock shell migration
- ListCommandCenter legacy file cleanup pass
- Dispatch board/workbench shell (last)
- Beta onboarding experience and first external company testing

---

## Current Known Issues

- `/tech` root still contains mock infrastructure
- Deprecated `ListCommandCenter*` files remain in repo (zero imports; safe to delete in cleanup pass)
- Invoice edit, customer import, time-clock, and dispatch still on legacy/pre-shell layouts
- Some alpha deployment docs are outdated
- Coming Soon infrastructure exists but is not populated

---

## Immediate Goal (Next 30 Days)

Get Altair into the hands of a small number of real companies while completing remaining Master Shell admin surfaces (invoice edit, import wizard, time).

Success metrics:

- Companies can onboard themselves
- Companies can create customers, estimates, jobs, and dispatch technicians
- Technicians can complete work; companies can invoice and collect payments
- Admin surfaces feel consistent under Master Shell patterns

---

## Long-Term Vision

Altair OS becomes a Living Operating System that trades companies genuinely enjoy opening every morning.

It should feel:

- Intelligent
- Helpful
- Calm
- Organized
- Delightful

Rather than feeling like another management system.
