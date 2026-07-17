# Altair Dialog

Canonical structural foundation for Altair's modal dialogs, confirmation
overlays, and form overlays. Read
`docs/altair/ALTAIR_DESIGN_FOUNDATION.md` ("Shadow System", "Motion",
"Accessibility", "Component Philosophy") first — that document is the
standard this primitive exists to encode, not a new one.

## Status

**Foundation + first adoption pass (5 dialogs, 3 modules).** Migrated:
`CustomerEditControl` (Customers), `CustomerEquipmentSection` (Customers),
`ExpenseLifecycleControl` (Expenses), `InvoiceLifecycleControl` (Invoices),
`ExpenseReceiptPreview` (Expenses). Every other hand-rolled
`fixed inset-0` / `window.confirm` dialog in the repository is unmigrated —
see "Non-goals" and the recommended next task.

## What this owns vs. what it doesn't

The Dialog foundation owns **presentation, overlay structure, and
accessibility mechanics**: the backdrop, the panel's material (Paper
Elevated, Border, radius, shadow), motion, `role="dialog"` +
`aria-modal` + title/description association, the focus trap, focus
restoration, scroll locking, Escape-to-close, and the mobile-bottom-sheet-
to-desktop-modal responsive shape.

Domain components own **everything else**: open state, workflow state,
form data, validation, Server Actions, mutation logic, permissions,
business copy, submit labels, the destructive decision itself, success/
error handling, and route behavior. `AltairDialog` never decides *whether*
a workflow is allowed to close (see "Close behavior" below) and never
renders a delete/archive/void function of its own — a caller always
supplies `onConfirm`.

This is not a modal registry or an animation library. There is no global
open/close event bus and no imperative `openDialog()` API — every dialog is
a normal controlled React component (`open` + `onOpenChange`), exactly like
the `MobileSheet` family it sits alongside.

## Import

```tsx
import {
  AltairDialog,
  AltairDialogContent,
  AltairDialogHeader,
  AltairDialogTitle,
  AltairDialogDescription,
  AltairDialogBody,
  AltairDialogFooter,
  AltairDialogClose,
  AltairDialogIcon,
} from "@/shared/design-system/dialog";
import { AltairConfirmDialog } from "@/shared/design-system/dialog";
```

## Primitives

| Primitive | Owns |
|---|---|
| `AltairDialog` | Portal, backdrop, scroll lock, Escape wiring, title/description id plumbing. Renders nothing when `open` is `false`. |
| `AltairDialogContent` | The panel itself — `role="dialog"`, `aria-modal`, focus trap, size (max-width), responsive bottom-sheet/centered-modal shape, Paper Elevated material + motion. |
| `AltairDialogHeader` | Title/description/close row layout + safe-area-aware top padding on mobile. |
| `AltairDialogTitle` | The dialog's accessible name (`<h2>`), auto-wired to `aria-labelledby`. |
| `AltairDialogDescription` | Optional supporting copy, auto-wired to `aria-describedby` only while it is actually rendered. |
| `AltairDialogBody` | The scrollable content region — horizontal padding, vertical rhythm, scroll containment. |
| `AltairDialogFooter` | Action row — mobile stacking (primary near the thumb, per the Foundation's Mobile section) and secondary-before-primary ordering at `sm+`. |
| `AltairDialogClose` | Keyboard-accessible close button with a screen-reader label. Always calls `onOpenChange(false)`; the caller decides whether to pass `disabled`. |
| `AltairDialogIcon` | Optional leading icon chip for a header (tone supplied by the caller via `className`). |
| `AltairConfirmDialog` | The one sanctioned composition — see below. |

No `AltairDialogSection` exists yet. None of the five migrated dialogs
needed sub-section grouping inside the body; add it in a future pass only
once a real dialog needs it, per the Foundation's "extend, don't invent a
parallel primitive" rule.

## Sizes

Audited real production widths before choosing the API — every size below
has a genuine consumer today:

| Size | Max width | Consumer |
|---|---|---|
| `sm` | `max-w-md` (28rem) | `AltairConfirmDialog` (new — no prior confirmation dialog existed to audit; sized for a short title + one line of consequence copy) |
| `md` (default) | `max-w-2xl` (42rem) | `CustomerEditControl`, `CustomerEquipmentSection` — the exact width both already used |
| `lg` | `max-w-3xl` (48rem) | `ExpenseReceiptPreview` — the exact width its viewer already used |

An `xl` step was deliberately **not** added. No current dialog in the
repository needed a fourth, wider step — adding one now would be a size
with no consumer, which the brief for this task explicitly rules out. Add
it in a future migration pass if a real dialog needs it.

`size` owns only maximum width. It never owns workflow-specific layout —
a two-column form inside a `md` dialog is the domain component's own grid,
not a Dialog concern.

## Composition examples

### 1. Standard form dialog

```tsx
<AltairDialog open={open} onOpenChange={setOpen} closeDisabled={isPending}>
  <AltairDialogContent size="md">
    <AltairDialogHeader>
      <div>
        <AltairDialogTitle>Edit customer</AltairDialogTitle>
        <AltairDialogDescription>
          Update contact details and service location.
        </AltairDialogDescription>
      </div>
      <AltairDialogClose disabled={isPending} />
    </AltairDialogHeader>

    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <AltairDialogBody>
        <CustomerForm />
      </AltairDialogBody>
      <AltairDialogFooter>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={isPending}>
          Save changes
        </Button>
      </AltairDialogFooter>
    </form>
  </AltairDialogContent>
</AltairDialog>
```

### 2. Async workflow dialog

Identical shape to the form dialog above — "async" is a state the domain
component tracks (`isPending` from `useTransition`, an error string, a
disabled submit button), not a different Dialog API. `closeDisabled`
during the pending window is the one contract addition: it disables
backdrop-click and Escape while a mutation is in flight, without touching
the close button itself (the domain component disables that directly, the
same way it already disables its own submit button).

### 3. Destructive confirmation dialog

```tsx
<AltairConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title={`Archive ${expense.expenseNumber}?`}
  description="Historical records will be preserved, but this expense will be hidden from active lists."
  confirmLabel="Archive"
  destructive
  pending={isPending}
  onConfirm={handleArchiveConfirmed}
  icon={<Archive className="h-4 w-4" />}
/>
```

`AltairConfirmDialog` never calls a delete/archive function itself —
`onConfirm` is always supplied by the caller, and the caller decides what
"destructive" means for that specific action (see "Destructive
confirmation composition" below).

## Close behavior

`AltairDialog` provides the *mechanics* of closing (a backdrop click and
Escape both call `onOpenChange(false)`), but the domain component decides
*whether* that is currently allowed:

- Pass `closeDisabled` (mirrors `MobileSheet`'s existing prop of the same
  name) while a Server Action is in flight, a payment is processing, or any
  other "unsafe to dismiss right now" state applies. This disables backdrop
  click and Escape only — it does not touch the close button.
- The close button (`AltairDialogClose`) and any Cancel button in the
  footer are always domain-rendered controls; disable them yourself with
  the same `isPending`/`disabled` value you already compute for the rest of
  the form. This is the same split `MobileSheet` already uses.
- `AltairDialog` never assumes every dialog should be backdrop-dismissible
  — it defaults to the mechanic being *available*, and the domain component
  is responsible for gating it with `closeDisabled` exactly where the
  pre-migration dialog already gated its own close affordances. No migrated
  dialog in this pass became easier to dismiss than it was before.

## Form compatibility

`AltairDialogBody` is a plain scrollable container — `Button`, `Input`,
`Textarea`, `Select`, and `Field` render inside it with no special wiring.
None of those primitives were modified for this task. A `<form>` can wrap
`AltairDialogBody` + `AltairDialogFooter` directly (see the form dialog
example above) so a submit button in the footer can use `type="submit"`
against that form, exactly like the pre-migration hand-rolled markup did.

## Destructive confirmation composition

`AltairConfirmDialog` exists because five components in the repository
(`CustomerLifecycleControl`, `ExpenseLifecycleControl`,
`InvoiceLifecycleControl`, `JobLifecycleControl`,
`ServiceItemLifecycleControl`, plus `EntityLifecycleBulkBar`) independently
re-implement the same shape — a title, one line of consequence copy, a
Cancel button, and a destructive/primary action — using the browser's
unstyled `window.confirm()`. That is genuinely repeated markup (the same
"title + consequence + Cancel + confirm" shape, copy-pasted per lifecycle
action) with a real visual/accessibility cost: `window.confirm()` cannot be
styled, cannot show a pending state, and blocks the entire tab synchronously
instead of supporting an async Server Action.

`AltairConfirmDialog` removes that duplication without becoming a generic
delete function:

- `onConfirm` is always supplied by the caller. The component never knows
  what "confirm" does.
- `destructive` only changes the confirm button's variant (Danger role)
  and the icon chip's tone — it never changes application state on its own.
- `pending` disables both actions, disables backdrop/Escape dismissal
  (`closeDisabled` under the hood), and shows a spinner on the confirm
  button via `Button`'s existing `loading` prop — no new pending-state
  mechanic was invented.
- There is no `entityType`, `onDelete`, or any other domain-specific prop.
  A caller composes the exact copy and action for its own workflow.

This pass migrated two of the six `*LifecycleControl` consumers
(`ExpenseLifecycleControl`, `InvoiceLifecycleControl`) to prove the pattern
holds across modules. The remaining four (`CustomerLifecycleControl`,
`JobLifecycleControl`, `ServiceItemLifecycleControl`,
`EntityLifecycleBulkBar`) are unmigrated — see "Migrate remaining dialogs"
below.

## North Star handling

Every migrated dialog renders the same `AltairDialog*` primitives in both
its legacy and North Star branches, exactly like the Table primitives.
`ExpenseReceiptPreview`'s existing North Star conditional (a different tint
on the header/body background) is preserved through plain `className`
passed to `AltairDialogContent`/`AltairDialogHeader`/`AltairDialogBody` —
the primitives themselves never branch on North Star and never import
`shared/design-system/north-star/tokens`. No dialog in this pass needed a
structurally different North Star composition (a different primitive
tree, not just different colors), so none was built. If one is ever
needed, extend `className` support further before creating a parallel
North Star dialog primitive.

## Mobile behavior

- `AltairDialogContent` is a bottom sheet on mobile (`rounded-t-2xl`,
  anchored to the bottom of the viewport via the overlay's
  `items-end`/`sm:items-center`) and a centered modal at `sm+` —the same
  responsive shape every migrated dialog already used pre-migration, now
  expressed once instead of five times.
- `AltairDialogHeader` applies `overlay-header-safe-mobile` (existing
  safe-area token) so the header respects the notch on mobile.
- `AltairDialogFooter` pads for `env(safe-area-inset-bottom)` so the last
  action row never sits under a home indicator, and stacks
  primary-under-secondary on mobile so the primary action lands in the
  thumb-reachable zone per the Foundation's Mobile section.
- `AltairDialog`/`AltairDialogContent` never use `MobileSheet`, and
  `MobileSheet.tsx` was not modified. `RecordPaymentForm` (Invoices) was
  intentionally **not** migrated in this pass — it already uses
  `MobileSheet` with `variant="responsive"`, which is exactly the
  "workflow that intentionally uses a mobile sheet" case this task's
  guardrails say to leave alone. Migrating its shell away from `MobileSheet`
  would touch mobile-sheet architecture for no material benefit, which is
  explicitly out of scope.

## Non-goals

- Not a modal registry, event bus, or imperative `openDialog()` API.
- No animation library — motion is two short CSS `@keyframes` rules with a
  `prefers-reduced-motion` fallback, not a dependency.
- No new accessibility dependency (no Radix/Headless UI) — the project had
  none installed, so this wraps the same scroll-lock/Escape hooks and
  focus-trap mechanic already proven in `MobileSheet`, extracted into
  `shared/hooks/useDialogFocusTrap.ts` rather than duplicated a third time.
  `MobileSheet.tsx` itself was not touched.
- No `AltairDialogSection` — no migrated dialog needed sub-section grouping.
- No generic/automatic delete function on `AltairConfirmDialog` — every
  destructive action stays domain-owned.
- No `xl` size — no current consumer.
- Does not migrate every dialog in the repository — see below.

## Migrated in this pass (5)

| Component | Module | Category |
|---|---|---|
| `CustomerEditControl` | Customers | Standard create/edit form dialog |
| `CustomerEquipmentSection` | Customers | Transactional dialog with async submission |
| `ExpenseLifecycleControl` | Expenses | Destructive/irreversible confirmation |
| `InvoiceLifecycleControl` | Invoices | Destructive/irreversible confirmation (proves cross-module reuse) |
| `ExpenseReceiptPreview` | Expenses | Workflow/action overlay (receipt viewer) |

## Recommended next task

**Migrate remaining dialogs to canonical Dialog.** Known unmigrated
`fixed inset-0` / `window.confirm` dialogs, for the next pass:
`CustomerLifecycleControl`, `JobLifecycleControl`,
`ServiceItemLifecycleControl`, `EntityLifecycleBulkBar` (bulk destructive
actions), `InvoiceStatusActions`' inline void-confirm card, and
`TeamMembersTable`'s inline suspend/reactivate/cancel-invite confirm row.
