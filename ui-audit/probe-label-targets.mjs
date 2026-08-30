/**
 * Every `<label for=X>` must resolve to a VISIBLE control.
 *
 * `document.getElementById` returns the first match, so a component mounted
 * twice — which the detail-panel primitive does, into a desktop drawer and a
 * mobile overlay — silently points every label at the hidden copy. The symptom
 * is invisible: the label looks right, it just focuses nothing you can see.
 *
 *   AUTH_STATE=.playwright/founder-auth.json node ui-audit/probe-label-targets.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim() || ".playwright/founder-auth.json";

const CHECK = () => {
  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden";
  };
  const dupIds = {};
  for (const el of document.querySelectorAll("[id]")) {
    dupIds[el.id] = (dupIds[el.id] || 0) + 1;
  }
  const broken = [];
  for (const label of document.querySelectorAll("label[for]")) {
    if (!visible(label)) continue; // a hidden label is not a user-facing problem
    const target = document.getElementById(label.htmlFor);
    if (!target) broken.push({ for: label.htmlFor, why: "no element with that id" });
    else if (!visible(target)) broken.push({ for: label.htmlFor, why: "resolves to a hidden control" });
  }
  return {
    broken,
    duplicates: Object.entries(dupIds).filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`),
  };
};

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ storageState: AUTH, viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
let fails = 0;

/* Open a detail panel, which is the only way to mount the doubled subtree. */
const SCENARIOS = [
  { route: "/expenses", open: "text=New expense" },
  { route: "/price-book", open: "button:has-text('New Service Item')" },
  { route: "/settings", open: null },
  { route: "/customers", open: null },
];

for (const { route, open } of SCENARIOS) {
  await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  let opened = "not attempted";
  if (open) {
    const btn = p.locator(open).first();
    if (await btn.count().catch(() => 0)) {
      await btn.click({ timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(900);
      opened = "clicked";
    } else opened = "control not found";
  }
  const { broken, duplicates } = await p.evaluate(CHECK);
  console.log(`\n${route}  (panel: ${opened})`);
  console.log(`  duplicate ids: ${duplicates.length ? duplicates.join(", ") : "none"}`);
  if (broken.length) {
    fails += broken.length;
    for (const x of broken) console.log(`  FAIL  label[for="${x.for}"] — ${x.why}`);
  } else console.log("  all visible labels resolve to visible controls");
}
console.log(`\n${fails === 0 ? "ALL PASS" : fails + " BROKEN LABELS"}`);
await b.close();
process.exit(fails === 0 ? 0 : 1);
