/**
 * Drop `!important` from a selector family where it is not load-bearing.
 *
 * The flags in the North Star shell rules were defensive, not required: those
 * rules are unlayered author styles, and `@import "tailwindcss"` puts every
 * generated utility inside `@layer utilities` — unlayered normal declarations
 * beat layered ones whatever the specificity. `.admin-north-star-shell X` also
 * outranks the utilities on the same elements on specificity alone.
 *
 * Print rules are skipped: there `!important` really is doing work, overriding
 * screen styles that would otherwise win on source order.
 *
 *   node ui-audit/drop-important.mjs <file> <selector-prefix> [--apply]
 */
import fs from "fs";
import postcss from "postcss";

const file = process.argv[2];
const prefix = process.argv[3];
const apply = process.argv.includes("--apply");

const root = postcss.parse(fs.readFileSync(file, "utf8"));
let touched = 0, rules = 0, skippedPrint = 0;

root.walkRules((rule) => {
  if (!rule.selector.includes(prefix)) return;
  for (let a = rule.parent; a; a = a.parent) {
    if (a.type === "atrule" && a.name === "media" && /print/.test(a.params)) { skippedPrint += 1; return; }
  }
  let n = 0;
  rule.walkDecls((d) => { if (d.important) { n += 1; if (apply) d.important = false; } });
  if (n) { rules += 1; touched += n; }
});

console.log(`${touched} !important across ${rules} rules matching "${prefix}"` +
  (skippedPrint ? `; ${skippedPrint} print rules skipped` : ""));
if (apply) { fs.writeFileSync(file, root.toString()); console.log("applied"); }
