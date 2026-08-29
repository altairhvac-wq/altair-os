/**
 * Prestige campaign screenshot harness.
 *
 * Usage:
 *   AUTH_STATE=<path> node ui-audit/shots.mjs <label> [width] [routes,csv]
 *
 * Writes ui-audit/SHOTS/<label>--<slug>--<width>.png (gitignored).
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "ui-audit", "SHOTS");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim();
if (!AUTH) { console.error("Set AUTH_STATE"); process.exit(1); }

const label = process.argv[2] || "shot";
const width = Number(process.argv[3] || 1440);
const routes = (process.argv[4] || "/,/customers,/reports,/sales,/work")
  .split(",").map((r) => r.trim()).filter(Boolean);

const slug = (r) => {
  const p = r.split("?")[0];
  return p === "/" ? "dashboard" : p.replace(/^\/+/, "").replace(/[^\w.-]+/g, "-");
};

fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ headless: true });
const isMobile = width < 640;
const ctx = await b.newContext({
  storageState: AUTH,
  viewport: { width, height: isMobile ? 844 : 900 },
  deviceScaleFactor: isMobile ? 2 : 1,
  isMobile,
  hasTouch: isMobile,
});
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
p.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });

for (const route of routes) {
  try {
    await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForFunction(
      () => document.querySelectorAll(".north-star-skeleton").length === 0,
      { timeout: 25000 },
    ).catch(() => {});
    await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
    await p.waitForTimeout(700);
    const file = path.join(OUT, `${label}--${slug(route)}--${width}.png`);
    await p.screenshot({ path: file, animations: "disabled" });
    console.log(`  ${path.basename(file)}`);
  } catch (e) {
    console.log(`  FAIL ${route}: ${String(e.message).slice(0, 100)}`);
  }
}

const uniq = [...new Set(errs)].filter(
  (e) => !/ERR_FAILED|MIME type|behind a redirect/.test(e),
);
if (uniq.length) {
  console.log("\nconsole errors:");
  uniq.slice(0, 6).forEach((e) => console.log("  ! " + e));
}

/*
 * Persisting the browser state back over the auth file refreshes rotating
 * Supabase tokens, which is why it is here — but done unconditionally it is
 * destructive: a run that lands on /login saves a LOGGED-OUT state over a
 * working session file, and the session cannot be recovered without signing in
 * again. That is exactly what happened to `.playwright/founder-auth.json`
 * during this campaign, and five "screenshots of the product" turned out to be
 * five screenshots of the sign-in page.
 *
 * So: only write back a state that still carries a Supabase session, and fail
 * loudly rather than silently capturing the logged-out shell.
 */
const state = await ctx.storageState();
const hasSession = state.cookies.some((c) => /^sb-.*-auth-token/.test(c.name));
if (hasSession) {
  fs.writeFileSync(AUTH, JSON.stringify(state, null, 2));
} else {
  console.log(
    `\n  !! ${AUTH} carries no Supabase session — captures above are the\n` +
      "     signed-out shell, not the product. The file was left untouched.\n" +
      "     Re-create it with:  npm run capture:founder-auth",
  );
}
await b.close();
if (!hasSession) process.exit(2);
