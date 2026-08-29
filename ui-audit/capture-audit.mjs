/**
 * UI-audit capture tool (local, throwaway). Captures the REAL rendering of
 * every meaningful route at three viewports (desktop 1440x900, tablet
 * 1024x768, mobile 390x844) using saved Playwright auth state. Unlike
 * capture-comparison-screenshots.mjs it does NOT expand scroll regions or
 * resize output — the point is to see the product exactly as a user does,
 * including inner scrollers, clipping, and the feedback widget.
 *
 * Output: ui-audit/SCREENSHOTS/<slug>--<viewport>-{fold,full}.png
 *         ui-audit/SCREENSHOTS/capture-report.json (per-page diagnostics)
 */

import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "ui-audit", "SCREENSHOTS");
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";
// Working auth-state copy OUTSIDE the repo. Supabase rotates refresh tokens,
// so every context must start from the previous context's saved state.
const AUTH_STATE = process.env.AUTH_STATE?.trim();
if (!AUTH_STATE) {
  console.error("Set AUTH_STATE=<path to working auth-state json>");
  process.exit(1);
}

const VIEWPORT_FILTER = (process.env.VIEWPORTS?.trim() || "desktop,tablet,mobile").split(",");
const VIEWPORTS = [
  { key: "desktop", width: 1440, height: 900, dsf: 1, fold: true },
  { key: "tablet", width: 1024, height: 768, dsf: 1, fold: false },
  { key: "mobile", width: 390, height: 844, dsf: 2, fold: true, isMobile: true },
].filter((v) => VIEWPORT_FILTER.includes(v.key));

const ADMIN_ROUTES = [
  "/",
  "/customers",
  "/customers/import",
  "/leads",
  "/jobs",
  "/work",
  "/estimates",
  "/invoices",
  "/payments",
  "/expenses",
  "/payroll",
  "/price-book",
  "/dispatch",
  "/technicians",
  "/team",
  "/schedule",
  "/time",
  "/time-clock",
  "/reports",
  "/reports/tax-summary",
  "/sales",
  "/marketing",
  "/network",
  "/community",
  "/alpha-tracker",
  "/settings",
  "/settings/company",
  "/settings/team",
  "/settings/users",
  "/settings/billing",
  "/settings/subscription",
  "/settings/payments",
  "/settings/documents",
  "/settings/integrations",
  "/settings/notifications",
  "/settings/preferences",
  "/settings/system-check",
  "/platform",
  "/platform/bugs",
  "/technician",
  "/technician/schedule",
  "/tech",
];

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/pricing",
  "/welcome",
  "/privacy",
  "/terms",
  "/install",
];

function slugOf(route) {
  const p = route.split("?")[0] || "/";
  if (p === "/") return "dashboard";
  return (
    p
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "page"
  );
}

async function settle(page) {
  await page
    .waitForFunction(
      () => document.querySelectorAll(".north-star-skeleton").length === 0,
      { timeout: 30_000 },
    )
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(600);
}

async function diagnostics(page) {
  return page.evaluate(() => {
    const de = document.documentElement;
    const hOverflow = Math.max(de.scrollWidth - window.innerWidth, 0);
    const wide = [];
    if (hOverflow > 1) {
      for (const el of document.querySelectorAll("body *")) {
        if (!(el instanceof HTMLElement)) continue;
        const r = el.getBoundingClientRect();
        if (r.width > window.innerWidth + 1 && el.children.length < 30) {
          const cls = typeof el.className === "string" ? el.className : "";
          wide.push(`${el.tagName.toLowerCase()}.${cls.slice(0, 80)} w=${Math.round(r.width)}`);
          if (wide.length >= 5) break;
        }
      }
    }
    const h1s = [...document.querySelectorAll("h1")].map((h) => h.textContent?.trim().slice(0, 80));
    const innerScrollers = [...document.querySelectorAll("body *")]
      .filter((el) => {
        if (!(el instanceof HTMLElement)) return false;
        const s = getComputedStyle(el);
        return (
          (["auto", "scroll"].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 1) ||
          (["auto", "scroll"].includes(s.overflowX) && el.scrollWidth > el.clientWidth + 1)
        );
      }).length;
    return {
      title: document.title,
      h1s,
      hOverflow,
      wideElements: wide,
      innerScrollers,
      docHeight: de.scrollHeight,
    };
  });
}

async function captureRoute(page, route, vp, report, consoleErrors) {
  const slug = slugOf(route);
  const url = `${BASE_URL}${route}`;
  const entry = { route, slug, viewport: vp.key, ok: false };
  consoleErrors.length = 0;
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await settle(page);
    entry.status = resp?.status() ?? null;
    entry.finalUrl = page.url().replace(BASE_URL, "");
    entry.redirected = entry.finalUrl.split("?")[0] !== route.split("?")[0];
    Object.assign(entry, await diagnostics(page));
    if (vp.fold) {
      await page.screenshot({
        path: path.join(OUT_DIR, `${slug}--${vp.key}-fold.png`),
        type: "png",
        animations: "disabled",
      });
    }
    await page.screenshot({
      path: path.join(OUT_DIR, `${slug}--${vp.key}-full.png`),
      type: "png",
      fullPage: true,
      animations: "disabled",
    });
    entry.consoleErrors = [...new Set(consoleErrors)].slice(0, 10);
    entry.ok = true;
    console.log(
      `  ok ${vp.key} ${route} -> ${entry.finalUrl}${entry.hOverflow > 1 ? ` [H-OVERFLOW ${entry.hOverflow}px]` : ""}${entry.consoleErrors.length ? ` [${entry.consoleErrors.length} console errors]` : ""}`,
    );
  } catch (err) {
    entry.error = err instanceof Error ? err.message.slice(0, 300) : String(err);
    console.log(`  FAIL ${vp.key} ${route}: ${entry.error}`);
  }
  report.push(entry);
}

async function discoverDetailRoutes(context) {
  const page = await context.newPage();
  const found = [];
  const specs = [
    { list: "/customers", prefix: "/customers/", extra: [] },
    { list: "/jobs", prefix: "/jobs/", extra: ["/work/{id}"] },
    { list: "/estimates", prefix: "/estimates/", extra: [] },
    { list: "/invoices", prefix: "/invoices/", extra: ["/invoices/{id}/edit"] },
    { list: "/team", prefix: "/team/", extra: [] },
  ];
  for (const spec of specs) {
    try {
      await page.goto(`${BASE_URL}${spec.list}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await settle(page);
      const href = await page.evaluate((prefix) => {
        const links = [...document.querySelectorAll(`a[href^="${prefix}"]`)];
        const detail = links.find((a) => {
          const h = a.getAttribute("href") || "";
          const rest = h.slice(prefix.length);
          return rest && !rest.includes("/") && rest !== "import" && rest !== "new";
        });
        return detail ? detail.getAttribute("href") : null;
      }, spec.prefix);
      if (href) {
        found.push(href.split("?")[0]);
        const id = href.split("?")[0].slice(spec.prefix.length);
        for (const t of spec.extra) found.push(t.replace("{id}", id));
        console.log(`  discovered ${href}`);
      } else {
        console.log(`  no detail link found on ${spec.list}`);
      }
    } catch (e) {
      console.log(`  discovery failed on ${spec.list}: ${e.message?.slice(0, 120)}`);
    }
  }
  await page.close();
  return found;
}

async function assertAuthenticated(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  const shell = await page
    .locator('[data-testid="admin-shell-main"]')
    .count()
    .catch(() => 0);
  if (page.url().includes("/login") || shell === 0) {
    throw new Error(
      `Auth state is not authenticated (url=${page.url()}, shell=${shell}). Refresh founder auth first.`,
    );
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = [];

  // Chain 1: validate auth + discover detail routes (desktop context).
  let adminRoutes = [...ADMIN_ROUTES];
  {
    const ctx = await browser.newContext({
      storageState: AUTH_STATE,
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await assertAuthenticated(page);
    console.log("Auth OK — discovering detail routes…");
    await page.close();
    const detail = await discoverDetailRoutes(ctx);
    adminRoutes = [...adminRoutes, ...detail];
    await ctx.storageState({ path: AUTH_STATE });
    await ctx.close();
  }

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Viewport ${vp.key} (${vp.width}x${vp.height}) ===`);

    const pubCtx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      isMobile: !!vp.isMobile,
      hasTouch: !!vp.isMobile,
    });
    const pubPage = await pubCtx.newPage();
    const pubErrors = [];
    pubPage.on("pageerror", (e) => pubErrors.push(`pageerror: ${e.message?.slice(0, 200)}`));
    pubPage.on("console", (m) => {
      if (m.type() === "error") pubErrors.push(m.text().slice(0, 200));
    });
    for (const route of PUBLIC_ROUTES) {
      await captureRoute(pubPage, route, vp, report, pubErrors);
    }
    await pubCtx.close();

    const ctx = await browser.newContext({
      storageState: AUTH_STATE,
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      isMobile: !!vp.isMobile,
      hasTouch: !!vp.isMobile,
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(`pageerror: ${e.message?.slice(0, 200)}`));
    page.on("console", (m) => {
      if (m.type() === "error") errs.push(m.text().slice(0, 200));
    });
    for (const route of adminRoutes) {
      await captureRoute(page, route, vp, report, errs);
    }
    await ctx.storageState({ path: AUTH_STATE });
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(
    path.join(OUT_DIR, "capture-report.json"),
    JSON.stringify({ base: BASE_URL, auth: "founder", at: "audit", report }, null, 2),
  );
  const ok = report.filter((r) => r.ok).length;
  console.log(`\nDone: ${ok}/${report.length} captures -> ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
