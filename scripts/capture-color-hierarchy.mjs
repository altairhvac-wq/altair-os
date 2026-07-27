/**
 * Capture Color Hierarchy System (Phase 2) validation screenshots.
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
const OUT_DIR = path.join(ROOT, "docs", "product", "color-hierarchy");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const FOUNDER_EMAIL = "altairhvac@gmail.com";
const SUPABASE_PROJECT_REF = "acsmgzkbvstrbggsukyx";

const SHOTS = [
  { name: "01-dashboard-mobile.png", width: 390, height: 844, path: "/", fullPage: true },
  { name: "02-dashboard-desktop.png", width: 1440, height: 1000, path: "/", fullPage: true },
];

const SECTION_SHOTS = [
  { name: "03-needs-attention.png", title: "Needs Attention" },
  { name: "04-todays-brief.png", title: "Today's Brief" },
  { name: "05-business-health.png", title: "Business Health" },
  { name: "06-recent-activity.png", title: "Recent Activity" },
];

const PAGE_SHOTS = [
  { name: "07-customers.png", width: 1440, height: 1000, path: "/customers" },
  { name: "08-reports.png", width: 1440, height: 1000, path: "/reports" },
];

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

async function main() {
  await ensureAuth();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const shot of SHOTS) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(`${BASE}${shot.path}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForTimeout(1200);
    await hideChrome(page);

    if (page.url().includes("/login")) {
      throw new Error(`Auth failed — landed on ${page.url()}`);
    }

    const out = path.join(OUT_DIR, shot.name);
    await page.screenshot({ path: out, type: "png", fullPage: shot.fullPage });
    console.log("wrote", path.relative(ROOT, out));
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1200);
  await hideChrome(page);

  for (const section of SECTION_SHOTS) {
    const locator = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: section.title, exact: true }),
      })
      .first();

    if ((await locator.count()) === 0) {
      console.warn("missing section:", section.title);
      continue;
    }

    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const out = path.join(OUT_DIR, section.name);
    await locator.screenshot({ path: out, type: "png" });
    console.log("wrote", path.relative(ROOT, out));
  }

  for (const shot of PAGE_SHOTS) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await page.goto(`${BASE}${shot.path}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForTimeout(1200);
    await hideChrome(page);

    if (page.url().includes("/login")) {
      throw new Error(`Auth failed — landed on ${page.url()}`);
    }

    const out = path.join(OUT_DIR, shot.name);
    await page.screenshot({ path: out, type: "png", fullPage: true });
    console.log("wrote", path.relative(ROOT, out));
  }

  await browser.close();
  console.log("Done →", path.relative(ROOT, OUT_DIR));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
