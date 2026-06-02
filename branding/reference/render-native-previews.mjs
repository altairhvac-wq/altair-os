/**
 * Render native square app-icon previews (vector reconstruction).
 * Pre-production only — does not touch public/icons/.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgArg = process.argv[2] ?? "altair-v1-app-icon-native.svg";
const svgPath = path.join(__dirname, svgArg);
const slug = path.basename(svgArg, ".svg");
const outDir = path.join(__dirname, "previews");
const sizes = [512, 180, 120, 60];

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error(`Source not found: ${svgPath}`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const svg = fs.readFileSync(svgPath, "utf8");

  for (const size of sizes) {
    const outPath = path.join(outDir, `${slug}-${size}px.png`);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
    console.log(`  ${size}×${size} → ${path.basename(outPath)}`);
  }

  console.log(`\nSource: ${path.basename(svgPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
