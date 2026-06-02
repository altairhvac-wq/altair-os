/**
 * Regenerate PNG PWA / Apple touch icons from public/icons/icon.svg.
 * Maskable variant scales the full native icon to stay within the 80% safe zone.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, "..", "public", "icons");
const iconSvgPath = path.join(iconsDir, "icon.svg");

/** Android maskable safe zone: keep artwork within ~82% of canvas center. */
const MASKABLE_SCALE = 0.82;

function buildMaskableSvg(standardSvg) {
  const openTag = standardSvg.match(/^<svg[^>]*>/)[0];
  const inner = standardSvg.slice(openTag.length, standardSvg.lastIndexOf("</svg>"));

  return `${openTag}
  <rect width="512" height="512" fill="#0A0A0A"/>
  <g transform="translate(256 256) scale(${MASKABLE_SCALE}) translate(-256 -256)">
${inner}
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
  const maskableSvg = buildMaskableSvg(standardSvg);

  await renderIcon(standardSvg, 192, path.join(iconsDir, "icon-192.png"));
  await renderIcon(standardSvg, 512, path.join(iconsDir, "icon-512.png"));
  await renderIcon(maskableSvg, 512, path.join(iconsDir, "icon-maskable-512.png"));
  await renderIcon(standardSvg, 180, path.join(iconsDir, "apple-touch-icon.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
