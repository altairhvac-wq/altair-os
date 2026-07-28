# Altair Documentation

Long-term documentation architecture for Altair.

This tree organizes documents by purpose. It does not rewrite Altair.

For the audit that produced this structure, see [`DOCUMENTATION_ARCHITECTURE.md`](./DOCUMENTATION_ARCHITECTURE.md).

## Categories

| Folder | Purpose | Classification |
|--------|---------|----------------|
| [`foundation/`](./foundation/) | Permanent company foundation: mission, standard, personality, principles, Canon | Product Vision & Philosophy |
| [`design/`](./design/) | Product UI design constitution, art direction, experience map, components | Design / Foundation |
| [`product/`](./product/) | Product state, inventory, roadmap | Product (living state) |
| [`development/`](./development/) | Session workflow, operations/observability guides | Development Guides |
| [`architecture/`](./architecture/) | Architecture index + stubs to archived blueprints | Architecture |
| [`marketing/`](./marketing/) | Homepage narrative, capture guides, living reference targets | Marketing |
| [`creative/`](./creative/) | Creative Studio: Brand, prompts, canon image library | Creative Production |
| [`reference/`](./reference/) | Checklists, QA, audits, launch readiness | Reference |
| [`archive/`](./archive/) | Obsolete or closed validation artifacts | Historical / Archive |

## Authority

1. **Foundation** — mission, standard, personality, principles
2. **Canon** (`foundation/ALTAIR_CANON.md`) — Altair creative world
3. **Design** — product UI constitution and experience architecture
4. **Product docs** — shipped truth and sprint state
5. **Development guides** — session workflow and operations foundation
6. **Creative tools** — prompt library, image library, design language
7. **Marketing / Reference / Architecture index** — working and operational docs
8. **Archive** — historical only

Logo mark production assets and guidelines remain in `/branding/` (asset-adjacent).

## Recommended reading order

1. `foundation/The_Altair_Mission.md`
2. `foundation/The_Altair_Principles.md`
3. `foundation/The_Altair_Standard.md`
4. `foundation/The_Altair_Personality.md`
5. `foundation/ALTAIR_CANON.md`
6. `product/ALTair_MASTER_STATUS.md`
7. `product/ALTair_BRAIN.md`
8. `design/ALTAIR_DESIGN_FOUNDATION.md`
9. `creative/Brand/ALTAIR_DESIGN_LANGUAGE.md` (when doing creative work)

## What does not belong in docs/

- Production logo SVGs and exploration assets → `/branding/`
- Design-system implementation → `/shared/design-system/`
- Generated build output, secrets, local auth state
