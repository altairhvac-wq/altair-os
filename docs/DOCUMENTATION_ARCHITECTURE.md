# Altair Documentation Architecture Audit

**Date:** 2026-07-27  
**Scope:** `/docs` organization only (no application code changes)  
**Commit intent:** `docs: reorganize documentation architecture`

---

## Verdict

Altair already had a useful top-level split (`foundation`, `product`, `marketing`, `creative`, `architecture`, `reference`), but `product/` and `marketing/` had become mixed living-truth + closed validation artifact dumps, and product UI design / development workflow docs were conflated with product state.

This pass introduces three durable categories—`design/`, `development/`, and `archive/`—moves closed artifacts and obsolete architecture notes into archive, and leaves path stubs where older links or code comments still point at previous locations.

---

## Classification model

| Category | Docs home | Why |
|----------|-----------|-----|
| Product Vision & Philosophy | `foundation/` | Permanent company truth (mission, standard, personality, principles, Canon) |
| Design / Foundation (product UI) | `design/` | Product interface constitution; distinct from company philosophy and creative photography |
| Product (living state) | `product/` | What shipped, sprint scope, inventory, roadmap |
| Development Guides | `development/` | Session workflow + operations/observability guides |
| Architecture | `architecture/` (index) + `product/ALTair_BRAIN.md` (living) | Static blueprints were outdated; living architecture stays with product inventory |
| Marketing | `marketing/` | Narrative + capture procedure + living targets |
| Creative Production | `creative/` | Extra category: brand imagery, prompts, canon image library (not covered cleanly by the seven requested buckets) |
| Reference | `reference/` | Procedural checklists / QA |
| Historical / Archive | `archive/` | Obsolete or closed validation material |

**Why Creative Production is separate:** Canon world rules are philosophy (`foundation/ALTAIR_CANON.md`), but prompt libraries, image IDs, and asset folders are production tools. Collapsing them into Marketing or Design would mix execution assets with product UI rules.

---

## Current documentation tree (after reorganization)

```text
docs/
  README.md
  DOCUMENTATION_ARCHITECTURE.md
  foundation/          # Vision & Philosophy
  design/              # Product UI design
  product/             # Living product state (+ path stubs)
  development/         # Session + operations guides
  architecture/        # Index + stubs to archive
  marketing/           # Living marketing docs + reference target
  creative/            # Creative Studio
  reference/           # Checklists / QA
  archive/
    architecture/
    marketing/         # Closed homepage validation passes
    product/           # Closed UI validation passes
    creative/
```

### Living markdown (authoritative or active)

| Path | Classification | Role |
|------|----------------|------|
| `foundation/The_Altair_Mission.md` | Vision & Philosophy | Mission |
| `foundation/The_Altair_Standard.md` | Vision & Philosophy | Quality standard |
| `foundation/The_Altair_Personality.md` | Vision & Philosophy | Personality |
| `foundation/The_Altair_Principles.md` | Vision & Philosophy | Decision principles |
| `foundation/ALTAIR_CANON.md` | Vision & Philosophy | Creative world constitution |
| `design/ALTAIR_DESIGN_FOUNDATION.md` | Design / Foundation | Product UI constitution |
| `design/ALTAIR_ART_DIRECTION.md` | Design / Foundation | Horizon Intelligence |
| `design/ALTAIR_EXPERIENCE_MAP.md` | Design / Foundation | Experience architecture |
| `design/ALTAIR_COMPONENT_SYSTEM.md` | Design / Foundation | Component definitions |
| `product/ALTair_MASTER_STATUS.md` | Product | Current state |
| `product/ALTair_CURRENT_SPRINT.md` | Product | Active sprint |
| `product/ALTair_BRAIN.md` | Product / Architecture | Production inventory |
| `product/ALTair_V2_ROADMAP.md` | Product | Future sequencing |
| `development/CHAT_START_PROMPT.md` | Development Guides | Session start |
| `development/SESSION_CLOSE_PROMPT.md` | Development Guides | Session close |
| `development/ALTAIR_SESSION_LOG.md` | Development Guides | Historical log (active append target) |
| `development/OPERATIONS_FOUNDATION.md` | Development Guides | Ops logging foundation |
| `development/OPERATIONS_EXECUTION_FRAMEWORK.md` | Development Guides | Ops executor |
| `marketing/ALTAIR_HOMEPAGE_STORYBOARD.md` | Marketing | Homepage narrative |
| `marketing/marketing-screenshot-capture-guide.md` | Marketing | Capture procedure |
| `creative/Brand/ALTAIR_DESIGN_LANGUAGE.md` | Creative Production | Creative visual language |
| `creative/Prompts/ALTAIR_VISUAL_PROMPT_LIBRARY.md` | Creative Production | Prompt library |
| `creative/Creative/CANON_IMAGE_LIBRARY.md` | Creative Production | Image index |
| `reference/*.md` | Reference | Smoke / deploy / beta / Stripe / demo audit |

### Pointer stubs (kept for stable paths)

| Stub | Points to |
|------|-----------|
| `product/ALTAIR_DESIGN_FOUNDATION.md` | `design/ALTAIR_DESIGN_FOUNDATION.md` |
| `product/ALTAIR_ART_DIRECTION.md` | `design/ALTAIR_ART_DIRECTION.md` |
| `product/ALTAIR_COMPONENT_SYSTEM.md` | `design/ALTAIR_COMPONENT_SYSTEM.md` |
| `product/ALTAIR_EXPERIENCE_MAP.md` | `design/ALTAIR_EXPERIENCE_MAP.md` |
| `product/CHAT_START_PROMPT.md` | `development/CHAT_START_PROMPT.md` |
| `product/SESSION_CLOSE_PROMPT.md` | `development/SESSION_CLOSE_PROMPT.md` |
| `product/ALTAIR_SESSION_LOG.md` | `development/ALTAIR_SESSION_LOG.md` |
| `product/OPERATIONS_FOUNDATION.md` | `development/OPERATIONS_FOUNDATION.md` |
| `product/OPERATIONS_EXECUTION_FRAMEWORK.md` | `development/OPERATIONS_EXECUTION_FRAMEWORK.md` |
| `product/FOUNDER_MODE.md` | `foundation/The_Altair_Principles.md` |
| `product/ALTAIR_FEATURE_INVENTORY.md` | `ALTair_BRAIN.md` |
| `product/ALTAIR_DESIGN_MANIFESTO.md` | design + foundation pointers |
| `product/ALTAIR_VISUAL_IDENTITY.md` | design pointers |
| `architecture/ARCHITECTURE.md` | `archive/architecture/ARCHITECTURE.md` |
| `architecture/backend-data-map.md` | `archive/architecture/backend-data-map.md` |
| `creative/_legacy_brand_system_README.md` | `archive/creative/_legacy_brand_system_README.md` |

Stubs exist so application `@see` comments and older doc links keep resolving without editing source code.

---

## Previous tree (before this pass)

```text
docs/
  foundation/
  product/          # state + design + ops + session + many screenshot folders
  marketing/        # narrative + many homepage-* validation folders
  creative/
  architecture/     # outdated living files
  reference/
```

Also present in git history / prior working tree: older flat and `docs/altair/`, `docs/branding/` layouts that this reorganization supersedes.

---

## Recommended documentation tree

The post-reorganization tree above **is** the recommended long-term structure.

Growth rules:

1. One concept → one authoritative home.
2. Living status docs stay thin; detail goes to BRAIN / design / archive.
3. Closed validation passes move to `archive/` when the pass ends.
4. Do not invent a tenth top-level folder without updating `docs/README.md` and this audit.
5. Prefer stubs over silent deletes when a path is referenced from code comments.

---

## Every file moved

### Into `docs/design/`

| From | To |
|------|----|
| `product/ALTAIR_DESIGN_FOUNDATION.md` | `design/ALTAIR_DESIGN_FOUNDATION.md` |
| `product/ALTAIR_ART_DIRECTION.md` | `design/ALTAIR_ART_DIRECTION.md` |
| `product/ALTAIR_COMPONENT_SYSTEM.md` | `design/ALTAIR_COMPONENT_SYSTEM.md` |
| `product/ALTAIR_EXPERIENCE_MAP.md` | `design/ALTAIR_EXPERIENCE_MAP.md` |

### Into `docs/development/`

| From | To |
|------|----|
| `product/CHAT_START_PROMPT.md` | `development/CHAT_START_PROMPT.md` |
| `product/SESSION_CLOSE_PROMPT.md` | `development/SESSION_CLOSE_PROMPT.md` |
| `product/ALTAIR_SESSION_LOG.md` | `development/ALTAIR_SESSION_LOG.md` |
| `product/OPERATIONS_FOUNDATION.md` | `development/OPERATIONS_FOUNDATION.md` |
| `product/OPERATIONS_EXECUTION_FRAMEWORK.md` | `development/OPERATIONS_EXECUTION_FRAMEWORK.md` |

### Into `docs/archive/architecture/`

| From | To |
|------|----|
| `architecture/ARCHITECTURE.md` | `archive/architecture/ARCHITECTURE.md` |
| `architecture/backend-data-map.md` | `archive/architecture/backend-data-map.md` |

### Into `docs/archive/creative/`

| From | To |
|------|----|
| `creative/_legacy_brand_system_README.md` | `archive/creative/_legacy_brand_system_README.md` |

### Into `docs/archive/marketing/`

Moved folders: `canonical-homepage-validation`, `homepage-density-pass`, `homepage-final-polish`, `homepage-hero-premium`, `homepage-hero-refinement`, `homepage-phase1-final`, `homepage-phase1-shots`, `homepage-scene1`, `homepage-trust-pass`, `homepage-visual-audit`, `nav-story-flow`.

### Into `docs/archive/product/`

Moved folders: `color-hierarchy`, `customers-mission-briefing`, `dashboard-desktop-readability`, `dashboard-mission-briefing`, `job-command-center-phase-1-2`, `job-command-center-phase-3`, `job-command-center-phase-4`, `jobs-mission-control`, `navigation-refinement`.

Also moved: `product/ChatGPT_Prompt.txt` → `archive/product/ChatGPT_Prompt.txt`.

---

## Every file renamed

None in this pass.

**Deferred rename recommendation:** normalize `ALTair_*` vs `ALTAIR_*` filenames in a future docs-only cleanup after link inventory. Not done now to avoid unnecessary churn.

---

## Every file left unchanged (content home unchanged)

### Foundation

- `foundation/The_Altair_Mission.md`
- `foundation/The_Altair_Standard.md`
- `foundation/The_Altair_Personality.md`
- `foundation/The_Altair_Principles.md` (link update only)
- `foundation/ALTAIR_CANON.md` (link update only)

### Product living docs

- `product/ALTair_MASTER_STATUS.md` (hierarchy table updated)
- `product/ALTair_CURRENT_SPRINT.md` (path note updated)
- `product/ALTair_BRAIN.md` (archive path updated)
- `product/ALTair_V2_ROADMAP.md` (experience-map path updated)
- `product/FOUNDER_MODE.md`
- `product/ALTAIR_FEATURE_INVENTORY.md`

### Marketing living docs

- `marketing/ALTAIR_HOMEPAGE_STORYBOARD.md` (design path updated)
- `marketing/marketing-screenshot-capture-guide.md`
- `marketing/reference/mission-control-homepage-target.png`

### Creative living docs / assets

- `creative/Brand/ALTAIR_DESIGN_LANGUAGE.md`
- `creative/Prompts/ALTAIR_VISUAL_PROMPT_LIBRARY.md`
- `creative/Creative/**` canon assets and category READMEs
- Empty reserved folders: `Website/`, `inspiration/`, `Prompts/prompt-templates/`, `Creative/reference-images/`

### Reference

- All five procedural docs under `reference/` plus `reference/README.md`

---

## Duplicate documents found

| Pair / cluster | Finding |
|----------------|---------|
| `ALTAIR_FEATURE_INVENTORY.md` vs `ALTair_BRAIN.md` | Already a pointer stub; not a content duplicate |
| `ALTAIR_DESIGN_MANIFESTO.md` / `ALTAIR_VISUAL_IDENTITY.md` vs design docs | Already pointer stubs; retained as stable entry points |
| `FOUNDER_MODE.md` vs `The_Altair_Principles.md` | Already a pointer stub |
| `architecture/ARCHITECTURE.md` vs `ALTair_BRAIN.md` | Overlap of “architecture” topic; blueprint archived, BRAIN remains living |
| `backend-data-map.md` vs `ALTair_BRAIN.md` | Obsolete planning vs production inventory; archived |
| `design/ALTAIR_DESIGN_FOUNDATION.md` vs `creative/Brand/ALTAIR_DESIGN_LANGUAGE.md` | Related names, different domains (product UI vs creative world visuals) — keep both |
| `design/ALTAIR_ART_DIRECTION.md` vs `design/ALTAIR_DESIGN_FOUNDATION.md` | Partial philosophy overlap; different jobs (Horizon Intelligence narrative vs UI constitution) — keep both, cross-link |

No full content duplicates required deletion.

---

## Merge recommendations

1. **Keep** `ALTAIR_DESIGN_MANIFESTO.md` and `ALTAIR_VISUAL_IDENTITY.md` as stubs (already merged in practice). Do not resurrect full copies.
2. **Keep** `ALTAIR_FEATURE_INVENTORY.md` as a stub into `ALTair_BRAIN.md`.
3. **Do not merge** Design Foundation + Creative Design Language.
4. **Do not merge** Art Direction + Design Foundation; instead maintain a short “Related docs” section at the top of each (already directionally true).
5. **Future optional merge:** fold thin phase notes (`workflow-language-comparison.md`, `financial-ownership.md`) into BRAIN appendices if they become operational truth again; until then they remain archived with their validation passes.

---

## Archive recommendations

Archived in this pass (retained, not deleted):

- Early `ARCHITECTURE.md` blueprint
- Pre-Supabase `backend-data-map.md`
- Legacy brand-system relocation stub
- All closed homepage visual validation folders (~75 files)
- All closed product UI validation folders (~75 files)
- Stray `ChatGPT_Prompt.txt`

**Not archived:** living marketing storyboard, capture guide, and `marketing/reference/` target image.

---

## Rationale for organizational decisions

1. **`design/` split from `product/`** — Product state changes weekly; design constitution should not live beside sprint notes and screenshot dumps.
2. **`development/` split** — Session prompts and ops framework are contributor workflow, not product truth.
3. **`archive/` for validation artifacts** — PNG/JSON passes are historical evidence, not documentation readers should treat as current.
4. **Architecture folder becomes an index** — Prevents outdated blueprints from looking authoritative.
5. **Path stubs retained** — Honors “do not modify application code” while relocating authoritative content.
6. **Creative nesting left as-is** — `creative/Creative/` is awkward, but flattening would churn many asset paths for little clarity gain; recommend a later optional rename to `creative/assets/` or `creative/canon/`.
7. **No mass filename casing rename** — High link risk, low structural value in this pass.

---

## Link validation

Relative Markdown links under `docs/` were checked after moves. Absolute `docs/...` references in `AGENTS.md` and `supabase/DATA_MODEL.md` were updated to archive/living paths as needed.

Capture scripts under `scripts/` may still write new homepage passes into `docs/marketing/homepage-*`. That is acceptable: active passes can live briefly under marketing, then move to `archive/marketing/` when closed. Scripts were not edited (application/tooling code out of scope).
