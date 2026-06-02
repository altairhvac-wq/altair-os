import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = __dirname;
const variants = [
  ["r02-f01-exact", "F01 Exact"],
  ["r02-f02-larger-star", "F02 Larger Star"],
  ["r02-f03-shorter-vector", "F03 Shorter Vector"],
  ["r02-production-final", "Production Final"],
];
const sizes = [16, 32, 64, 180];
const outDir = path.join(dir, "previews");

async function renderSvg(svgPath, size, invert, outPath) {
  let svg = fs.readFileSync(svgPath, "utf8");
  if (invert) {
    svg = svg.replace(/fill="#000000"/g, 'fill="#ffffff"');
  }
  await sharp(Buffer.from(svg))
    .resize(size, size, { kernel: sharp.kernel.nearest })
    .png()
    .toFile(outPath);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const [slug] of variants) {
    const svgPath = path.join(dir, `${slug}.svg`);
    for (const size of sizes) {
      for (const [suffix, invert] of [
        ["light", false],
        ["dark", true],
      ]) {
        const outPath = path.join(outDir, `${slug}-${size}px-${suffix}.png`);
        await renderSvg(svgPath, size, invert, outPath);
      }
    }
  }
  console.log("Rendered previews to", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
