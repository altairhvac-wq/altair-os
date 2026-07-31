# Compact-by-Default Layout

Reusable composition infrastructure for compact informational modules. This
layer extends the Altair Design Foundation; it does not introduce new colors,
borders, typography, motion, or business behavior.

## ModuleGrid

`ModuleGrid` provides the shared responsive rhythm:

- mobile: one column
- tablet: two columns
- desktop: three columns

Children declare a `span` of `1`, `2`, or `3` through `ModuleGridItem`. A
three-column item safely occupies both available columns at tablet widths.
Tables, dispatch boards, calendars, kanban, maps, charts, and document editors
remain full-span workspace content.

## Card size contract

`CardSize` is semantic metadata, not a width utility:

- `xs`: single decision
- `s`: compact information
- `m`: standard module
- `l`: dual-width module
- `xl`: workspace

The contract deliberately applies no width or max-width. Page composition owns
span through `ModuleGridItem` or another page-specific layout.

## DecisionSurface

`DecisionSurface` composes a small informational surface from optional title,
eyebrow, icon, description, actions, footer, progress, status, and body slots.
It owns no business language or behavior.

Use the existing Surface Hierarchy variants (`card`, `section`, or `tile`) for
new modules. Use `variant="bare"` when migrating an established surface so its
existing material treatment remains unchanged.
