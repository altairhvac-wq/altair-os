/**
 * Every header popover must close on Escape and hand focus back to its trigger.
 *
 * An Escape that closes the panel but leaves focus on <body> strands a keyboard
 * user mid-page, so both halves are asserted.
 *
 *   AUTH_STATE=.playwright/founder-auth.json node ui-audit/probe-popover-keyboard.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim() || ".playwright/founder-auth.json";

const POPOVERS = [
  { name: "notification bell", selector: 'button:has(svg.lucide-bell)' },
  { name: "owner view switcher", selector: 'button[aria-label="View as"]' },
  { name: "company switcher", selector: 'button[aria-haspopup="listbox"]:not([aria-label="View as"])' },
];

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ storageState: AUTH, viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 90000 });
await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
await p.waitForTimeout(900);

let fails = 0;
for (const { name, selector } of POPOVERS) {
  const trigger = p.locator(selector).first();
  if (!(await trigger.count())) { console.log(`  SKIP  ${name} — not present`); continue; }
  await trigger.click();
  await p.waitForTimeout(350);
  const opened = await trigger.getAttribute("aria-expanded");
  await p.keyboard.press("Escape");
  await p.waitForTimeout(350);
  const closed = await trigger.getAttribute("aria-expanded");
  const focusReturned = await p.evaluate((sel) => document.activeElement === document.querySelector(sel), selector);
  const ok = opened === "true" && closed === "false" && focusReturned;
  if (!ok) fails += 1;
  console.log(`  ${ok ? "pass" : "FAIL"}  ${name}: opened=${opened} closedOnEscape=${closed === "false"} focusReturned=${focusReturned}`);

  /* Containment: with the panel open, Tab must never land outside it. Twelve
   * presses is more than any of these panels holds, so a contained panel wraps
   * and an uncontained one escapes into the page behind it. */
  await trigger.click();
  await p.waitForTimeout(350);
  let escaped = null;
  for (let i = 0; i < 12; i += 1) {
    await p.keyboard.press("Tab");
    await p.waitForTimeout(70);
    const outside = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "body";
      return a.closest("[data-popover-panel]") ? null : (a.textContent || a.tagName).trim().slice(0, 30);
    });
    if (outside) { escaped = `${outside} (after ${i + 1} tabs)`; break; }
  }
  if (escaped) { fails += 1; console.log(`        FAIL  focus escaped to: ${escaped}`); }
  else console.log(`        pass  focus stayed inside for 12 tabs`);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(250);
}
await b.close();
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
