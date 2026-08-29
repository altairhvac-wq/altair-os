# Quick wins — implementation log (2026-08-29)

Implements §12 of `FINAL-REPORT.md`. Verified with `npx tsc --noEmit` (clean),
`npm run lint` (134 warnings / 0 errors — **identical to the pre-change
baseline**, confirmed by stashing), `npm run build` (passes), and an
authenticated browser pass at 1440 and 390 plus print emulation.

## Shipped

| # | Item | Change | Verified |
|---|---|---|---|
| 1 | Exact currency | New `formatCurrencyExact` (2dp) in `shared/types/customer.ts`; swept 17 transactional files — billing document components, line-item editors, payment capture/history, invoice/estimate detail totals, public Pay Now, and all 20 uses in `lib/email/billing-email-layout.ts`. `formatCurrency` kept for glance KPIs, now documented as such. | Printed estimate reads `$4,200.00 + $346.50 = $4,546.50` — line items now reconcile against the total (previously `$4,200 + $347 = $4,547`). |
| 2 | Contrast tokens | `--altair-ink-muted` / `--altair-ink-on-paper-muted` `#64748B → #556070` (clears AA on stone 4.93:1 and white 6.38:1). New graphite-anchored role family `--altair-ink-on-graphite{,-secondary,-muted}` (muted `#AEB6C2`, 6.37:1 on graphite), registered in `@theme inline` and in `altair-tokens.ts`. Swept 18 files across `reports/` + `dispatch/` onto it. | Reports KPI labels went 2.74:1 → 6.37:1; before/after crops in `SCREENSHOTS/cmp-kpi-{before,after}.png`. |
| 3 | Dead Search button | Removed from `admin/Header.tsx` (+ unused `Search` import) with a comment explaining why it must not return without a real search route. | `button[aria-label="Search"]` count is 0 on every admin page. |
| 4 | Stale trial banner | `subscription-billing-banner-model.ts` now reads `trialEndsAt` rather than trusting the `TRIAL` state alone → "Trial ended {date}" once elapsed. Same guard in the dashboard `upgrade-card-model.ts`, which also had a `toLocaleDateString(undefined)` hydration straggler — now `formatDateInTimeZone`. | Shell badge reads "Trial ended Aug 13, 2026" (was "Trial ends Aug 13, 2026" on Aug 29). |
| 5 | Mobile stat-strip clipping | `justify-end → justify-start` in all 5 strips (customers, estimates, invoices, jobs, leads). | "TOTAL CUSTOMERS 18 / ACTIVE 17" now visible from the left edge; crops in `cmp-strip-{before,after}.png`. |
| 6 | A11y primitives | `scope="col"` default on `AltairTableHead` (caller-overridable); `role="status"` on `AdminPendingLabel`'s pending text. | 8 `th[scope=col]` on the customers ledger. |
| 7 | Per-route titles | Root `title.template = "%s · Altair OS"`; titles added to 36 route segments; 4 marketing pages de-duplicated; `/welcome` pinned with `absolute`. `generateMetadata` on both public token routes names the document and the sending company (`Invoice INV-1042 · Acme HVAC`) and sets `robots: noindex`. | Tabs read "Reports · Altair OS", "Dispatch · Altair OS", "Customers · Altair OS". |
| 8 | Copy sweep | `PagedListFooter` now agrees noun with number (shared `pluralize` in new `shared/lib/plural.ts`); "1 item need attention" → "1 item needs attention"; 6 stale `Settings → Team` copy/links → Users; invoices' "Check all" → "Select all"; 63 trailing `...` → `…` across 42 files. | Live page shows "1 estimate"; "1 item needs attention". |
| 9 | Print total chip | Root cause was **not** a missing color reset — both heroes already set `background-color`, but the fill is a Tailwind **gradient** (`background-image`), which kept painting over it. Added `background-image: none` for both documents and both variants. Bonus: the empty dashed logo placeholder is now `print:hidden`. | Printed total renders black-on-white; see `SCREENSHOTS/v-estimate-print.png`. |
| 10 | Dark-OS boobytrap | Deleted the create-next-app `prefers-color-scheme: dark` block that flipped `--foreground` to near-white while `body` stayed light. Replaced with a comment explaining why none belongs there. | — |
| 11 | Artificial latency | Removed `setTimeout(() => router.refresh(), 500)` in `JobWorkflowActions`. | — |
| 12 | Address / phone formatting | New `shared/lib/address.ts` (`formatCityStateZip`, `formatAddressLine`) applied at all 6 hardcoded comma-join sites; new `formatPhoneForDisplay` in `shared/lib/phone.ts` applied at 7 display sites (incl. the printed invoice document). | Customer detail shows `(555) 555-0712`; no orphan commas in rendered text. |
| 14 | Canonical links | 7 `/time` links → `/payroll` (incl. the `resolveRecoveryHref` allow-list that would otherwise have dropped the link), `/settings/documents` → `/settings/company#documents`. Left `revalidatePath` calls and `nav-items.ts` path-matching strings alone — those are not links. | Build clean. |

## Audit corrections (findings that did NOT hold up)

- **#13 `/install` debug JSON — false positive.** Both the effect and the render in `PwaInstallDebugPanel` are already gated on `process.env.NODE_ENV === "development"`. It appeared in the audit only because those screenshots were captured against `npm run dev`. No change made.
- **SettingsAlertBanner aria-live — false positive.** It already sets `role={tone === "error" ? "alert" : "status"}`, which carries an implicit live region. The discovery agent misread it. No change made. (The `AdminPendingLabel` half of that finding was real and is fixed.)

## Deliberately not done (flagged, out of quick-win scope)

- **~17 remaining private `pluralize` copies** across `shared/lib/dashboard-*.ts`, `office-priority-engine.ts`, `operational-signals.ts`, etc. All identical to the new shared helper. A first attempt to collapse them is documented below as an incident; it is a safe mechanical change but wants its own reviewed pass.
- **Ledger table/mobile-card amounts** still use whole-dollar `formatCurrency`. Scan surfaces, and the stat strips above them are explicitly glance KPIs; converting rows is a density decision, not a quick win.

## Incident (contained, no lasting damage)

While consolidating the duplicate `pluralize` helpers, a Node script split
files on `\n` and compared lines to `"}"`. These files are CRLF, so every line
carried a trailing `\r`, the closing-brace search never matched, and the script
deleted ~300 lines from each of 4 files in `shared/lib/`. Caught immediately on
the next `grep`, restored with `git checkout --` (all 4 files were unmodified
before that script, so nothing else was lost), and the consolidation was
dropped from scope. **Any future codemod over this repo must be CRLF-safe** —
prefer exact-substring `split/join` or `sed`, not line-index arithmetic.
