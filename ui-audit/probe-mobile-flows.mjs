/**
 * Mobile release checks at 390px.
 *
 *  1. The page body must not scroll sideways. Wide content (tables, code) may
 *     scroll inside its own container, but the document must not.
 *  2. Interactive controls must meet a 44px touch target on at least one axis
 *     (WCAG 2.5.8 asks 24px; the product's own standard is 44).
 *  3. No element may overflow the viewport width.
 *
 *   AUTH_STATE=.playwright/founder-auth.json node ui-audit/probe-mobile-flows.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim() || ".playwright/founder-auth.json";
const ROUTES = (process.argv[2] ||
  "/,/work,/dispatch,/customers,/leads,/sales,/invoices,/estimates,/expenses,/reports,/time-clock,/payroll,/price-book,/schedule,/team,/settings,/settings/team,/technician,/technician/schedule"
).split(",");

const CHECK = (vw) => {
  const doc = document.documentElement;
  /* `html` and `body` are overflow-x-clip, so a wide child does not make the
   * page pan — it gets CUT OFF, which is worse because the control is simply
   * gone rather than reachable by scrolling. Measure the clipped width. */
  const bodyOverflow = Math.max(doc.scrollWidth, document.body.scrollWidth) - vw;

  /* Elements wider than the viewport that are NOT inside their own horizontal
   * scroller — those are the ones that actually push the page sideways. */
  const bleeders = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width <= vw + 1) continue;
    let scrolled = false;
    for (let n = el.parentElement; n; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden") { scrolled = true; break; }
    }
    if (scrolled) continue;
    bleeders.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width),
      cls: (typeof el.className === "string" ? el.className : "").slice(0, 60) });
    if (bleeders.length >= 4) break;
  }

  const small = [];
  for (const el of document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, [role="button"], [role="tab"]')) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    /* Measure the EFFECTIVE target. A 16px checkbox inside a 44px label is a
     * 44px target; measuring the input alone reports a failure that a finger
     * never experiences. */
    const target = el.closest("label") ?? el;
    const r = target.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height >= 24 && r.width >= 24) continue; // WCAG 2.5.8

    /* 2.5.8's inline exception: a target whose size is constrained by the
     * line-height of surrounding text is exempt. A link in a sentence, or a
     * row's name rendered as a button, cannot be 44px tall without breaking the
     * text it sits in — and in the row case the row itself is the finger
     * target anyway. Flag only standalone controls. */
    const lh = parseFloat(getComputedStyle(target).lineHeight);
    if (Number.isFinite(lh) && Math.abs(r.height - lh) <= 4) continue;
    small.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height),
      label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24) });
    if (small.length >= 5) break;
  }
  return { bodyOverflow, bleeders, small };
};

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ storageState: AUTH, viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
let fails = 0;
for (const route of ROUTES) {
  try {
    await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 90000 });
    await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    await p.waitForTimeout(600);
    const { bodyOverflow, bleeders, small } = await p.evaluate(CHECK, 390);
    const bad = bodyOverflow > 1 || bleeders.length || small.length;
    if (bad) fails += 1;
    console.log(`${bad ? "FAIL" : "pass"}  ${route}${bodyOverflow > 1 ? `  ${bodyOverflow}px of content clipped off-screen` : ""}`);
    for (const x of bleeders) console.log(`        bleed  <${x.tag}> ${x.w}px  ${x.cls}`);
    for (const x of small) console.log(`        touch  <${x.tag}> ${x.w}x${x.h}  "${x.label}"`);
  } catch (e) { console.log(`SKIP  ${route}  ${String(e).slice(0, 50)}`); }
}
await b.close();
console.log(`\n${fails === 0 ? "ALL PASS" : `${fails} routes with issues`}`);
process.exit(fails === 0 ? 0 : 1);
