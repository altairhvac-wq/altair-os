# Altair V2 Design System Components

Reusable visual building blocks for Altair OS V2. Do not wire these into production pages until a deliberate adoption pass.

**Design Lab:** Visual review of all V2 components with realistic sample content at `/altair-design-lab` (internal route — not in admin nav).

## HeroHeader

The top section of an Altair page. Answers: **"What should I do next?"**

### Import

```tsx
import { HeroHeader } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Primary page headline |
| `eyebrow` | `string` | No | Small uppercase context label above the title |
| `description` | `string` | No | Supporting copy beneath the title |
| `primaryAction` | `HeroAction` | No | Main call-to-action |
| `secondaryAction` | `HeroAction` | No | Secondary call-to-action |
| `highlights` | `HeroHighlight[]` | No | Story-first metric summaries |
| `insight` | `HeroInsight` | No | Proactive guidance or context |
| `className` | `string` | No | Additional wrapper classes |

### Action shape

```tsx
type HeroAction = {
  label: string;
  href?: string;      // renders a Next.js Link
  onClick?: () => void; // renders a button
};
```

Use `href` for navigation. Use `onClick` for in-page actions. If both are provided, `href` takes precedence.

### Tone values

`highlights[].tone` and `insight.tone` accept: `"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`.

### Example

```tsx
<HeroHeader
  eyebrow="Command Center"
  title="Today requires attention in 2 areas."
  description="Dispatch and billing need a quick review before the afternoon crew heads out."
  primaryAction={{ label: "Review priorities", href: "/dispatch" }}
  secondaryAction={{ label: "View schedule", href: "/dispatch?view=schedule" }}
  highlights={[
    { label: "Behind schedule", value: "3 jobs", tone: "warning" },
    { label: "Ready to invoice", value: "$4,200", tone: "success" },
    { label: "Follow-ups due", value: "5 leads", tone: "info" },
  ]}
  insight={{
    label: "Recommendation",
    text: "Following up with 3 customers could recover stalled estimates this week.",
    tone: "info",
  }}
/>
```

### Design notes

- Soft surface, rounded corners, subtle shadow — calm and premium, not flashy
- Actions stack full-width on mobile; sit inline on larger screens
- Highlights use story labels + values, not raw dashboard tiles
- Insight is optional; use it for proactive guidance, not decoration
- Not yet adopted on production routes — build and validate in isolation first

---

## PriorityCard

Surfaces an action item that needs attention. Answers: **"What needs my attention?"**

### Import

```tsx
import { PriorityCard } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Primary headline for the priority |
| `description` | `string` | No | Supporting context |
| `tone` | `PriorityCardTone` | No | Visual emphasis — defaults to `"neutral"` |
| `eyebrow` | `string` | No | Small uppercase label above the title |
| `action` | `PriorityCardAction` | No | Optional call-to-action |
| `meta` | `string` | No | Secondary detail (timing, count, source) |
| `className` | `string` | No | Additional wrapper classes |

### Action shape

```tsx
type PriorityCardAction = {
  label: string;
  href?: string;      // renders a Next.js Link
  onClick?: () => void; // renders a button
};
```

Use `href` for navigation. Use `onClick` for in-page actions. If both are provided, `href` takes precedence.

### Tone values

`"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`

### Example

```tsx
<PriorityCard
  eyebrow="Billing"
  tone="warning"
  title="2 invoices are overdue."
  description="Customers have not responded to payment reminders sent last week."
  meta="Oldest: 12 days past due"
  action={{ label: "Review invoices", href: "/invoices?status=overdue" }}
/>
```

---

## MetricCard

Shows one important number with context. Answers: **"What is happening?"**

### Import

```tsx
import { MetricCard } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Metric name or category |
| `value` | `string` | Yes | The primary number or summary |
| `description` | `string` | No | Supporting explanation |
| `trend` | `string` | No | Change or momentum context |
| `tone` | `MetricCardTone` | No | Visual emphasis — defaults to `"neutral"` |
| `className` | `string` | No | Additional wrapper classes |

### Tone values

`"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`

### Example

```tsx
<MetricCard
  label="Ready to invoice"
  value="$4,200"
  trend="3 completed jobs"
  tone="success"
  description="Completed work waiting for office review."
/>
```

---

## StatusPill

Reusable status badge. Answers: **"What is the state of this item?"**

### Import

```tsx
import { StatusPill } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `React.ReactNode` | Yes | Badge label |
| `tone` | `StatusPillTone` | No | Visual emphasis — defaults to `"neutral"` |
| `size` | `"sm"` \| `"md"` | No | Badge size — defaults to `"md"` |
| `className` | `string` | No | Additional wrapper classes |

### Tone values

`"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`

### Example

```tsx
<StatusPill tone="warning" size="sm">
  Overdue
</StatusPill>
```

---

## InsightCard

Surfaces a useful intelligent insight without making AI feel like a gimmick. Answers: **"What is my business telling me?"**

### Import

```tsx
import { InsightCard } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Insight headline |
| `insight` | `string` | Yes | Primary insight copy |
| `recommendation` | `string` | No | Optional follow-up recommendation |
| `tone` | `InsightCardTone` | No | Visual emphasis — defaults to `"neutral"` |
| `eyebrow` | `string` | No | Small uppercase label above the title |
| `action` | `InsightCardAction` | No | Optional call-to-action — omit to hide action area |
| `className` | `string` | No | Additional wrapper classes |

### Action shape

```tsx
type InsightCardAction = {
  label: string;
  href?: string;      // renders a Next.js Link
  onClick?: () => void; // renders a button
};
```

Use `href` for navigation. Use `onClick` for in-page actions. If both are provided, `href` takes precedence.

### Tone values

`"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`

### Example

```tsx
<InsightCard
  eyebrow="Intelligence"
  tone="info"
  title="Estimate follow-ups could recover stalled revenue."
  insight="Three sent estimates have had no response in over a week."
  recommendation="A brief check-in with these customers often moves stalled quotes forward."
  action={{ label: "Review estimates", href: "/estimates?status=sent" }}
/>
```

### Design notes

- Calm, factual tone — intelligence from business logic, not flashy AI chrome
- Recommendation renders in a nested callout when provided
- No action area when `action` is omitted
- Not yet adopted on production routes

---

## PulseCard

Shows business health or operational condition. Answers: **"How is the business doing?"**

### Import

```tsx
import { PulseCard } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Pulse category or area name |
| `status` | `string` | Yes | Current condition label (rendered in StatusPill) |
| `description` | `string` | No | Supporting context |
| `tone` | `PulseCardTone` | No | Visual emphasis — defaults to `"neutral"` |
| `trend` | `string` | No | Momentum or change context |
| `meta` | `string` | No | Secondary detail (timing, source) |
| `className` | `string` | No | Additional wrapper classes |

### Tone values

`"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`

### Example

```tsx
<PulseCard
  label="Dispatch"
  status="Healthy"
  tone="success"
  description="All scheduled jobs are assigned and on track for today."
  trend="12 jobs dispatched"
  meta="Updated just now"
/>
```

### Design notes

- Status renders via `StatusPill` for consistent tone vocabulary
- Trend and meta stack on mobile; align right on larger screens
- Not yet adopted on production routes

---

## ActionCard

Presents a clear next action. Answers: **"What should I do next?"**

### Import

```tsx
import { ActionCard } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Action headline |
| `description` | `string` | No | Supporting context |
| `action` | `ActionCardAction` | Yes | Required call-to-action |
| `tone` | `ActionCardTone` | No | Visual accent — defaults to `"neutral"` |
| `eyebrow` | `string` | No | Small uppercase label above the title |
| `meta` | `string` | No | Secondary detail (timing, count, source) |
| `className` | `string` | No | Additional wrapper classes |

### Action shape

```tsx
type ActionCardAction = {
  label: string;
  href?: string;      // renders a Next.js Link
  onClick?: () => void; // renders a button
};
```

Use `href` for navigation. Use `onClick` for in-page actions. If both are provided, `href` takes precedence.

### Tone values

`"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`

### Example

```tsx
<ActionCard
  eyebrow="Billing"
  tone="warning"
  title="Send 2 draft invoices before end of day."
  description="Completed jobs are waiting for office review and billing."
  meta="Oldest draft: 3 days"
  action={{ label: "Review drafts", href: "/invoices?status=draft" }}
/>
```

### Design notes

- Primary CTA styling (cyan) — action is the focal point
- Left accent border follows PriorityCard tone pattern
- `action` is required — card always renders an action control
- Not yet adopted on production routes

---

## CelebrationBanner

Celebrates progress, completion, or positive momentum without feeling gamified. Answers: **"What went well?"**

### Import

```tsx
import { CelebrationBanner } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Celebration headline |
| `description` | `string` | No | Supporting context |
| `tone` | `CelebrationBannerTone` | No | Visual emphasis — defaults to `"success"` |
| `action` | `CelebrationBannerAction` | No | Optional follow-up action — omit to hide action area |
| `className` | `string` | No | Additional wrapper classes |

### Action shape

```tsx
type CelebrationBannerAction = {
  label: string;
  href?: string;      // renders a Next.js Link
  onClick?: () => void; // renders a button
};
```

Use `href` for navigation. Use `onClick` for in-page actions. If both are provided, `href` takes precedence.

### Tone values

`"success"` | `"info"` | `"neutral"`

### Example

```tsx
<CelebrationBanner
  tone="success"
  title="All office priorities are complete."
  description="Dispatch, billing, and follow-ups are caught up for today."
  action={{ label: "View command center", href: "/" }}
/>
```

### Design notes

- Soft tinted surface — calm acknowledgment, not confetti or gamification
- Uses `role="status"` and `aria-live="polite"` for screen reader awareness
- Optional action uses secondary button styling
- Not yet adopted on production routes

---

## Button

Canonical Altair action primitive. Expresses one of the four approved action
types from `docs/altair/ALTAIR_DESIGN_FOUNDATION.md` ("Buttons" section) —
`primary`, `secondary`, `destructive`, `quiet` — and nothing else. This is
the first and, for now, the *only* migrated consumer of `Button`; every
other button surface in the product (admin `admin-btn-*`, Master Shell
`masterListPagePrimaryActionClass`/`masterSecondaryActionClass`, North Star,
technician, auth, MobileSheet footers) remains on its existing contract
until a deliberate future adoption pass.

### Import

```tsx
import { Button } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `"primary"` \| `"secondary"` \| `"destructive"` \| `"quiet"` | No | Action hierarchy — defaults to `"primary"` |
| `size` | `"sm"` \| `"md"` | No | Defaults to `"md"` (matches the current `admin-btn-*` footprint) |
| `href` | `string` | No | Renders a Next.js `Link` instead of a `<button>`. Mutually exclusive with `type` |
| `type` | `"button"` \| `"submit"` \| `"reset"` | No | Native button type. Not allowed together with `href` — the TypeScript API rejects that combination |
| `disabled` | `boolean` | No | Native `disabled` for the button branch; renders an inert, non-navigating element for the `href` branch |
| `loading` | `boolean` | No | Shows a decorative spinner, sets `aria-busy`, and blocks activation on both branches |
| `leadingIcon` | `ReactNode` | No | Rendered before the label, `aria-hidden`. Suppressed while `loading` |
| `trailingIcon` | `ReactNode` | No | Rendered after the label, `aria-hidden`. Suppressed while `loading` |
| `className` | `string` | No | Additive layout classes only — see the extension policy below |

### Button vs Link

`Button` is a discriminated union: pass `href` for navigation (renders a
Next.js `Link`), or omit it for an in-page action (renders a native
`<button>`). The two branches are mutually exclusive at the type level —
`href` together with `type="submit"` does not type-check.

```tsx
<Button onClick={handleSave}>Save changes</Button>
<Button href="/customers/new" variant="secondary">Add customer</Button>
```

### Disabled and loading

A disabled or loading `href` button never renders a live `<a>` — it renders
an inert element instead, because an anchor can be activated by more than
`onClick` (middle click, ctrl/cmd+click, keyboard), so `aria-disabled` alone
on a real anchor would not prevent navigation. The button branch uses the
native `disabled` attribute, which already blocks activation and removes
the control from tab order.

### Class extension policy

`className` exists for additive layout only — width, alignment, margin in
composition contexts, responsive visibility. It is not a supported way to
override background, foreground, border, radius, padding, or focus
treatment; Tailwind's cascade does not guarantee a caller's classes win
over the variant's own classes, so attempting to override core styling
through `className` is unsupported and may render inconsistently. If a
screen needs a fifth visual treatment, that is a signal to extend `Button`,
not to override it from a call site.

### Design notes

- Every variant's focus ring reuses that variant's own foreground token as
  the ring color and background token as the ring-offset color, so it
  inherits the same contrast proof as the label text (see the Foundation
  audit's contrast matrix for exact ratios).
- Primary uses `bg-altair-graphite` / `text-altair-paper` rather than a
  Brass fill — pairing Brass with Ink text was measured to fail contrast in
  the dark theme (Ink flips light-on-light against Brass there). Brass
  appears only as a hover/active border accent on Primary, consistent with
  the Foundation's "Brass appears on Graphite as the accent" relationship.
- Not yet adopted anywhere except `EmptyState`.

---

## EmptyState

Replaces dead empty states with helpful, calm guidance. Answers: **"What should I do here?"**

### Import

```tsx
import { EmptyState } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Empty-state headline |
| `description` | `string` | No | Guidance or next-step context |
| `action` | `EmptyStateAction` | No | Primary call-to-action |
| `secondaryAction` | `EmptyStateAction` | No | Secondary call-to-action |
| `tone` | `EmptyStateTone` | No | Visual accent — defaults to `"neutral"` |
| `className` | `string` | No | Additional wrapper classes |

### Action shape

```tsx
type EmptyStateAction = {
  label: string;
  href?: string;      // renders a Next.js Link
  onClick?: () => void; // renders a button
};
```

Use `href` for navigation. Use `onClick` for in-page actions. If both are provided, `href` takes precedence.

### Tone values

`"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`

### Example

```tsx
<EmptyState
  title="No customers yet."
  description="Add your first customer to start tracking jobs, estimates, and invoices in one place."
  action={{ label: "Add customer", href: "/customers/new" }}
  secondaryAction={{ label: "Import CSV", href: "/customers/import" }}
/>
```

### Design notes

- Centered layout with dashed border — clearly distinct from content cards
- Actions render through the canonical `Button` primitive (`variant="primary"` /
  `variant="secondary"`) — the first production-compatible `Button` pilot
- No action area when both `action` and `secondaryAction` are omitted
- Not yet adopted on production routes

---

## WorkspaceSection

Reusable section wrapper for page content. Answers: **"What am I working on in this area?"**

### Import

```tsx
import { WorkspaceSection } from "@/shared/design-system/components";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | No | Section headline |
| `description` | `string` | No | Supporting context |
| `action` | `WorkspaceSectionAction` | No | Optional section-level action — omit to hide action area |
| `children` | `React.ReactNode` | Yes | Section body content |
| `tone` | `WorkspaceSectionTone` | No | Left accent emphasis — defaults to `"neutral"` |
| `className` | `string` | No | Additional wrapper classes |

### Action shape

```tsx
type WorkspaceSectionAction = {
  label: string;
  href?: string;      // renders a Next.js Link
  onClick?: () => void; // renders a button
};
```

Use `href` for navigation. Use `onClick` for in-page actions. If both are provided, `href` takes precedence.

### Tone values

`"neutral"` | `"success"` | `"warning"` | `"danger"` | `"info"`

### Example

```tsx
<WorkspaceSection
  title="Today's jobs"
  description="Scheduled work for your crew."
  tone="info"
  action={{ label: "View dispatch", href: "/dispatch" }}
>
  {/* job cards, lists, or other workspace content */}
</WorkspaceSection>
```

### Design notes

- Semantic `<section>` wrapper with optional left-accent header
- Header omitted when `title`, `description`, and `action` are all absent — children still render
- Left accent border follows PriorityCard tone pattern
- Not yet adopted on production routes
