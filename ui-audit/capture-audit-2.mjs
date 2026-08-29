/**
 * UI-audit supplemental capture: below-the-fold expanded content, job detail,
 * interactive states (dropdowns, dialogs, focus, hover, drawers, accordions),
 * and print emulation. Output: ui-audit/SCREENSHOTS/x-*.png
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "ui-audit", "SCREENSHOTS");
const BASE = "http://localhost:3000";
const AUTH_STATE = process.env.AUTH_STATE?.trim();
if (!AUTH_STATE) { console.error("Set AUTH_STATE"); process.exit(1); }

const log = (m) => console.log(m);

async function settle(page, ms = 600) {
  await page.waitForFunction(() => document.querySelectorAll(".north-star-skeleton").length === 0, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function expandScrollers(page) {
  await page.evaluate(() => {
    const clips = new Set();
    const scrollers = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement)) continue;
      const s = getComputedStyle(el);
      const y = ["auto", "scroll"].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
      const x = ["auto", "scroll"].includes(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
      if (y || x) scrollers.push({ el, y, x });
    }
    for (const { el } of scrollers) {
      let a = el.parentElement;
      while (a instanceof HTMLElement) {
        const s = getComputedStyle(a);
        if (/(hidden|clip|auto|scroll)/.test(s.overflow + s.overflowX + s.overflowY)) clips.add(a);
        a = a.parentElement;
      }
    }
    clips.add(document.documentElement); clips.add(document.body);
    for (const el of clips) { el.style.overflow = "visible"; el.style.height = "auto"; el.style.maxHeight = "none"; }
    for (const { el, y, x } of scrollers) {
      el.style.overflow = "visible";
      if (y) { el.style.height = "auto"; el.style.maxHeight = "none"; el.style.minHeight = el.scrollHeight + "px"; }
      if (x) { el.style.maxWidth = "none"; el.style.minWidth = el.scrollWidth + "px"; }
    }
  });
  await page.waitForTimeout(200);
}

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: path.join(OUT, `x-${name}.png`), type: "png", animations: "disabled", ...opts });
  log(`  shot x-${name}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ storageState: AUTH_STATE, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("dialog", async (d) => { log(`  [native dialog] ${d.type()}: ${d.message().slice(0, 120)}`); await d.dismiss().catch(() => {}); });

  // --- Job detail via first row on /work (rows may not be links)
  await page.goto(`${BASE}/work?view=all`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await shot(page, "work-all-desktop");
  const jobLink = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/work/"]');
    return a ? a.getAttribute("href") : null;
  });
  let jobHref = jobLink;
  if (!jobHref) {
    const row = page.locator('[data-testid="job-row"]').first();
    if (await row.count()) {
      await row.click();
      await page.waitForURL(/\/work\/.+/, { timeout: 15000 }).catch(() => {});
      jobHref = new URL(page.url()).pathname.startsWith("/work/") ? new URL(page.url()).pathname : null;
    }
  }
  log(`job detail: ${jobHref}`);
  if (jobHref) {
    await page.goto(`${BASE}${jobHref}`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await shot(page, "job-detail-desktop-fold");
    await expandScrollers(page);
    await shot(page, "job-detail-desktop-expanded", { fullPage: true });
  }

  // --- Expanded full-content captures of key long pages
  const EXPAND = [
    ["/", "dashboard"],
    ["/reports", "reports"],
    ["/reports/tax-summary", "tax-summary"],
    ["/settings", "settings"],
    ["/settings/company", "settings-company"],
    ["/settings/users", "settings-users"],
    ["/settings/billing", "settings-billing"],
    ["/community", "community"],
    ["/sales?tab=invoices", "sales-invoices"],
    ["/sales?tab=payments", "sales-payments"],
    ["/customers?tab=pipeline", "customers-pipeline"],
    ["/marketing", "marketing"],
  ];
  for (const [route, slug] of EXPAND) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await settle(page);
      await expandScrollers(page);
      await shot(page, `${slug}-desktop-expanded`, { fullPage: true });
    } catch (e) { log(`  fail ${route}: ${e.message?.slice(0, 100)}`); }
  }

  // Discovered detail routes (from prior run)
  const rep = JSON.parse(fs.readFileSync(path.join(OUT, "capture-report.json"), "utf8")).report;
  const detail = [...new Set(rep.map((r) => r.route).filter((r) => /\/(customers|estimates|invoices|team)\/[0-9a-f-]{36}/.test(r)))];
  for (const route of detail) {
    const slug = route.split("/")[1] + "-detail";
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
      await settle(page);
      await expandScrollers(page);
      await shot(page, `${slug}-desktop-expanded`, { fullPage: true });
    } catch (e) { log(`  fail ${route}: ${e.message?.slice(0, 100)}`); }
  }

  // --- Interactive states on /customers
  await page.goto(`${BASE}/customers`, { waitUntil: "domcontentloaded" });
  await settle(page);
  // hover first row
  const firstRow = page.locator("table tbody tr").first();
  if (await firstRow.count()) { await firstRow.hover(); await page.waitForTimeout(200); await shot(page, "customers-row-hover"); }
  // focus search via keyboard
  const search = page.locator('input[type="search"], input[placeholder*="Search"]').first();
  if (await search.count()) { await search.focus(); await page.waitForTimeout(150); await shot(page, "customers-search-focus"); }
  // tab focus ring tour: press Tab 12 times from body, capture ring on interactive el
  await page.evaluate(() => document.body.focus());
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  await shot(page, "customers-tab-focus-12");
  // New Customer control
  const newCustomer = page.getByRole("button", { name: /new customer/i }).or(page.getByRole("link", { name: /new customer/i })).first();
  if (await newCustomer.count()) {
    await newCustomer.click().catch(() => {});
    await page.waitForTimeout(1200);
    await settle(page, 300);
    await shot(page, "customers-new-form", { fullPage: true });
  }

  // --- Header dropdowns (on dashboard)
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const bell = page.locator('button[aria-label*="otification"], button:has(svg.lucide-bell)').first();
  if (await bell.count()) { await bell.click().catch(() => {}); await page.waitForTimeout(400); await shot(page, "header-notifications-open"); await page.keyboard.press("Escape"); }
  const switcher = page.locator('button[aria-haspopup="listbox"]').first();
  if (await switcher.count()) { await switcher.click().catch(() => {}); await page.waitForTimeout(400); await shot(page, "header-switcher-open"); await page.keyboard.press("Escape"); }
  // dead search button click
  const searchBtn = page.locator('button[aria-label="Search"]').first();
  if (await searchBtn.count()) { await searchBtn.click().catch(() => {}); await page.waitForTimeout(500); await shot(page, "header-search-clicked"); }

  // --- Dashboard accordions: click every collapsed needs-attention card
  const chevrons = page.locator("main button:has(svg.lucide-chevron-down)");
  const n = await chevrons.count();
  log(`dashboard chevron buttons: ${n}`);
  for (let i = 0; i < Math.min(n, 8); i++) { await chevrons.nth(i).click().catch(() => {}); await page.waitForTimeout(250); }
  await settle(page, 300);
  await expandScrollers(page);
  await shot(page, "dashboard-accordions-open", { fullPage: true });

  // --- Estimate modal intercept: from sales list, click estimate row link
  await page.goto(`${BASE}/sales?tab=estimates`, { waitUntil: "domcontentloaded" });
  await settle(page);
  const estLink = page.locator('a[href^="/estimates/"]').first();
  if (await estLink.count()) {
    await estLink.click();
    await page.waitForTimeout(1500);
    await settle(page, 300);
    await shot(page, "estimate-modal-intercept");
  }

  // --- Print emulation of estimate + invoice detail
  const est = detail.find((r) => r.startsWith("/estimates/"));
  const inv = detail.find((r) => r.startsWith("/invoices/") && !r.endsWith("/edit"));
  for (const [route, slug] of [[est, "estimate-print"], [inv, "invoice-print"]]) {
    if (!route) continue;
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(300);
    await shot(page, slug, { fullPage: true });
    await page.emulateMedia({ media: "screen" });
  }
  await ctx.storageState({ path: AUTH_STATE });
  await ctx.close();

  // --- Mobile interactive: drawer, job detail, invoice edit form
  const mctx = await browser.newContext({ storageState: AUTH_STATE, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  await mp.goto(`${BASE}/customers`, { waitUntil: "domcontentloaded" });
  await settle(mp);
  const hamburger = mp.locator('button[aria-label*="navigation" i], button[aria-label*="menu" i]').first();
  if (await hamburger.count()) { await hamburger.click().catch(() => {}); await mp.waitForTimeout(500); await shot(mp, "mobile-quicknav-drawer"); await mp.keyboard.press("Escape").catch(() => {}); }
  if (jobHref) {
    await mp.goto(`${BASE}${jobHref}`, { waitUntil: "domcontentloaded" });
    await settle(mp);
    await shot(mp, "job-detail-mobile-fold");
    await expandScrollers(mp);
    await shot(mp, "job-detail-mobile-expanded", { fullPage: true });
  }
  const invEdit = detail.find((r) => r.endsWith("/edit"));
  if (invEdit) {
    await mp.goto(`${BASE}${invEdit}`, { waitUntil: "domcontentloaded" });
    await settle(mp);
    await shot(mp, "invoice-edit-mobile-fold");
  }
  await mctx.storageState({ path: AUTH_STATE });
  await mctx.close();
  await browser.close();
  log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
