# Altair Table

Canonical structural foundation for Altair's desktop operational ledgers
(customers, jobs, estimates, invoices, expenses, leads). Read
`docs/altair/ALTAIR_DESIGN_FOUNDATION.md` ("Tables") first — that document
is the standard this primitive exists to encode, not a new one.

## Status

**Migrated (6):** Customers, Expenses, Jobs, Estimates, Invoices, and Leads
desktop tables. Every `MasterPageSurface` `variant="workspace"` consumer now
renders its desktop ledger through these primitives — no remaining ledger
owns raw `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` markup.

## What this owns vs. what it doesn't

The Table foundation owns **presentation and semantic table structure**:
valid `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` markup, canonical
spacing, header material, zebra/hover/selected row treatment, and the
primary-cell truncation shell.

Domain components own **everything else**: data, columns, labels, routes,
row actions, permissions, status meaning, selection state, click behavior,
and any domain-specific rendering inside a cell. This is not a schema-driven
table engine — there is no column configuration object, no sorting
framework, no pagination, no virtualization. A domain component still maps
its own array and writes its own `<AltairTableRow>` per record.

## Import

```tsx
import {
  AltairTable,
  AltairTableHeader,
  AltairTableBody,
  AltairTableRow,
  AltairTableHead,
  AltairTableCell,
  AltairTablePrimaryCell,
  AltairTableSecondaryText,
} from "@/shared/design-system/table";
```

## Primitives

| Primitive | Element | Owns |
|---|---|---|
| `AltairTable` | `<table>` | Full-width layout, `text-left text-sm` baseline, explicit `border-collapse` (already the effective value via Tailwind's base reset — now stated rather than implicit), a stable `altair-table` class hook |
| `AltairTableHeader` | `<thead>` | Header row material (Paper Subtle background) |
| `AltairTableBody` | `<tbody>` | Nothing else — see "Why Body owns nothing" below |
| `AltairTableRow` | `<tr>` | Standard/selected row material, optional pointer-click convenience |
| `AltairTableHead` | `<th>` | Canonical spacing (`admin-table-cell`) + header typography (small, bold, uppercase, muted Ink-on-Paper) + optional `align="right"` |
| `AltairTableCell` | `<td>` | Canonical spacing (`admin-table-cell`) + optional `align="right"` — no default text color |
| `AltairTablePrimaryCell` | `<td>` | The primary/secondary vertical stack + truncation shell (`min-w-0`), optional `leading` (avatar) and `trailing` (badge) slots |
| `AltairTableSecondaryText` | `<p>` | A name for the muted metadata line — no default style (see below) |

No `AltairTableActionsCell` exists. None of the six migrated ledgers has an
inline per-row action-button column today (each acts on a row via click, a
routed Link, or an in-page button, not a rendered action cell), so there is
no repeated structure to justify one. Add it in a future pass only once a
real ledger needs it.

No full-width empty/loading `<tr><td colSpan>` helper exists either. Every
migrated ledger renders its empty and loading states as a sibling of the
table, not as a row inside it — Estimates/Invoices' section-header row
(`BillingWorkflowSectionHeader`, a plain `<tr><td colSpan>`) is the one
in-table exception, and it is a domain component the primitives intentionally
know nothing about — there is no repeated in-table markup to extract into
the design system.

### Why Body owns nothing

`AltairTableBody` is `<tbody>{children}</tbody>` and nothing more. Zebra and
hover are on `AltairTableRow` itself (scoped with a `tbody` ancestor
selector in CSS, see below) rather than on Body, specifically so the exact
same `AltairTableRow` can also be used for the header row (per the
composition example) without leaking body-only hover/zebra/selected styling
onto the header row.

### Why SecondaryText has no default style

Legacy and North Star ledgers currently render the muted metadata line
under a primary cell differently (different truncation, different color
tokens, different weight). Baking in one default here would quietly
redesign one branch or the other — exactly what this task is not supposed
to do. `AltairTableSecondaryText` exists so the line has one name across
ledgers today; give it a real shared default only once enough ledgers
migrate and actually agree on one treatment.

## Composition example

### 1. A routed primary Link (Customers pattern)

```tsx
<AltairTable className="min-w-[640px]">
  <AltairTableHeader>
    <AltairTableRow>
      <AltairTableHead>Customer</AltairTableHead>
      <AltairTableHead align="right">Jobs</AltairTableHead>
    </AltairTableRow>
  </AltairTableHeader>
  <AltairTableBody>
    {customers.map((customer) => (
      <AltairTableRow
        key={customer.id}
        selected={selectedIds.has(customer.id)}
        onClick={() => router.push(`/customers/${customer.id}`)}
      >
        <AltairTablePrimaryCell
          primary={
            <Link href={`/customers/${customer.id}`} onClick={(e) => e.stopPropagation()}>
              {customer.name}
            </Link>
          }
          secondary={
            <AltairTableSecondaryText className="truncate text-xs text-altair-ink-on-paper-muted">
              {customer.company}
            </AltairTableSecondaryText>
          }
        />
        <AltairTableCell align="right">{customer.totalJobs}</AltairTableCell>
      </AltairTableRow>
    ))}
  </AltairTableBody>
</AltairTable>
```

### 2. An in-page action button (Expenses pattern)

```tsx
<AltairTable className="min-w-[880px]">
  <AltairTableHeader>
    <AltairTableRow>
      <AltairTableHead>Expense</AltairTableHead>
      <AltairTableHead>Status</AltairTableHead>
    </AltairTableRow>
  </AltairTableHeader>
  <AltairTableBody>
    {expenses.map((expense) => (
      <AltairTableRow
        key={expense.id}
        selected={expense.id === selectedId}
        onClick={() => onSelect(expense)}
      >
        <AltairTablePrimaryCell
          primary={
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(expense);
              }}
            >
              {expense.expenseNumber}
            </button>
          }
          secondary={
            <AltairTableSecondaryText className="text-xs text-altair-ink-on-paper-muted">
              {formatExpenseDate(expense.purchaseDate)}
            </AltairTableSecondaryText>
          }
        />
        <AltairTableCell>
          <ExpenseStatusBadge status={expense.status} />
        </AltairTableCell>
      </AltairTableRow>
    ))}
  </AltairTableBody>
</AltairTable>
```

Neither example contains business logic — `router.push`, `onSelect`, and
the status badge are stand-ins for whatever a real domain component does.

## Row interaction contract

This is a hard contract, not a suggestion:

- Rows may support pointer-only click convenience (`onClick`).
- Rows are never automatically keyboard-focusable — the primitive never
  sets `tabIndex`.
- Rows never receive `role="link"` (or any other role) from the primitive.
- Rows never receive custom Enter/Space key handling from the primitive.
- Keyboard navigation belongs to the real `<Link>` or `<button>` inside a
  cell — usually inside `AltairTablePrimaryCell`'s `primary` slot.
- Interactive descendants (a Link, a button, a checkbox) must manage their
  own `stopPropagation` where whole-row pointer behavior exists. The
  primitive does not do this for them, and does not try to guess when it's
  needed.

`AltairTableRow` adding `cursor-pointer` when `onClick` is present is a
styling hint only — it does not change the row's accessibility tree, tab
order, or semantics in any way.

## Selected row styling

`<AltairTableRow selected>` adds `altair-table-row-selected`, which paints
`--altair-paper-elevated` plus an inset `--altair-border-strong` ring — the
Foundation's dedicated "selection and focus containment" role. This is a
small, intentional difference from the legacy (still-in-use)
`.admin-table-row-selected` class, which tints with a raw cyan
(`rgb(236 254 255)`). The Foundation's non-negotiable color rule forbids
introducing a new raw color in a design-system primitive, and cyan was
never a semantic Altair token, so the new primitive uses the token that was
already built for exactly this job instead of reproducing the legacy color.
Selection remains programmatically understandable via the `selected` prop
regardless of the visual token used.

The same applies to each ledger's North Star branch: before migration,
Customers/Jobs/Estimates/Invoices/Leads applied North Star's own
`northStarListTokens.tableRowSelected` (a gold tint with a left accent
border) directly as a conditional `className` alongside `isSelected`. Once
migrated, every ledger instead passes `selected={isSelected}` to
`AltairTableRow` and drops `tableRowSelected` entirely, so North Star's
selected-row treatment converges on the same `altair-table-row-selected`
token as the legacy branch. This mirrors the Customers/Expenses precedent
above and is the same category of small, intentional, documented
difference — not a regression.

## North Star extension boundary

Every migrated ledger (Customers, Expenses, Jobs, Estimates, Invoices,
Leads) renders the same primitives in both its legacy and North Star
(`NEXT_PUBLIC_NORTH_STAR_SHELL=true`) branches. The primitives
never branch on North Star themselves and never import
`shared/design-system/north-star/tokens`. Every North Star visual
difference (gold accents, ivory ledger chrome, brand-specific typography)
is passed in by the domain table component as `className` on
`AltairTableRow`, `AltairTableHead`, `AltairTableCell`, or
`AltairTablePrimaryCell` — exactly like any other domain styling. The design
system never hardcodes a North Star token map; it only exposes the
extension point.

## Mobile boundary

Desktop only. `AltairTable*` primitives are never used by
`CustomersMobileCardList`, `ExpensesMobileCardList`, `JobsMobileCardList`,
`EstimatesMobileCardList`, `InvoicesMobileCardList`, `LeadCard`, or any
other mobile card composition — no migration pass has touched any of them.
The existing `hidden ... md:block` (or `lg:block`) desktop wrapper around
the table stays in the domain component — the Table primitive itself has no
responsive-hiding opinion.

## CSS migration boundary

`.altair-surface-workspace table ...` in `app/globals.css` used to recolor
any plain `<table>` nested inside a `variant="workspace"` surface. Once
Customers, Expenses, Jobs, Estimates, Invoices, and Leads all migrated to
these primitives — confirmed by a full-repo search for both `<table` and
`variant="workspace"` — no consumer of that surface rendered a bare
`<table>` anymore, so that now-dead generic descendant block was removed.
`AltairTable`/`AltairTableHeader`/`AltairTableRow` instead carry their own
explicit classes (`altair-table`, `altair-table-header`, `altair-table-row`,
`altair-table-row-selected`, defined in `app/globals.css`) using the same
semantic token values, so a migrated ledger's material no longer depends on
which surface wrapper happens to contain it.

This does not touch the separate, still-load-bearing `.admin-card table ...`
/ `.admin-table-row` rules, which remain in active use by non-ledger admin
tables outside this design system's scope (e.g. `ServiceItemsTable`,
`TeamMembersTable`, `TimeEntriesTable`).

## Migration guidance

1. Confirm the ledger already uses `MasterPageSurface` `variant="workspace"`
   (or North Star's list surface) — this task does not change surface
   adoption.
2. Replace the raw `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` markup
   with the primitives above, one row shape at a time. Keep every column,
   column order, label, route, permission check, and status badge exactly
   as it was — only the structural wrapper changes.
3. Keep the mobile card component and the `hidden ... md:block` (or
   `lg:block`) wrapper around the table untouched.
4. Route the primary cell's real Link or button through
   `AltairTablePrimaryCell`'s `primary` slot; do not let the primitive
   decide Link vs. button.
5. Pass selection state through `AltairTableRow`'s `selected` prop, not a
   manually concatenated className.
6. Diff the rendered ledger against its pre-migration screenshot. Any pixel
   difference must be either reverted or explicitly documented as
   intentional (as this task documents the selected-row ring color above).

## Non-goals

- Not a schema-driven data-grid engine — no column configuration objects.
- No sorting, pagination, or virtualization framework.
- No drag-and-drop or resizable columns.
- No responsive table engine — responsive column hiding stays
  domain-owned `className` (e.g. `hidden lg:table-cell`) on
  `AltairTableHead`/`AltairTableCell`, exactly as it was before migration.
- No mobile card composition — mobile stays entirely with the existing
  per-ledger mobile card components.
- No forced empty/loading state component — ledgers keep rendering their
  own `*EmptyState` / `*LoadingState` components as a sibling of the table.
