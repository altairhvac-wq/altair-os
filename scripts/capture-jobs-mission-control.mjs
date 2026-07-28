/**
 * Capture Jobs Mission Control screenshots (owner experience).
 * Requires: running app at BASE_URL. Refreshes founder auth when needed.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT_DIR = path.join(ROOT, "docs", "product", "jobs-mission-control");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const FOUNDER_EMAIL = "altairhvac@gmail.com";
const SUPABASE_PROJECT_REF = "acsmgzkbvstrbggsukyx";

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
      .filter(([key]) => key),
  );
}

function readStoredSession() {
  if (!fs.existsSync(AUTH_PATH)) return null;
  try {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const chunks = auth.cookies
      .filter((cookie) => cookie.name.includes("auth-token"))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (chunks.length === 0) return null;
    let raw = chunks.map((chunk) => chunk.value).join("");
    if (raw.startsWith("base64-")) raw = raw.slice(7);
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isSessionFresh(session) {
  if (!session?.expires_at) return false;
  return session.expires_at > Math.floor(Date.now() / 1000) + 120;
}

function getServiceRoleKey(env) {
  const fromEnv =
    env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fromEnv) return fromEnv;

  try {
    const raw = execSync(
      `npx supabase projects api-keys --project-ref ${SUPABASE_PROJECT_REF} -o json`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) return null;
    const keys = JSON.parse(raw.slice(start, end + 1));
    return keys.find((key) => key.name === "service_role")?.api_key ?? null;
  } catch {
    return null;
  }
}

async function refreshFounderAuthViaMagicLink() {
  const env = {
    ...loadEnvFile(),
    ...(process.env.NEXT_PUBLIC_SUPABASE_URL
      ? { NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL }
      : {}),
    ...(process.env.SUPABASE_SERVICE_ROLE_KEY
      ? { SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY }
      : {}),
  };
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL");
    return false;
  }
  const serviceRole = getServiceRoleKey(env);
  if (!serviceRole) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return false;
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: FOUNDER_EMAIL,
    options: { redirectTo: `${BASE}/auth/callback` },
  });
  if (error || !data?.properties?.hashed_token) {
    console.error("magic link failed", error?.message);
    return false;
  }

  const callbackUrl = `${BASE}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(callbackUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await context.storageState({ path: AUTH_PATH });
    console.log("Refreshed founder auth via magic link.");
    return true;
  } finally {
    await browser.close();
  }
}

async function ensureAuth() {
  if (isSessionFresh(readStoredSession())) {
    console.log("Founder auth still fresh.");
    return;
  }
  console.log("Refreshing founder auth...");
  const ok = await refreshFounderAuthViaMagicLink();
  if (!ok) {
    throw new Error("Could not refresh founder auth.");
  }
}

async function hideChrome(page) {
  await page.addStyleTag({
    content: `
      [aria-label="Closed beta"],
      [aria-label="Send feedback"],
      div.no-print.fixed.right-4.z-40 {
        display: none !important;
      }
    `,
  });
}

async function gotoJobs(page, query = "") {
  const url = query ? `${BASE}/jobs?${query}` : `${BASE}/jobs`;
  await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 90_000,
  });
  await page.waitForTimeout(1000);
  await hideChrome(page);
  const landed = page.url();
  if (landed.includes("/login")) {
    throw new Error(`Auth failed — landed on ${landed}`);
  }
}

async function shot(page, name, options = {}) {
  const out = path.join(OUT_DIR, name);
  await page.screenshot({ path: out, type: "png", ...options });
  console.log("wrote", name);
}

async function main() {
  await ensureAuth();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1. Mobile Jobs — 390px
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoJobs(page, "view=today");
  await shot(page, "01-mobile-jobs-390.png", { fullPage: true });

  // 2. Mobile Jobs — 360px
  await page.setViewportSize({ width: 360, height: 800 });
  await gotoJobs(page, "view=today");
  await shot(page, "02-mobile-jobs-360.png", { fullPage: true });

  // 3. Desktop Jobs — 1728px
  await page.setViewportSize({ width: 1728, height: 1117 });
  await gotoJobs(page, "view=all");
  await shot(page, "03-desktop-jobs-1728.png", { fullPage: true });

  // 4. Desktop table close-up
  const desktopList = page.locator("div.job-mission-list").first();
  if ((await desktopList.count()) > 0 && (await desktopList.isVisible())) {
    await desktopList.screenshot({
      path: path.join(OUT_DIR, "04-desktop-table-closeup.png"),
      type: "png",
    });
    console.log("wrote 04-desktop-table-closeup.png");
  } else {
    await shot(page, "04-desktop-table-closeup.png", { fullPage: false });
  }

  // 5. Search state
  const search = page.getByRole("searchbox", { name: /search jobs/i });
  if ((await search.count()) > 0) {
    await search.fill("a");
  } else {
    await page.locator('input[type="search"]').first().fill("a");
  }
  await page.waitForTimeout(400);
  const filterRegion = page.locator(".job-mission-filter-region").first();
  if ((await filterRegion.count()) > 0) {
    await filterRegion.screenshot({
      path: path.join(OUT_DIR, "05-search-state.png"),
      type: "png",
    });
    console.log("wrote 05-search-state.png");
  } else {
    await shot(page, "05-search-state.png", { fullPage: false });
  }

  // 6. Filter / queue state
  await page.locator('input[type="search"]').first().fill("");
  await page.waitForTimeout(300);
  const todayTab = page.getByRole("tab", { name: /today/i }).first();
  if ((await todayTab.count()) > 0) {
    await todayTab.click();
    await page.waitForTimeout(300);
  }
  const statusSelect = page.getByLabel(/filter by status/i);
  if ((await statusSelect.count()) > 0) {
    await statusSelect.selectOption("in_progress");
    await page.waitForTimeout(300);
  }
  if ((await filterRegion.count()) > 0) {
    await filterRegion.screenshot({
      path: path.join(OUT_DIR, "06-filter-queue-state.png"),
      type: "png",
    });
    console.log("wrote 06-filter-queue-state.png");
  } else {
    await shot(page, "06-filter-queue-state.png", { fullPage: false });
  }

  // 7. Needs-attention / unassigned equivalent
  await gotoJobs(page, "view=today&unassigned=1");
  await shot(page, "07-needs-attention-unassigned.png", { fullPage: false });

  // 8. Empty-results state
  await gotoJobs(page, "view=all");
  await page.locator('input[type="search"]').first().fill("zzz-no-match-altair-xyz");
  await page.waitForTimeout(400);
  await shot(page, "08-empty-results.png", { fullPage: false });

  // 9. Loading state
  await context.unroute("**/jobs").catch(() => {});
  await page.route("**/jobs**", async (route) => {
    if (route.request().resourceType() === "document") {
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
    await route.continue();
  });
  const loadingPage = await context.newPage();
  await loadingPage.setViewportSize({ width: 1728, height: 1117 });
  const navPromise = loadingPage.goto(`${BASE}/jobs`, {
    waitUntil: "commit",
    timeout: 90_000,
  });
  await loadingPage.waitForTimeout(900);
  await hideChrome(loadingPage);
  await loadingPage.screenshot({
    path: path.join(OUT_DIR, "09-loading-state.png"),
    type: "png",
    fullPage: false,
  });
  console.log("wrote 09-loading-state.png");
  await navPromise.catch(() => {});
  await loadingPage.close().catch(() => {});
  await page.unroute("**/jobs**").catch(() => {});

  // 10. Bulk-selection state
  await page.setViewportSize({ width: 1728, height: 1117 });
  await gotoJobs(page, "view=all");
  const checkbox = page.getByRole("checkbox", { name: /select job/i }).first();
  if ((await checkbox.count()) > 0) {
    await checkbox.check({ force: true });
    await page.waitForTimeout(400);
  } else {
    const anyCheckbox = page.locator('input[type="checkbox"]').nth(1);
    if ((await anyCheckbox.count()) > 0) {
      await anyCheckbox.check({ force: true });
      await page.waitForTimeout(400);
    }
  }
  await shot(page, "10-bulk-selection.png", { fullPage: false });

  // 11. Desktop dark-canvas contrast check (1280 × 800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoJobs(page, "view=all");
  await shot(page, "11-desktop-dark-canvas-contrast.png", { fullPage: false });

  await browser.close();
  console.log("Done →", path.relative(ROOT, OUT_DIR));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
