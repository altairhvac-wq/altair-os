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
