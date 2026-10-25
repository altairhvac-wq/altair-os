/**
 * Phone audit: loads the founder Playwright auth state, visits app routes at
 * iPhone size (375×812 @2x, touch), screenshots each one, and hit-tests every
 * interactive control for size (<44px), overlap, coverage (something else is
 * on top of the control's centre) and horizontal overflow.
 *
 * Requires:
 *   - App at BASE_URL (default http://localhost:3000)
 *   - .playwright/founder-auth.json (auto-refreshes via magic link when
 *     SUPABASE_SERVICE_ROLE_KEY is available, same as the capture scripts)
 *
 * Usage:
 *   node scripts/capture-phone-audit.mjs                         # technician routes
 *   node scripts/capture-phone-audit.mjs --mode owner_admin --routes /,/work,/customers
 *   node scripts/capture-phone-audit.mjs --out ui-audit/phone-audit/after
 *
 * Options:
 *   --mode technician|owner_admin|dispatch   owner view-mode to preload (default technician)
 *   --routes a,b,c                           routes to visit
 *   --extra account,job                      interactions: open the account sheet on the
 *                                            home routes, open the first job on schedule routes
 *   --out <dir>                              output folder (default ui-audit/phone-audit/<timestamp>)
 *
 * Output per route: <name>.png (viewport), <name>-full.png (full page) and
 * <name>.json (hit-test findings + every control's box). The console prints
 * the findings that need a look: covered, tiny (<32px), small (<40px),
 * offscreen-x, overlap and touching (<4px gap on the same row).
 *
 * The /tech/demo/schedule route (development only) renders the real schedule
 * screen with mock jobs on today's date, so the job detail can be audited
 * without seeding jobs.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";
const FOUNDER_EMAIL = "altairhvac@gmail.com";
const COMPANY_ID = "e7481798-414f-4a40-9bbf-e0ce3f288d3b";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
const OUT_DIR = path.resolve(
  ROOT,
  arg(
    "--out",
    path.join(
      "ui-audit",
      "phone-audit",
      new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"),
    ),
  ),
);
const MODE = arg("--mode", "technician");
const ROUTES = arg(
  "--routes",
  "/technician,/technician/schedule,/tech/time,/tech/receipts,/tech/notifications",
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const EXTRA = arg("--extra", "account,job").split(",");

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
      .filter(([k]) => k),
  );
}

function readStoredSession() {
  try {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const chunks = auth.cookies
      .filter((c) => c.name.includes("auth-token"))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (chunks.length === 0) return null;
    let raw = chunks.map((c) => c.value).join("");
    if (raw.startsWith("base64-")) raw = raw.slice(7);
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isSessionFresh(session) {
  return (
    Boolean(session?.expires_at) &&
    session.expires_at > Math.floor(Date.now() / 1000) + 120
  );
}

function authMatchesBaseUrl() {
  try {
    const hostname = new URL(BASE_URL).hostname.toLowerCase();
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    return auth.cookies.some(
      (c) =>
        typeof c.domain === "string" &&
        hostname === c.domain.replace(/^\./, "").toLowerCase(),
    );
  } catch {
    return false;
  }
}

async function refreshAuth() {
  const env = loadEnvFile();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("No Supabase URL / service-role key available; cannot refresh auth.");
    return false;
  }
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: FOUNDER_EMAIL,
    options: { redirectTo: `${BASE_URL}/auth/callback` },
  });
  if (error || !data?.properties?.hashed_token) {
    console.log("generateLink failed", error?.message);
    return false;
  }
  const cb = `${BASE_URL}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`;
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(cb, { waitUntil: "networkidle", timeout: 90_000 });
    await ctx.storageState({ path: AUTH_PATH });
    console.log("Refreshed founder auth via Supabase magic link.");
    return true;
  } finally {
    await browser.close();
  }
}

async function ensureAuth() {
  if (isSessionFresh(readStoredSession()) && authMatchesBaseUrl()) {
    return;
  }
  console.log("Founder auth missing, stale, or for another host — refreshing…");
  if (!(await refreshAuth())) {
    throw new Error(
      `Could not refresh auth. Run: BASE_URL=${BASE_URL} npm run capture:founder-auth`,
    );
  }
}

// Runs in the page. Returns every visible interactive control in the viewport
// with the problems found for it.
const HIT_TEST = `(() => {
  const vw = window.innerWidth, vh = window.innerHeight;
  const sel = 'a[href], button, [role="button"], input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const els = [...document.querySelectorAll(sel)].filter(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  });
  const label = el => (el.getAttribute('aria-label') || el.innerText || el.value || el.getAttribute('title') || el.tagName).trim().replace(/\\s+/g,' ').slice(0,40);
  const boxes = els.map(el => { const r = el.getBoundingClientRect(); return { el, r, label: label(el) }; });
  const box = r => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
  const findings = [];
  for (const b of boxes) {
    const cx = Math.min(vw-1, Math.max(0, b.r.left + b.r.width/2)), cy = Math.min(vh-1, Math.max(0, b.r.top + b.r.height/2));
    const top = document.elementFromPoint(cx, cy);
    const covered = top && !(b.el === top || b.el.contains(top));
    if (covered) findings.push({ type: 'covered', label: b.label, by: top ? (label(top.closest(sel)||top) + ' <' + top.tagName.toLowerCase() + '>') : null, box: box(b.r) });
    if (b.r.width < 32 || b.r.height < 32) findings.push({ type: 'tiny', label: b.label, box: box(b.r) });
    else if (b.r.width < 40 || b.r.height < 40) findings.push({ type: 'small', label: b.label, box: box(b.r) });
    if (b.r.right > vw + 1 || b.r.left < -1) findings.push({ type: 'offscreen-x', label: b.label, box: box(b.r) });
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i+1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
    const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ix > 2 && iy > 2) findings.push({ type: 'overlap', a: a.label, b: b.label, px: [Math.round(ix), Math.round(iy)] });
    const gapX = Math.max(a.r.left, b.r.left) - Math.min(a.r.right, b.r.right);
    const sameRow = iy > 10;
    if (sameRow && gapX >= 0 && gapX < 4) findings.push({ type: 'touching', a: a.label, b: b.label, gap: Math.round(gapX) });
  }
  const scrollW = document.scrollingElement.scrollWidth;
  return { count: boxes.length, hOverflow: scrollW > vw ? scrollW - vw : 0, findings, title: document.title, url: location.href,
    controls: boxes.map(b => ({ label: b.label, tag: b.el.tagName.toLowerCase(), box: box(b.r) })) };
})()`;

async function audit(page, name) {
  await page.waitForTimeout(600);
  const result = await page.evaluate(HIT_TEST);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
  await page.screenshot({ path: path.join(OUT_DIR, `${name}-full.png`), fullPage: true });
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(result, null, 2));
  const worthALook = result.findings.filter(
    (f) => !["overlap", "touching"].includes(f.type) && !(f.by || "").includes("NEXTJS-PORTAL"),
  );
  console.log(`\n== ${name}  ${result.url}  controls=${result.count} hOverflow=${result.hOverflow}`);
  for (const f of worthALook) console.log("  ", JSON.stringify(f));
  return result;
}

async function main() {
  await ensureAuth();
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await ctx.addInitScript(
    ({ companyId, mode }) => {
      try {
        window.localStorage.setItem(`altair:owner-view-mode:v1:${companyId}`, mode);
      } catch {}
    },
    { companyId: COMPANY_ID, mode: MODE },
  );
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
  });

  for (const route of ROUTES) {
    const name = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "load", timeout: 120_000 });
    await page.waitForTimeout(2500);
    if (page.url().includes("/login")) {
      console.log("Redirected to login at", route);
      continue;
    }
    await audit(page, name);

    if (EXTRA.includes("account") && ["/technician", "/", "/work"].includes(route)) {
      const t = page.locator(
        '[data-testid="tech-account-button"], [data-testid="admin-account-button"]',
      );
      if (await t.count()) {
        await t.first().click();
        await page.waitForTimeout(500);
        await audit(page, `${name}-account`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }
    if (EXTRA.includes("job") && route.includes("schedule")) {
      const hero = page.locator('article button[type="button"]').first();
      if (await hero.count()) {
        await hero.click();
        await page.waitForTimeout(1200);
        await audit(page, `${name}-jobdetail`);
        await page.evaluate(() => {
          const b = document.querySelector(".overlay-scroll-body");
          if (b) b.scrollTop = b.scrollHeight;
        });
        await page.waitForTimeout(400);
        await audit(page, `${name}-jobdetail-bottom`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }
    if (route === "/tech/receipts") {
      const add = page.getByRole("button", { name: /^Add/ }).first();
      if (await add.count()) {
        await add.click();
        await page.waitForTimeout(800);
        await audit(page, `${name}-addsheet`);
        await page.keyboard.press("Escape");
      }
    }
  }
  fs.writeFileSync(
    path.join(OUT_DIR, "console-errors.json"),
    JSON.stringify(consoleErrors, null, 2),
  );
  console.log(`\nWrote ${OUT_DIR}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
