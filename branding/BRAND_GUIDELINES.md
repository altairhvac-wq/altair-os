# Altair Brand Guidelines

**Status:** Approved — Version 2 (locked)
**Effective:** August 2026
**Supersedes:** Version 1 luxury black-and-gold North Star (June 2026 — retired)

This document is the source of truth for the **approved Altair logo mark and lockup production rules**. Version 2 of the platinum-and-gold gear A-monogram is the official, approved brand direction, replacing the Version 1 North Star mark by explicit request. Do not generate additional logo concepts, redesigns, or alternative directions unless explicitly requested.

Company mission, principles, personality, and standards live in `docs/foundation/`. The Altair creative world lives in `docs/foundation/ALTAIR_CANON.md`.

---

## Brand Position

**Message:** Altair is the North Star for service companies.

Altair helps owners, dispatchers, and office staff know what to do next. The brand should feel like executive software for high-end SaaS — a command center and AI operator, not a contractor tool.

### Attributes

| Attribute | Expression |
|-----------|------------|
| Precision engineered | Two-tone platinum-and-gold metal, gear-ring construction, exact geometry |
| Premium | Metallic gradients, generous spacing, no clutter |
| Modern | Clean vector mark, minimal UI integration |
| Professional | Consistent lockups, no playful or trade-specific imagery |
| Gear A-monogram | Stylized A split platinum/gold, framed by a precision gear ring |
| Command center | Executive tone in copy and visual hierarchy |

### Avoid

Do not use imagery or metaphors associated with:

- Wrenches, HVAC icons, snowflakes, flames, houses
- Generic contractor or trades imagery
- Generic startup gradients (rainbow, neon, purple-to-blue, etc.)
- Competing logo concepts or experimental mark variations
- Reintroducing the retired Version 1 North Star mark without an explicit request

Future branding work should **extend** this system — typography, illustration, motion, templates — rather than replace the approved mark.

---

## Approved Logo

**Primary lockup:** Version 2 platinum-and-gold gear A-monogram with **ALTAIR / OPERATING SYSTEM** wordmark.

The mark combines:

1. **Stylized A** — two-tone letterform, platinum on the left stroke, gold on the right stroke and crossbar
2. **Gear ring** — an 18-tooth precision gear ring framing the A, split platinum (left) / gold (right), gapped at the apex where the A's peak breaks through
3. **Wordmark** — `ALTAIR` in Michroma, wide letter-spacing, platinum; `OPERATING SYSTEM` subline in Inter, wide letter-spacing, gold, flanked by a thin gold rule

**Approved reference image:** [`altair-logo-concept-v2.png`](./altair-logo-concept-v2.png)

This PNG is the visual north star for the identity — the original art-direction reference supplied when this identity was approved. Production SVGs in this folder and `public/brand/` are clean, hand-vectorized assets derived from this concept, matching its proportions, split, and tone so every surface (down to a 32×32 favicon) stays legible and faithful to the reference.

**Previous concept (retired):** [`altair-logo-concept-v1.png`](./altair-logo-concept-v1.png) — kept for historical reference only. Do not reintroduce.

---

## Color Palette

Primary theme: **black, platinum, and gold** ("Platinum Circuit").

| Token | Hex | Usage |
|-------|-----|--------|
| Black | `#0A0A0A` | Primary backgrounds, favicon plate, primary lockup plate |
| Platinum Highlight | `#F0F2F4` | Gradient top stop (platinum) |
| Platinum | `#C8CDD3` | Primary metallic platinum, wordmark |
| Steel | `#71767D` | Gradient bottom stop (platinum) |
| Gold Accent | `#D4AF37` | Primary metallic gold, subline, accents |
| Gold Highlight | `#F5E6A3` | Gradient top stop (gold) |
| Gold Deep | `#9A7209` | Gradient bottom stop (gold) |
| White | `#FFFFFF` | Mono lockup on dark surfaces |

**Platinum gradient:** Platinum Highlight → Platinum → Steel (top to bottom, diagonal linear).

**Gold gradient:** Gold Highlight → Gold Accent → Gold Deep (top to bottom, diagonal linear). Used for the gold half of the two-tone mark, and as a monochrome treatment in the `gold` variant for dark UI surfaces (auth, admin header, public footers).

Application UI may use slate neutrals (`#0f172a`, `#f1f5f9`, etc.) for chrome and readability. Brand moments — logos, hero surfaces, public documents — should lead with black, platinum, and gold.

Canonical color constants live in `shared/components/brand/brand-assets.ts` as `ALTAIR_BRAND_COLORS`. Legacy Version 1 gold-only tokens (`goldHighlight`, `goldMid`, `goldDeep`, `goldBright`, `goldBronze`) remain defined for backward compatibility but new work should use `platinum`/`platinumHighlight`/`steel`/`goldAccent`.

---

## Logo Variants

All variants share the same mark geometry. Use the variant that matches the surface.

| File | Variant | When to use |
|------|---------|-------------|
| `altair-primary.svg` | Primary | Marketing, splash screens, light UI chrome. Full two-tone mark + wordmark on black plate. **Default lockup.** |
| `altair-gold.svg` | Gold | Dark backgrounds: auth hero, admin desktop header, public document footers. Monochrome gold gradient, no black plate. |
| `altair-white.svg` | White | Dark backgrounds requiring flat mono treatment. Maximum contrast on slate or black. |
| `altair-icon.svg` | Icon | App icon source, compact headers, avatars. Two-tone mark only, transparent background. |
| `favicon.svg` | Favicon | Browser tab, PWA shortcut, 32×32 contexts. Mark on black rounded square with thicker gear-ring strokes for legibility. |

**Deployed copies:** `public/brand/` (SVG lockups) and `public/favicon.svg`.

**In-app component:** `<AltairLogo />` in `shared/components/brand/AltairLogo.tsx` — prefer this over raw SVGs in React surfaces for consistent sizing and accessibility. Renders the two-tone platinum/gold mark natively (`variant="primary"`/`"icon"`), or a monochrome gold/white treatment (`variant="gold"`/`"white"`).

**Typography:** Display face `Michroma` (wordmark), body/subline face `Inter`. Both are freely-licensed Google Fonts — load them via the app's global font imports. See [Michroma](https://fonts.google.com/specimen/Michroma) and [Inter](https://fonts.google.com/specimen/Inter).

---

## Usage Rules

### Do

- Maintain clear space around the lockup equal to at least the height of one gear tooth
- Use approved SVG files or `<AltairLogo />`; do not recreate the mark by hand
- Place the gold or white variant on dark backgrounds; use primary on light or branded black plates
- Keep the wordmark spelling as **ALTAIR** (all caps, tracked), with the `OPERATING SYSTEM` subline where space allows
- Use the approved reference PNG when communicating brand direction to vendors or partners
- Preserve the platinum-left / gold-right split — it is a structural part of the mark, not a decorative choice

### Don't

- Stretch, rotate, skew, or outline the mark
- Change gradient colors or invent new platinum/gold tones outside the palette
- Separate the gear ring from the A or rearrange mark elements
- Flip the platinum/gold split (gold must stay on the right, platinum on the left)
- Place gold-on-gold, platinum-on-platinum, or other low-contrast combinations
- Add drop shadows, glows, or effects not present in approved assets
- Substitute a different logo concept or "refresh" without explicit approval
- Reintroduce the retired Version 1 North Star mark

### Public-facing documents

Estimates, invoices, payment pages, and other customer-facing surfaces should display the approved Altair identity (typically the gold variant via `PublicDocumentBrandFooter`).

---

## Icon Usage

**App icon:** Two-tone gear A-monogram (`altair-icon.svg`).

- Source file: `branding/altair-icon.svg` → `public/brand/altair-icon.svg`
- PNG exports for PWA: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- The icon is mark-only — no wordmark, no black plate (unlike favicon)
- The maskable variant uses extra padding so the mark survives OS-applied circular/squircle masking
- Regenerate PNGs from the approved SVG when updating; preserve the gradient, split, and proportions

Use the icon variant in compact UI: mobile shell header, small badges, and anywhere the full wordmark lockup does not fit.

---

## Favicon Usage

**Favicon:** Two-tone gear A-monogram on a black rounded square (`favicon.svg`).

- Source: `branding/favicon.svg` → `public/favicon.svg`
- Referenced in `app/layout.tsx` metadata and `app/manifest.ts`
- Optimized for 32×32 with a thicker gear-ring stroke for legibility at small sizes
- Do not use the full wordmark lockup as a favicon

---

## Asset Library

| Location | Purpose |
|----------|---------|
| `branding/` | Canonical source files and this guide |
| `public/brand/` | Static SVGs served to the web |
| `public/favicon.svg` | Browser favicon |
| `public/icons/` | Raster PWA / Apple touch icons |
| `shared/components/brand/brand-assets.ts` | Color tokens, paths, usage metadata, approval status |
| `shared/components/brand/AltairLogo.tsx` | React logo component |

When adding new brand assets, update `brand-assets.ts` and mirror files to `public/` as needed.

---

## Future Branding Principles

1. **Extend, don't replace** — New templates, email headers, slide decks, and UI patterns should use the approved mark and palette.
2. **Stay executive** — Tone and visuals should feel like premium SaaS for operators, not field tools.
3. **North Star narrative** — Copy and visuals reinforce guidance, clarity, and "what to do next," even though the literal North Star glyph has been retired in favor of the gear A-monogram.
4. **No speculative concepts** — Additional logo directions require an explicit product/design request.
5. **Single registry** — Keep `brand-assets.ts` aligned with files in `branding/` so code and docs stay in sync.

---

## Quick Reference

```
Primary lockup:  branding/altair-primary.svg
Gold (dark UI):  branding/altair-gold.svg
White (mono):    branding/altair-white.svg
Icon:            branding/altair-icon.svg
Favicon:         branding/favicon.svg
Reference:       branding/altair-logo-concept-v2.png  ← approved concept
Retired:         branding/altair-logo-concept-v1.png  ← Version 1, do not reuse
```

For programmatic access, import from `@/shared/components/brand/brand-assets` or `@/shared/components/brand/AltairLogo`.
