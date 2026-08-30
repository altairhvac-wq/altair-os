/**
 * Remove rules whose selector references a class with no consumer in the repo.
 *
 * Parsed with postcss rather than matched by hand: a selector can sit inside an
 * `@media` block, and brace-counting from the wrong opener silently swallows
 * the wrapper. Only whole rules are removed, and only when EVERY selector in
 * the rule is dead — a rule that also styles a live class is left alone.
 *
 *   node ui-audit/strip-dead-css.mjs <file> [--apply] <dead-class>...
 */
import fs from "fs";
import postcss from "postcss";

const file = process.argv[2];
const apply = process.argv.includes("--apply");
const dead = process.argv.slice(3).filter((a) => a !== "--apply");

const css = fs.readFileSync(file, "utf8");
const root = postcss.parse(css);

const isDead = (sel) => dead.some((c) => new RegExp(`\.${c}(?![\w-])`).test(sel));

let rules = 0, important = 0, decls = 0;
const removals = [];
root.walkRules((rule) => {
  const sels = rule.selectors;
  if (!sels.length || !sels.every(isDead)) return;
  let imp = 0, n = 0;
  rule.walkDecls((d) => { n += 1; if (d.important) imp += 1; });
  rules += 1; important += imp; decls += n;
  removals.push({ sel: rule.selector.replace(/\s+/g, " ").slice(0, 90), imp, n, parent: rule.parent.type === "atrule" ? `@${rule.parent.name} ${rule.parent.params}` : null });
  if (apply) {
    const prev = rule.prev();
    if (prev && prev.type === "comment") prev.remove();
    rule.remove();
  }
});

for (const r of removals) {
  console.log(`  ${String(r.imp).padStart(2)}!  ${r.sel}${r.parent ? "   [inside " + r.parent + "]" : ""}`);
}
console.log(`\n${rules} rules, ${decls} declarations, ${important} !important`);

if (apply) {
  /* Drop at-rules the removals emptied, so no bare `@media {}` is left behind. */
  let emptied = 0;
  root.walkAtRules((at) => {
    if (at.nodes && at.nodes.length === 0) { at.remove(); emptied += 1; }
  });
  fs.writeFileSync(file, root.toString());
  console.log(`applied; ${emptied} emptied at-rules removed`);
}
