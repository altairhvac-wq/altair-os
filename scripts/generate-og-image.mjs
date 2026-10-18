/**
 * Renders public/og.png — the 1200×630 link-preview card.
 *
 * Two steps because neither tool does both well on every machine: sharp
 * (librsvg) rasterises the brand emblem from its SVG source faithfully, and
 * the text is set with the same SVG renderer so the output does not depend on
 * which fonts happen to be installed. Georgia-class serifs are substituted
 * per platform, so the layout leaves generous room around every line.
 *
 * Usage:  node scripts/generate-og-image.mjs
 * Output: public/og.png (committed; regenerate when the brand assets change)
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WIDTH = 1200;
const HEIGHT = 630;

// Brand palette — branding/BRAND_GUIDELINES.md
const BLACK = "#0A0A0A";
const PLATINUM = "#C8CDD3";
const PLATINUM_HI = "#F0F2F4";
const STEEL = "#71767D";
const GOLD = "#D4AF37";
const GOLD_HI = "#F5E6A3";
const GOLD_DEEP = "#9A7209";

async function main() {
  const emblemSvg = await readFile(
    path.join(root, "branding", "altair-icon.svg"),
    "utf8",
  );

  // The emblem SVG carries its own black plate; rendered on the same black it
  // sits flush with the card.
  const emblemPng = await sharp(Buffer.from(emblemSvg))
    .resize(380, 380)
    .png()
    .toBuffer();

  const card = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${GOLD_HI}"/>
      <stop offset="0.55" stop-color="${GOLD}"/>
      <stop offset="1" stop-color="${GOLD_DEEP}"/>
    </linearGradient>
    <linearGradient id="platinum" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PLATINUM_HI}"/>
      <stop offset="1" stop-color="${PLATINUM}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.22" cy="0.5" r="0.55">
      <stop offset="0" stop-color="#1a1a1a"/>
      <stop offset="1" stop-color="${BLACK}"/>
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  <!-- hairline frame -->
  <rect x="28" y="28" width="${WIDTH - 56}" height="${HEIGHT - 56}" rx="20" fill="none" stroke="#2a2a2a" stroke-width="2"/>
  <!-- gold rule under the wordmark -->
  <rect x="470" y="318" width="160" height="4" rx="2" fill="url(#gold)"/>
  <text x="470" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="112" fill="url(#platinum)" letter-spacing="2">Altair OS</text>
  <text x="470" y="382" font-family="Georgia, 'Times New Roman', serif" font-size="38" fill="${GOLD}" letter-spacing="1">The operating system</text>
  <text x="470" y="432" font-family="Georgia, 'Times New Roman', serif" font-size="38" fill="${GOLD}" letter-spacing="1">for field service businesses</text>
  <text x="470" y="522" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="${STEEL}" letter-spacing="2">LEADS · DISPATCH · ESTIMATES · INVOICES</text>
  <text x="${WIDTH - 60}" y="${HEIGHT - 52}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="${STEEL}" letter-spacing="2">altair-op.com</text>
</svg>`;

  const out = await sharp(Buffer.from(card))
    .composite([{ input: emblemPng, left: 70, top: Math.round((HEIGHT - 380) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const target = path.join(root, "public", "og.png");
  await writeFile(target, out);

  const meta = await sharp(out).metadata();
  console.log(`wrote ${path.relative(root, target)} ${meta.width}x${meta.height} (${out.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
