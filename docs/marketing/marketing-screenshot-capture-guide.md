# Marketing Screenshot Capture Guide

Production-quality screenshots for public marketing pages. **Target time: under 5 minutes** once demo data is loaded.

---

## Quick start (60 seconds)

1. Log in as **owner/admin** on your capture workspace.
2. **Settings → Demo data** → if loaded, **Clear demo data**, then **Load demo data** (v4 marketing-ready seed).
3. Set browser to **1440×900** (desktop) or **390×844** (technician mobile).
4. Hide the bookmark bar and use a clean profile (no extensions overlaying the UI).
5. Follow the six routes below in order — each shot takes ~30–45 seconds.

---

## Demo data audit (v3 → v4)

The previous seed (v3) was tuned for **operational training**, not marketing. It intentionally surfaced pressure:

| Area | v3 issue | v4 marketing fix |
|------|----------|------------------|
| **Dashboard** | 6 jobs today, 0 completed, 2 urgent | **12 jobs today**, **9 completed**, **0 unassigned**, healthy ops score |
| **Dispatch** | Urgent no-cooling / no-heat calls | Routine PM, tune-ups, balanced schedule |
| **Jobs** | `urgent` / `high` priority on today's board | All **normal** priority on today's board |
| **Invoices** | 2 overdue (`INV-DEMO-3003`, `3007`) | **0 overdue** — mostly paid; one small partial balance |
| **Estimates** | Drafts, declined, stale sent | **Approved hero estimate** (`EST-DEMO-2003`); fewer blockers |
| **Leads** | New AC-outage lead, lost lead | Pipeline shows **estimate_sent** progression |
| **Notifications** | "Urgent job assigned" alert | Positive completions and payments only |
| **Customer 360** | Overdue balance on James Chen | **Lakewood Apartments** — healthy AR, rich history |

**Seed source:** `lib/database/services/demo-data-seed-definitions.ts` + `demo-data-seeder.ts`  
**Version marker:** `companies.settings.demoData.version = 4`

---

## Marketing-ready workspace state

After loading v4 demo data you should see:

### Dashboard (`/`)
- **12 jobs today** · **0 unassigned** · **9 completed**
- Operational health: **Healthy** (no critical office-queue items)
- Cash flow: **0 overdue invoices**; one partial balance (~$1,046 on Greenfield)
- Recommendations: scheduling and collections wins, not firefighting

### Customer 360 — Lakewood Apartments
- 26 jobs · $21,480 lifetime revenue · active equipment · paid invoice history
- No overdue AR severity on the account

### Dispatch (`/dispatch`)
- Full day board with every job **assigned**
- Mix of completed (green), in-progress (blue), scheduled (neutral)
- No red urgent badges

### Invoices
- **7+ paid**, 1 partial (`INV-DEMO-3002`), 2 sent with future due dates
- Hero shot: partially paid commercial invoice with professional line items

### Estimates
- Hero shot: **`EST-DEMO-2003`** — Approved packaged RTU replacement ($7,850 + tax)

### Technician (`/technician`)
- Active shift with **`JOB-DEMO-1002`** in progress (Greenfield seasonal tune-up)
- Additional today's jobs visible in the week list

---

## Stable record lookups

UUIDs vary per workspace. Use these **stable identifiers** to find records:

| Target | Lookup key |
|--------|------------|
| Customer 360 | Customer name: **`[Demo] Lakewood Apartments`** |
| Dispatch / Dashboard | Job numbers `JOB-DEMO-1001` … `JOB-DEMO-1039` |
| Estimate | **`EST-DEMO-2003`** |
| Invoice (partial) | **`INV-DEMO-3002`** |
| Invoice (paid hero) | **`INV-DEMO-3001`** |
| Technician active job | **`JOB-DEMO-1002`** |

**Route pattern:** `/customers/{customerId}` — copy ID from Customers list search.

---

## Six screenshot targets

### 1. Dashboard

| Field | Value |
|-------|-------|
| **Route** | `/` |
| **Viewport** | **1440 × 900** (16:10 crop-friendly) |
| **Show** | Today ops summary (12 / 9 completed / 0 unassigned), operational health card, cash-flow strip with $0 overdue, today's job list (first 5–8 rows), positive recommendation |
| **Hide** | Demo-data seed CTA card (scroll past or load data first), browser chrome, notification drawer, resolution-queue sheets |
| **Crop** | **16:10** from top-left of main content — include header + first two dashboard sections. Exclude settings/demo panel at bottom. |

---

### 2. Dispatch Command Center

| Field | Value |
|-------|-------|
| **Route** | `/dispatch` |
| **Viewport** | **1440 × 900** |
| **Show** | Full-day timeline with assigned technician on every job, mix of completed + in-progress + scheduled, customer names visible, time blocks 7 AM–4 PM |
| **Hide** | Urgent priority chips (none in v4), unassigned column, focus/debug query params, mobile hamburger if resized |
| **Crop** | **16:10** centered on the schedule grid. Top: date header + summary chips. Bottom edge at last visible job row (~3 PM slot). |

---

### 3. Customer 360

| Field | Value |
|-------|-------|
| **Route** | `/customers/{lakewoodId}` then scroll to `#customer-360` |
| **Viewport** | **1440 × 900** |
| **Show** | Customer header (Lakewood Property Management), tags, **Customer 360** card, equipment list, revenue summary, recent service history, open opportunities/estimates |
| **Hide** | Overdue invoice callouts, lost-lead references, internal notes mentioning emergencies, edit/delete actions (use view mode) |
| **Crop** | **4:3** or **16:10** on the Customer 360 card + one section below (equipment or service history). Include customer name in frame. |

---

### 4. Technician Mobile

| Field | Value |
|-------|-------|
| **Route** | `/technician` |
| **Viewport** | **390 × 844** (iPhone 14 Pro). Use device toolbar in DevTools. |
| **Show** | Active job card (`JOB-DEMO-1002` — Greenfield tune-up, In Progress), arrival/work-started state, today's job stack, clocked-in indicator |
| **Hide** | Desktop nav, admin sidebar, billing sections if role-limited, error toasts |
| **Crop** | **9:19.5** full mobile viewport. Frame the active job card + one upcoming job. Optional: capture mobile browser frame for App Store style. |

> **Note:** `/tech` is legacy mock UI. Always use **`/technician`** for real seeded data.

---

### 5. Estimate (Approved)

| Field | Value |
|-------|-------|
| **Route** | `/estimates` → open **`EST-DEMO-2003`** (or `/estimates/{id}`) |
| **Viewport** | **1440 × 900** |
| **Show** | Approved status badge, Greenfield Dental customer, line items (Packaged RTU Replacement), subtotal/tax/total, professional notes, valid-until date |
| **Hide** | Draft/declined estimates in background, `[Demo]` prefix on line-item names if possible (zoom to summary), bulk actions |
| **Crop** | **16:10** on estimate detail panel — status + customer + line-item table + total. List sidebar can be partially visible for context. |

---

### 6. Invoice (Collections)

| Field | Value |
|-------|-------|
| **Route** | `/invoices` → open **`INV-DEMO-3002`** (or `/invoices/{id}`) |
| **Viewport** | **1440 × 900** |
| **Show** | Partially paid status, Greenfield Dental, line items, amount paid vs balance due, payment history (deposit + installment), due date in the future |
| **Hide** | Overdue badges/filters, void/delete controls, `[Demo]` prefix if cropping tight |
| **Crop** | **16:10** on invoice header + line items + payment summary. Show **$1,000 paid / ~$1,046 balance** story. |

---

## 5-minute capture checklist

| Step | Action | Time |
|------|--------|------|
| 1 | Clear + reload demo data v4 | 60s |
| 2 | Dashboard `/` — screenshot | 30s |
| 3 | Dispatch `/dispatch` — screenshot | 30s |
| 4 | Customers → Lakewood → `#customer-360` — screenshot | 45s |
| 5 | Resize to 390×844 → `/technician` — screenshot | 45s |
| 6 | `/estimates` → EST-DEMO-2003 — screenshot | 45s |
| 7 | `/invoices` → INV-DEMO-3002 — screenshot | 45s |

**Export:** PNG at 2× resolution (2880×1800 for desktop crops). Name files:

```
marketing-dashboard.png
marketing-dispatch.png
marketing-customer-360.png
marketing-technician-mobile.png
marketing-estimate.png
marketing-invoice.png
```

Place in `public/marketing/screenshots/` and wire `imageSrc` in `SeeAltairInActionSection.tsx` when ready.

---

## Playwright one-liner (optional)

```bash
npx playwright screenshot --viewport-size=1440,900 http://localhost:3000/ marketing-dashboard.png
```

Repeat per route. For mobile:

```bash
npx playwright screenshot --viewport-size=390,844 http://localhost:3000/technician marketing-technician-mobile.png
```

Authenticate first (saved storage state) or run against a logged-in session.

---

## Pre-flight validation

Before shooting, confirm on Dashboard:

- [ ] Jobs today = **12**
- [ ] Completed today = **9**
- [ ] Unassigned = **0**
- [ ] Overdue invoices = **0**
- [ ] No red **Critical** badges in office review / attention cards
- [ ] No **urgent** priority jobs on today's dispatch board

If any check fails, clear demo data and reload — you may be on v3 seed.
