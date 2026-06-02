# Altair Brand Guidelines

**Status:** Approved — Version 1 (locked)  
**Effective:** June 2026

This document is the single source of truth for the Altair brand identity. Version 1 of the luxury black-and-gold North Star logo concept is the official, approved brand direction. Do not generate additional logo concepts, redesigns, or alternative directions unless explicitly requested.

---

## Brand Position

**Message:** Altair is the North Star for service companies.

Altair helps owners, dispatchers, and office staff know what to do next. The brand should feel like executive software for high-end SaaS — a command center and AI operator, not a contractor tool.

### Attributes

| Attribute | Expression |
|-----------|------------|
| Luxury | Black-and-gold palette, refined serif wordmark, restrained layout |
| Premium | Metallic gold gradients, generous spacing, no clutter |
| Modern | Clean vector mark, minimal UI integration |
| Professional | Consistent lockups, no playful or trade-specific imagery |
| North Star | Stylized A with embedded star — guidance and direction |
| Command center | Executive tone in copy and visual hierarchy |

### Avoid

Do not use imagery or metaphors associated with:

- Wrenches, gears, HVAC icons, snowflakes, flames, houses
- Generic contractor or trades imagery
- Generic startup gradients (rainbow, neon, purple-to-blue, etc.)
- Competing logo concepts or experimental mark variations

Future branding work should **extend** this system — typography, illustration, motion, templates — rather than replace the approved mark.

---

## Approved Logo

**Primary lockup:** Version 1 luxury North Star mark with **ALTAIR** wordmark.

The mark combines:

1. **Stylized A** — letterform suggesting upward guidance
2. **North Star** — four-point star centered in the A
3. **Horizon arc** — subtle curve beneath the star
4. **Wordmark** — `ALTAIR` in Georgia (or equivalent serif), semibold, wide letter-spacing

**Approved reference image:** [`altair-logo-concept-v1.png`](./altair-logo-concept-v1.png)

This PNG is the visual north star for the identity. Production SVGs in this folder and `public/brand/` are derived from this concept and should match its proportions and tone.

---

## Color Palette

Primary theme: **black and metallic gold**.

| Token | Hex | Usage |
|-------|-----|--------|
| Black | `#0A0A0A` | Primary backgrounds, favicon plate, primary lockup plate |
| Gold Highlight | `#F5E6A3` | Gradient top stop (standard) |
| Gold Mid | `#D4AF37` | Primary metallic gold |
| Gold Deep | `#9A7209` | Gradient bottom stop (standard) |
| Gold Bright | `#FBF5B7` | Gradient top stop (bright variant) |
| Gold Bronze | `#B8860B` | Gradient bottom stop (bright variant) |
| White | `#FFFFFF` | Mono lockup on dark surfaces |

**Standard gold gradient:** Highlight → Mid → Deep (top to bottom, vertical linear).

**Bright gold gradient:** Used in the `gold` variant for dark UI surfaces (auth, admin header, public footers).

Application UI may use slate neutrals (`#0f172a`, `#f1f5f9`, etc.) for chrome and readability. Brand moments — logos, hero surfaces, public documents — should lead with black and gold.

Canonical color constants live in `shared/components/brand/brand-assets.ts` as `ALTAIR_BRAND_COLORS`.

---

## Logo Variants

All variants share the same mark geometry. Use the variant that matches the surface.

| File | Variant | When to use |
|------|---------|-------------|
| `altair-primary.svg` | Primary | Marketing, splash screens, light UI chrome. Full stacked mark + wordmark on black plate. **Default lockup.** |
| `altair-gold.svg` | Gold | Dark backgrounds: auth hero, admin desktop header, public document footers. Gold gradient, no black plate. |
| `altair-white.svg` | White | Dark backgrounds requiring flat mono treatment. Maximum contrast on slate or black. |
| `altair-icon.svg` | Icon | App icon source, compact headers, avatars. Mark only, transparent background. |
| `favicon.svg` | Favicon | Browser tab, PWA shortcut, 32×32 contexts. Mark on black rounded square with thicker strokes. |

**Deployed copies:** `public/brand/` (SVG lockups) and `public/favicon.svg`.

**In-app component:** `<AltairLogo />` in `shared/components/brand/AltairLogo.tsx` — prefer this over raw SVGs in React surfaces for consistent sizing and accessibility.

---

## Usage Rules

### Do

- Maintain clear space around the lockup equal to at least the height of the star element
- Use approved SVG files or `<AltairLogo />`; do not recreate the mark by hand
- Place the gold or white variant on dark backgrounds; use primary on light or branded black plates
- Keep the wordmark spelling as **ALTAIR** (all caps, tracked)
- Use the approved reference PNG when communicating brand direction to vendors or partners

### Don't

- Stretch, rotate, skew, or outline the mark
- Change gradient colors or invent new gold tones outside the palette
- Separate the star from the A or rearrange mark elements
- Place gold-on-gold or low-contrast combinations
- Add drop shadows, glows, or effects not present in approved assets
- Substitute a different logo concept or "refresh" without explicit approval

### Public-facing documents

Estimates, invoices, payment pages, and other customer-facing surfaces should display the approved Altair identity (typically the gold variant via `PublicDocumentBrandFooter`).

---

## Icon Usage

**App icon:** Simplified North Star / A mark (`altair-icon.svg`).

- Source file: `branding/altair-icon.svg` → `public/brand/altair-icon.svg`
- PNG exports for PWA: `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- The icon is mark-only — no wordmark, no black plate (unlike favicon)
- Regenerate PNGs from the approved SVG when updating; preserve the gradient and proportions

Use the icon variant in compact UI: mobile shell header, small badges, and anywhere the full wordmark lockup does not fit.

---

## Favicon Usage

**Favicon:** Simplified North Star / A mark on a black rounded square (`favicon.svg`).

- Source: `branding/favicon.svg` → `public/favicon.svg`
- Referenced in `app/layout.tsx` metadata and `app/manifest.ts`
- Optimized for 32×32 with thicker horizon stroke for legibility at small sizes
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
3. **North Star narrative** — Copy and visuals reinforce guidance, clarity, and "what to do next."
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
Reference:       branding/altair-logo-concept-v1.png  ← approved concept
```

For programmatic access, import from `@/shared/components/brand/brand-assets` or `@/shared/components/brand/AltairLogo`.
