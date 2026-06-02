/**
 * Regenerate PNG PWA / Apple touch icons from public/icons/icon.svg.
 * Maskable variant scales the mark down to stay within the 80% safe zone.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");
const iconSvgPath = path.join(iconsDir, "icon.svg");

const MARK_PATH =
  "M37.5 2h5v20H37.5z M37.5 42h5v20H37.5z M40 29.5h25v5H40z M40 14.5l3.75 11.875 11.875 3.125-11.875 3.125-3.75 11.875-3.75-11.875-11.875-3.125 11.875-3.125z";

function buildIconSvg(markScale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Altair">
  <rect width="512" height="512" rx="96" fill="#0A0A0A"/>
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F5E6A3"/>
      <stop offset="42%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#9A7209"/>
    </linearGradient>
  </defs>
  <g transform="translate(256 256) scale(${markScale}) translate(-40 -32)">
    <path fill="url(#gold)" d="${MARK_PATH}"/>
  </g>
</svg>`;
}

async function renderIcon(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log(`Wrote ${outPath}`);
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true });

  const standardSvg = fs.readFileSync(iconSvgPath, "utf8");
  const maskableSvg = buildIconSvg(4.5);

  await renderIcon(standardSvg, 192, path.join(iconsDir, "icon-192.png"));
  await renderIcon(standardSvg, 512, path.join(iconsDir, "icon-512.png"));
  await renderIcon(maskableSvg, 512, path.join(iconsDir, "icon-maskable-512.png"));
  await renderIcon(standardSvg, 180, path.join(iconsDir, "apple-touch-icon.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
