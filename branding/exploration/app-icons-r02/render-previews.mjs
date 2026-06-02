import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "previews");
const sizes = [60, 120, 180, 512];

const icons = [
  ["icon-01-obsidian-gold", "01 Obsidian Gold"],
  ["icon-02-midnight-forge", "02 Midnight Forge"],
  ["icon-03-raycast-pulse", "03 Raycast Pulse"],
  ["icon-04-arc-horizon", "04 Arc Horizon"],
  ["icon-05-tesla-precision", "05 Tesla Precision"],
  ["icon-06-champagne-edge", "06 Champagne Edge"],
  ["icon-07-carbon-depth", "07 Carbon Depth"],
  ["icon-08-north-star-dawn", "08 North Star Dawn"],
  ["icon-09-frosted-vault", "09 Frosted Vault"],
  ["icon-10-command-center", "10 Command Center"],
];

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  for (const [slug] of icons) {
    const svgPath = path.join(__dirname, `${slug}.svg`);
    const svg = fs.readFileSync(svgPath, "utf8");

    for (const size of sizes) {
      const outPath = path.join(outDir, `${slug}-${size}px.png`);
      await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
    }
  }

  console.log(`Rendered ${icons.length} icons × ${sizes.length} sizes → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
