# Altair Design Foundation — semantic token layer

Authoritative spec: `docs/altair/ALTAIR_DESIGN_FOUNDATION.md`. This folder is the
implementation of that document's Color System section — nothing more. Read
the Foundation before changing anything here.

## Status

**Infrastructure only.** This layer defines the tokens; no page or component
consumes them yet. Introducing it changes no rendered pixel. Future phases
migrate existing legacy and North Star colors onto this layer — see the
Foundation's "Migration Philosophy" section.

## The hierarchy

```
Material               (Graphite, Stone, Paper, Ink, Brass — the Foundation's five materials)
   ↓
Semantic token          (--altair-*, this folder — the only approved names for a material's color)
   ↓
Component               (Button, Card, Table, Badge, ... — consumes a token, never a raw hex)
   ↓
Page                    (composes components — never reaches past them for a color)
```

A page never depends on a raw color. A component never depends on a raw
color. Only the semantic token layer is allowed to know an actual hex value.
Changing a palette later — a brighter Brass, a cooler Stone — means changing
values in exactly one place (`app/globals.css`) instead of hunting through
every page and component that happened to hardcode that color.

## Where the tokens live

| Layer | File | Purpose |
|---|---|---|
| CSS custom properties | `app/globals.css` (`:root` and `[data-theme="dark"]`) | The actual values, light and dark |
| Tailwind utilities | `app/globals.css` (`@theme inline`) | Generates `bg-altair-*`, `text-altair-*`, `border-altair-*`, etc. |
| TypeScript reference | `altair-tokens.ts` | Typed role names + `var(--altair-*)` accessor for non-Tailwind contexts (inline styles, SVG, chart libraries) |

There is one canonical set of tokens, not a parallel system per module. Do not
add a second token file for a specific page or feature — extend this one.

## The sixteen roles

Each role maps to one of the Foundation's five materials or its Color System
table. Values are defined once per theme scope; the role name never changes.

| Token | Material / role | Foundation reference |
|---|---|---|
| `stone` | Stone — secondary structural backing | "Secondary Surface" |
| `paper` | Paper — the work surface | "Primary Surface" |
| `paper-elevated` | Paper, brightest register | "Elevated Surface" |
| `paper-subtle` | Paper, palest/quietest register | "Canvas" |
| `graphite` | Graphite — the operating shell | "Canvas / Primary Surface (chrome)" |
| `ink` | Ink, full strength | "Primary Text" |
| `ink-secondary` | Ink, supporting strength | "Secondary Text" |
| `ink-muted` | Ink, quietest strength | "Muted Text" |
| `border` | Quiet separation | "Border" |
| `border-strong` | Deliberate emphasis (selection, focus) | "Strong Border" |
| `brass` | Brass — the one command per screen | "Primary Command" |
| `brass-interactive` | Brass, hover/active state | (Primary Command interaction state) |
| `success` | Completed / healthy / resolved | "Success" |
| `warning` | Needs attention soon | "Warning" |
| `danger` | Failed / blocking | "Danger" |
| `information` | Neutral system communication | "Information" |

`brass` and `brass-interactive` must never be reused to represent status —
use `success` / `warning` / `danger` / `information` instead. This mirrors the
Foundation's rule that command and status must never visually collide.

## Light and dark, one component

Every token has a light value (`:root`) and a dark value (`[data-theme="dark"]`).
A component that writes `bg-altair-paper` never branches on theme — the value
resolves correctly wherever it renders. No `.dark`-prefixed Tailwind variants
and no theme-conditional logic should ever be needed inside a component for
color alone.

No theme toggle exists yet; `[data-theme="dark"]` is the reserved attribute
hook for whenever that lands. Adding it here now costs nothing today and
avoids a second migration later.

## Rules for anyone touching UI color after this phase

- Never introduce a raw hex value in a component or page. If the semantic
  layer doesn't have the right role, propose a new one here — do not reach
  for an arbitrary value "just this once."
- Never create a second token system for a specific page, module, or
  North Star variant. Extend this one.
- Prefer the Tailwind utility (`bg-altair-paper`) over the CSS variable
  (`var(--altair-paper)`) over the TypeScript helper (`altairToken("paper")`),
  in that order — reach for the TypeScript helper only where Tailwind classes
  genuinely cannot apply (inline styles, SVG, canvas/chart libraries).
