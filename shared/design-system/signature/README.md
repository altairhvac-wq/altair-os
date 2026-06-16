# Altair V2 Signature Layer

Visual brand primitives for **Horizon Intelligence** — Altair's visual identity system.

These are **not** business components. They do not fetch data, handle actions, or encode workflows. They create atmosphere, depth, and calm visual rhythm across the platform.

Do not wire these into production pages until a deliberate adoption pass.

## Philosophy

Signature primitives exist to reduce mental load — not to decorate.

Every element should feel like standing above your business and seeing the horizon:

- **Atmosphere** — soft gradients and ambient glows that breathe
- **Terrain** — layered depth suggesting landscape without imagery
- **Light** — subtle focal points that guide attention
- **Horizon** — gentle section transitions instead of harsh dividers
- **Momentum** — lightweight acknowledgment of progress

## Import

```tsx
import {
  AtmosphereBackground,
  BusinessTerrain,
  HorizonHero,
  LightBeam,
  HorizonDivider,
  MomentumStrip,
} from "@/shared/design-system/signature";
```

## AtmosphereBackground

Creates subtle ambient atmosphere behind page content.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | `"neutral"` \| `"cyan"` \| `"warm"` \| `"success"` | `"neutral"` | Color temperature of ambient glow |
| `intensity` | `"subtle"` \| `"medium"` | `"subtle"` | Glow strength |
| `className` | `string` | — | Additional wrapper classes |
| `children` | `React.ReactNode` | — | Content rendered above atmosphere layers |

### Example

```tsx
<AtmosphereBackground tone="cyan" intensity="subtle" className="rounded-2xl p-6">
  <HeroHeader title="Today requires attention in 2 areas." />
</AtmosphereBackground>
```

---

## BusinessTerrain

CSS-only horizon landscape with layered depth. No images.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"mountains"` \| `"rolling"` \| `"minimal"` | `"mountains"` | Terrain silhouette style |
| `className` | `string` | — | Additional wrapper classes |

### Example

```tsx
<div className="relative">
  <AtmosphereBackground tone="neutral">
    {/* hero content */}
  </AtmosphereBackground>
  <BusinessTerrain variant="mountains" />
</div>
```

---

## LightBeam

Soft vertical light and horizon glow. Never distracting.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `"center"` \| `"left"` \| `"right"` | `"center"` | Horizontal placement of the beam |
| `tone` | `"neutral"` \| `"cyan"` \| `"warm"` | `"cyan"` | Light color temperature |
| `className` | `string` | — | Additional wrapper classes |

Position this inside a `relative` container. The beam fills the container absolutely.

### Example

```tsx
<div className="relative min-h-[200px]">
  <LightBeam position="center" tone="cyan" />
  <div className="relative">{/* content */}</div>
</div>
```

---

## HorizonDivider

Replaces harsh section separations with soft fade transitions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"fade"` \| `"glow"` \| `"line"` | `"fade"` | Divider style |
| `className` | `string` | — | Additional wrapper classes |

### Example

```tsx
<WorkspaceSection title="Today's Focus">{/* priorities */}</WorkspaceSection>
<HorizonDivider variant="glow" className="my-6" />
<WorkspaceSection title="Business Pulse">{/* pulse cards */}</WorkspaceSection>
```

---

## MomentumStrip

Displays small business wins in a lightweight, non-gamified format.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `{ label: string }[]` | Yes | List of momentum wins |
| `className` | `string` | No | Additional wrapper classes |

### Example

```tsx
<MomentumStrip
  items={[
    { label: "8 jobs completed" },
    { label: "4 invoices paid" },
    { label: "3 estimates sent" },
    { label: "Dispatch caught up" },
  ]}
/>
```

---

## HorizonHero

Production-safe signature hero band — composes `AtmosphereBackground` + `LightBeam` + content slot.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tone` | AtmosphereTone | `"cyan"` | Ambient glow temperature |
| `beamTone` | LightBeamTone | `"cyan"` | Light beam color |
| `beamPosition` | `"center"` \| `"left"` \| `"right"` | `"center"` | Beam placement |
| `size` | `"compact"` \| `"standard"` | `"standard"` | Padding and radius scale |
| `className` | `string` | — | Wrapper classes |
| `contentClassName` | `string` | — | Inner content padding override |

Pair frosted content with `signatureHeroContentClass` from shell tokens.

## Composition Pattern

Typical hero atmosphere stack:

```tsx
<section className="relative overflow-hidden rounded-2xl">
  <AtmosphereBackground tone="cyan" intensity="subtle" className="px-6 py-8">
    <LightBeam position="center" tone="cyan" />
    {/* HeroHeader or page hero content */}
  </AtmosphereBackground>
  <BusinessTerrain variant="rolling" />
</section>
```

## Constraints

- Tailwind only — no external libraries
- CSS only — no images
- No animations
- Server components — no browser APIs, no `"use client"`
- Mobile responsive
- Decorative layers use `aria-hidden="true"` and `pointer-events-none`

## Status

**G1 (Signature Visual Layer pass 1)** — production adoption started on Dashboard, list metric strips, Dispatch header band, and Customers empty state pilot.

Use `HorizonHero` + shell tokens (`signatureHeroContentClass`) for hero bands. Do not copy page-local prototype markup inline.
