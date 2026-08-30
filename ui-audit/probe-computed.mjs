/**
 * Local audit tool: read COMPUTED colours from the running app.
 *
 * Reading 5k lines of CSS cannot tell you what actually paints, because the
 * shell resolves CSS custom properties through :root -> .admin-north-star-shell
 * -> inline Design Lab live-theme vars. This asks the browser instead.
 *
 * Usage: AUTH_STATE=<path> node ui-audit/probe-computed.mjs [route]
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim();
const ROUTE = process.argv[2] || "/";
if (!AUTH) {
  console.error("Set AUTH_STATE=<path to storage state json>");
  process.exit(1);
}

const VARS = [
  "--north-star-root",
  "--north-star-sidebar",
  "--north-star-topbar",
  "--north-star-panel",
  "--north-star-content-well",
  "--north-star-header-strip",
  "--north-star-border",
  "--north-star-plate-border",
  "--north-star-gold",
  "--north-star-brass",
  "--north-star-champagne",
  "--north-star-section-title",
  "--north-star-section-secondary",
  "--north-star-sidebar-link",
  "--north-star-sidebar-link-active",
  "--page-canvas-top",
  "--page-canvas-mid",
  "--page-canvas-deep",
  "--surface-canvas",
  "--surface-section",
  "--surface-card",
  "--surface-tile",
  "--altair-graphite",
  "--altair-paper",
  "--altair-ink",
  "--altair-ink-muted",
  "--altair-brass",
  "--altair-success",
];

const SELECTORS = [
  [".admin-north-star-shell", "shell root"],
  [".admin-north-star-sidebar", "sidebar"],
  [".admin-premium-header", "top bar"],
  [".admin-shell-main", "content frame"],
  ["main [class*='rounded'][class*='border']", "first card-ish"],
];

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ storageState: AUTH, viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE + ROUTE, { waitUntil: "domcontentloaded" });
await p.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(800);

const out = await p.evaluate(
  ({ vars, selectors }) => {
    const shell = document.querySelector(".admin-north-star-shell");
    const res = { liveThemeApplied: null, vars: {}, elements: [] };
    if (shell) {
      res.liveThemeApplied = shell.getAttribute("data-design-lab-live") === "true";
      const cs = getComputedStyle(shell);
      for (const v of vars) res.vars[v] = cs.getPropertyValue(v).trim();
      // Which vars are set INLINE (i.e. by the live theme) vs from stylesheet?
      res.inlineVars = Array.from(shell.style).filter((n) => n.startsWith("--"));
    }
    for (const [sel, label] of selectors) {
      const el = document.querySelector(sel);
      if (!el) { res.elements.push({ label, sel, found: false }); continue; }
      const cs = getComputedStyle(el);
      res.elements.push({
        label, sel, found: true,
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage.slice(0, 120),
        color: cs.color,
        borderColor: cs.borderTopColor,
        boxShadow: cs.boxShadow.slice(0, 120),
        borderRadius: cs.borderRadius,
      });
    }
    return res;
  },
  { vars: VARS, selectors: SELECTORS },
);

console.log(`route ${ROUTE}`);
console.log(`Design Lab live theme applied: ${out.liveThemeApplied}`);
console.log(`inline (live-theme) vars on shell: ${out.inlineVars ? out.inlineVars.length : 0}`);
console.log("\n--- resolved custom properties ---");
for (const [k, v] of Object.entries(out.vars)) {
  const inline = out.inlineVars?.includes(k) ? "  <- LIVE THEME" : "";
  console.log(`  ${k.padEnd(34)} ${v}${inline}`);
}
console.log("\n--- computed element paint ---");
for (const e of out.elements) {
  if (!e.found) { console.log(`  ${e.label}: NOT FOUND (${e.sel})`); continue; }
  console.log(`  ${e.label}`);
  console.log(`     bg:      ${e.backgroundColor}`);
  if (e.backgroundImage && e.backgroundImage !== "none") console.log(`     bg-img:  ${e.backgroundImage}`);
  console.log(`     color:   ${e.color}`);
  console.log(`     border:  ${e.borderColor}   radius: ${e.borderRadius}`);
  if (e.boxShadow && e.boxShadow !== "none") console.log(`     shadow:  ${e.boxShadow}`);
}

await ctx.storageState({ path: AUTH });
await b.close();
