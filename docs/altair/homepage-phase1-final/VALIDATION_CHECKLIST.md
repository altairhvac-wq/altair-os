# Mission Control Homepage — Phase 1 Final Validation

Compared against: `docs/altair/reference/mission-control-homepage-target.png`

Captures:

- `desktop-1440x1000.png` (1440×1000)
- `mobile-390x844.png` (390×844)
- `desktop-full.png` / `mobile-full.png` (full page)
- `section-reality.png` / `section-workflow.png` (section crops)

Hero product asset: `public/marketing/screenshots/mission-control-hero.png` (3200×2000 retina North Star Mission Control capture)

---

## Checklist

### Hero — PARTIALLY MATCHES

**Matches**

- Two-column cinematic composition (copy left, product right)
- Eyebrow “THE OPERATING SYSTEM” in gold tracking
- Headline “The operating system for HVAC companies.” with gold only on HVAC
- Supporting sentence, dual CTAs, trust row present
- Product occupies ~half the hero; no browser chrome; flat (no perspective)
- Wide canvas (`max-w-[90rem]`)

**Mismatches**

- Reference product mock shows Jobs Map / fictional Mission Control widgets; implementation uses the live North Star Mission Control dashboard (real production UI). Acceptable per asset rule; composition of in-app widgets differs from the mock.
- Reference product has a slight 3D tilt; tilt was disabled to protect sharpness (per brief).

### Navigation — PARTIALLY MATCHES

**Matches**

- Left logo, center links (Product / How It Works / Why Altair / Pricing / Resources▾), right Sign In + gold CTA
- Top metallic hairline; generous bar height; wide content width

**Mismatches**

- Wordmark renders as “ALTAIR” via shared brand component; reference shows “ALTAIR OS” beside a gold star. Shared mark is white needle/star, not a separate gold four-point star glyph.

### Typography — MATCHES

- Large editorial headline, comfortable line height, gold only on HVAC
- Gold uppercase eyebrows, muted body, CTA hierarchy aligned with reference

### Background — MATCHES

- Deep graphite base (not blue-heavy)
- Soft silver radial bloom behind product
- Horizontal metallic light streak across hero
- Corner falloff / vignette

### Product — PARTIALLY MATCHES

**Matches**

- Crisp retina Mission Control/North Star capture (3200×2000, ~435KB PNG)
- Thin silver edge, soft shadow, no fake chrome, no perspective blur
- Highest-priority visual weight in hero

**Mismatches**

- In-app content differs from the reference mock (map/KPI collage vs live Mission Control operating board)
- Live capture may still show environment-specific dashboard state (queues, metrics)

### Reality — PARTIALLY MATCHES

**Matches**

- Gold eyebrow + centered chaos headline
- Five integrated metallic panels (not floating SaaS cards)
- Thin borders, minimal shadow, larger type, wide spacing

**Mismatches**

- Panel luminance is subtler than the reference’s slightly brighter metal slabs; icons/copy match current product copy rather than any alternate reference wording

### Workflow — PARTIALLY MATCHES

**Matches**

- “One operating system. One continuous workflow.” framing
- Eight-node Lead → Payment machine with gold connector rail
- Larger nodes; Payment enlarged + stronger glow as destination
- Secondary Mission Control product stage + CTA below

**Mismatches**

- Number placement is above nodes (`01`…`08`); some reference reads place badges on the node edge
- Connector is a continuous rail rather than a dashed gold stitch

---

## Verdict

**Not a pixel-perfect facsimile of the mock**, primarily because the reference product art is a fictional Mission Control collage while the shipped product stage uses a real retina North Star Mission Control capture. Layout, typography, graphite/silver atmosphere, navigation structure, Reality panels, and Payment-led workflow are close enough that the page reads as the approved direction rather than the prior intermediate homepage.

Do **not** claim full MATCHES across all areas.
