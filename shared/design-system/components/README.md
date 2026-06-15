# Altair V2 Design System Components

Reusable visual building blocks for Altair OS V2. Do not wire these into production pages until a deliberate adoption pass.

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
