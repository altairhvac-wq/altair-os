# ALTAIR ART DIRECTION

We are not building software.

We are building an environment.

Altair should feel like standing above your business and seeing the entire horizon.

## Design Philosophy

The interface should feel:

* Calm
* Spacious
* Guided
* Intelligent
* Premium
* Confident

The interface should never feel:

* Dense
* Corporate
* Spreadsheet-like
* Generic SaaS
* Widget-heavy
* Overwhelming

---

# Horizon Intelligence

Altair's visual identity is called:

Horizon Intelligence

Users should feel like they are looking over their business from above.

The software should feel like a horizon, not a collection of tools.

---

# Experience Hierarchy

Pages should follow this hierarchy:

1. Hero (40%)

The page should establish emotional context.

2. Focus (25%)

What needs attention.

3. Pulse (20%)

What is healthy.

4. Opportunities (10%)

What could improve.

5. Momentum (5%)

What is going well.

---

# Atmosphere

Every page should contain subtle atmosphere.

Atmosphere examples:

* Soft gradients
* Horizon lines
* Light beams
* Terrain shapes
* Ambient glows
* Depth layers

Atmosphere should never become decoration.

Atmosphere exists to reduce mental load.

---

# Software Reduction

Reduce:

* Cards
* Borders
* Widgets
* Tables

Increase:

* Stories
* Space
* Hierarchy
* Guidance

---

# The Golden Rule

Users should feel:

"I am running my company."

Not:

"I am using software."

---

# Living Note (2026-06-17)

Master Shell V2, Visual Polish A–F, and Micro-Interaction A–B are **complete** on major admin surfaces. **North Star Phase M1 is complete** — grouped desktop left sidebar live behind `NEXT_PUBLIC_NORTH_STAR_SHELL=true`. Legacy horizontal nav when flag off; mobile nav and page interiors unchanged.

M1 was shell/chrome migration only — not a dashboard redesign. Command hero, slate operating backing, and ivory work cards remain **M2+** targets. Next: M1 polish and screenshot review, then M2 dashboard planning. Do **not** start M2 until M1 is stable.

Do not loop on small polish passes or new palette concepts. See `ALTair_MASTER_STATUS.md` for scope, preserves, and anti-patterns.

---

# Approved North Star Shell Direction (2026-06-16)

**Status:** Founder-approved. Concept iteration stops here.

After multiple isolated concept routes and palette explorations, the preferred shell direction is:

**Mission Control Original Refined**

## Visual Formula

**Graphite shell + brass command accents + slate operating backing + ivory work cards.**

| Layer | Treatment |
|-------|-----------|
| **Shell** | Dark graphite grouped left sidebar |
| **Command** | Brass/gold accents; dark command hero |
| **Operating canvas** | Slate/blue backing behind lower operating sections |
| **Work surfaces** | Ivory cards on slate backing |
| **Typography** | Readable dark text on light cards |
| **Status** | Semantic status colors kept separate from brand/command accents |

## What Worked

- Grouped left sidebar
- Dark graphite shell
- Command hero / operating picture
- “Do this first” primary action
- Action / Work / Money operating model
- Slate backing behind lower operating sections
- Ivory cards on slate backing
- Brass/gold as command/brand accent
- Small cool field-ops signal is okay if restrained

## What Did Not Work

- Full light SaaS
- Paper/report dashboard
- Full dark cyber/cyan dashboard
- Strict black/gold token purity that killed visual richness
- Beige/ivory-only workspace with no contrast
- Changing layout and palette at the same time

## Founder Decision

This direction is **good enough** to stop concept iteration for now.

- Do **not** keep creating more palette concepts.
- Do **not** keep redesigning the shell blindly.
- Future work should use this as the current preferred North Star direction.

## Production vs Concept

| Surface | Status |
|---------|--------|
| **Production app (M1)** | Grouped desktop left sidebar when `NEXT_PUBLIC_NORTH_STAR_SHELL=true`; legacy horizontal nav when off; mobile nav and page interiors unchanged |
| **Production app (M2+)** | Dashboard pilot next — command hero, “Do this first”, Action/Work/Money board; then list/detail pilots |
| **Concept routes** | Research/reference only — not production targets to copy wholesale |

**Primary reference:** `/altair-shell-color-lab-v1` — palette `mission-control-refined` (Mission Control Original Refined).

**Other concept routes (retain, do not delete):** `/altair-shell-north-star-v1`, `/altair-shell-north-star-v2`, `/altair-shell-north-star-v3`, `/command-center-v1`, `/workspace-v1`, `/altair-design-lab`.

## Next Step: M1 Polish, Then M2 Dashboard Planning

North Star M1 landed the grouped desktop shell behind a flag. The next design track is **M1 polish and screenshot review**, then **M2 dashboard pilot planning** — not additional palette exploration or blind shell redesign. **Do not start M2 implementation until M1 is considered stable.**

### Phased Migration

| Phase | Focus | Status |
|-------|-------|--------|
| **M1** | Grouped left sidebar shell (desktop admin chrome) | **Complete** — `NEXT_PUBLIC_NORTH_STAR_SHELL=true` |
| **M2** | Dashboard pilot — command hero, “Do this first”, Action/Work/Money board | **Planning** |
| **M3** | One list page pilot — e.g. Customers; ivory cards on slate backing, brass command accents | **Planned** |
| **M4** | One detail page pilot — e.g. Customer 360 or Job detail; section rhythm without one-off decoration | **Planned** |

### M2 Scope (Dashboard Pilot Only — Planning, Not Started)

- Mission Control hero
- “Do this first” primary action
- Action / Work / Money operating board
- Real production dashboard data preserved
- Existing queues and actions preserved
- **Not in M2:** Dispatch redesign, billing redesign, mobile redesign

### Non-Negotiable Preserves

- Routes
- Supabase / RLS / server actions
- Billing / print / overlay behavior
- Dispatch behavior (board internals, mobile sheets, workbench row)
- Do **not** productionize concept routes wholesale

See `ALTair_MASTER_STATUS.md`, `ALTair_V2_ROADMAP.md` Phase 9, and `shared/design-system/shell/README.md` for migration sequencing and shell constraints.
