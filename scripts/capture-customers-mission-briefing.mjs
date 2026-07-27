/**
 * Capture Customers Mission Briefing screenshots (Phase 1 owner experience).
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
const OUT_DIR = path.join(ROOT, "docs", "product", "customers-mission-briefing");
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

async function gotoCustomers(page) {
  await page.goto(`${BASE}/customers`, {
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

async function main() {
  await ensureAuth();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // 1. Mobile Customers
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoCustomers(page);
  await page.screenshot({
    path: path.join(OUT_DIR, "01-mobile-customers.png"),
    type: "png",
    fullPage: true,
  });
  console.log("wrote 01-mobile-customers.png");

  // 2. Desktop Customers
  await page.setViewportSize({ width: 1440, height: 1000 });
  await gotoCustomers(page);
  await page.screenshot({
    path: path.join(OUT_DIR, "02-desktop-customers.png"),
    type: "png",
    fullPage: true,
  });
  console.log("wrote 02-desktop-customers.png");

  // 3. Search
  const search = page.getByRole("searchbox", { name: /search customers/i });
  if ((await search.count()) === 0) {
    // Fallback: type="search" input
    await page.locator('input[type="search"]').first().fill("a");
  } else {
    await search.fill("a");
  }
  await page.waitForTimeout(400);
  const searchRegion = page.locator(".customer-mission-filter-region").first();
  await searchRegion.screenshot({
    path: path.join(OUT_DIR, "03-search.png"),
    type: "png",
  });
  console.log("wrote 03-search.png");

  // 4. Filters (queues)
  await page.locator('input[type="search"]').first().fill("");
  await page.waitForTimeout(300);
  const needsInfo = page.getByRole("tab", { name: /needs info/i });
  if ((await needsInfo.count()) > 0) {
    await needsInfo.click();
    await page.waitForTimeout(300);
  }
  await searchRegion.screenshot({
    path: path.join(OUT_DIR, "04-filters.png"),
    type: "png",
  });
  console.log("wrote 04-filters.png");

  // 5. Customer list (prefer visible desktop ledger; fall back to page clip)
  await page.getByRole("tab", { name: /active/i }).first().click();
  await page.waitForTimeout(400);
  const desktopList = page.locator("div.customer-mission-list").first();
  const mobileList = page.locator("ul.customer-mission-list").first();
  if ((await desktopList.count()) > 0 && (await desktopList.isVisible())) {
    await desktopList.screenshot({
      path: path.join(OUT_DIR, "05-customer-list.png"),
      type: "png",
    });
  } else if ((await mobileList.count()) > 0 && (await mobileList.isVisible())) {
    await mobileList.screenshot({
      path: path.join(OUT_DIR, "05-customer-list.png"),
      type: "png",
    });
  } else {
    await page.screenshot({
      path: path.join(OUT_DIR, "05-customer-list.png"),
      type: "png",
      fullPage: false,
    });
  }
  console.log("wrote 05-customer-list.png");

  // 6. Empty / no-results state
  await page.locator('input[type="search"]').first().fill("zzz-no-match-altair-xyz");
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(OUT_DIR, "06-empty-state.png"),
    type: "png",
    fullPage: false,
  });
  console.log("wrote 06-empty-state.png");

  // 7. Loading state — delay the document response so loading.tsx is visible
  await context.unroute("**/customers").catch(() => {});
  await page.route("**/customers", async (route) => {
    if (route.request().resourceType() === "document") {
      await new Promise((resolve) => setTimeout(resolve, 3500));
    }
    await route.continue();
  });

  const loadingPage = await context.newPage();
  await loadingPage.setViewportSize({ width: 1440, height: 1000 });
  const navPromise = loadingPage.goto(`${BASE}/customers`, {
    waitUntil: "commit",
    timeout: 90_000,
  });
  await loadingPage.waitForTimeout(900);
  await hideChrome(loadingPage);
  await loadingPage.screenshot({
    path: path.join(OUT_DIR, "07-loading-state.png"),
    type: "png",
    fullPage: false,
  });
  console.log("wrote 07-loading-state.png");
  await navPromise.catch(() => {});
  await loadingPage.close().catch(() => {});
  await page.unroute("**/customers").catch(() => {});

  await browser.close();
  console.log("Done →", path.relative(ROOT, OUT_DIR));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
