/**
 * Snapshot every design token's COMPUTED value on the real shell.
 *
 * Refactoring where a token is *declared* is only safe if what it *resolves to*
 * is unchanged. Reading the stylesheet cannot tell you that, because the shell
 * resolves through :root -> .admin-north-star-shell -> Design Lab inline vars.
 * This asks the browser, so a before/after diff is proof rather than argument.
 *
 *   AUTH_STATE=<path> node ui-audit/token-snapshot.mjs <out.json> [routes,csv]
 */
import fs from "fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim();
if (!AUTH) { console.error("Set AUTH_STATE"); process.exit(1); }

const out = process.argv[2] || "ui-audit/tokens.json";
const routes = (process.argv[3] || "/,/customers,/work,/reports,/settings")
  .split(",").map((r) => r.trim()).filter(Boolean);

/* Collect every custom property name declared anywhere in the stylesheets, so
 * the snapshot cannot miss one that only a refactor would disturb. */
const COLLECT = () => {
  const names = new Set();
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (rs) => {
      for (const r of rs) {
        if (r.style) {
          for (let i = 0; i < r.style.length; i += 1) {
            const p = r.style[i];
            if (p.startsWith("--")) names.add(p);
          }
        }
        if (r.cssRules) walk(r.cssRules);
      }
    };
    walk(rules);
  }
  const targets = [
    ["shell", document.querySelector(".admin-north-star-shell")],
    ["main", document.querySelector(".admin-shell-main")],
    ["root", document.documentElement],
  ].filter(([, el]) => el);
  const res = {};
  for (const [label, el] of targets) {
    const cs = getComputedStyle(el);
    const bag = {};
    for (const n of [...names].sort()) {
      const v = cs.getPropertyValue(n).trim();
      if (v) bag[n] = v;
    }
    res[label] = bag;
  }
  return res;
};

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ storageState: AUTH, viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const snapshot = {};
for (const route of routes) {
  await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(500);
  snapshot[route] = await p.evaluate(COLLECT);
  const n = Object.values(snapshot[route]).reduce((s, o) => s + Object.keys(o).length, 0);
  console.log(`  ${route} -> ${n} resolved values`);
}
fs.writeFileSync(out, JSON.stringify(snapshot, null, 1));
console.log(`written ${out}`);
await b.close();
