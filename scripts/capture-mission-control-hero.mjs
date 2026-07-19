/**
 * Capture a retina Mission Control / North Star dashboard for homepage hero.
 * Requires: running app. Refreshes founder auth via magic link when needed.
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT = path.join(
  ROOT,
  "public",
  "marketing",
  "screenshots",
  "mission-control-hero.png",
);
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

function getServiceRoleKey() {
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
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return false;
  const serviceRole = getServiceRoleKey();
  if (!serviceRole) return false;

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
    console.error("Could not refresh founder auth.");
    process.exit(1);
  }
}

await ensureAuth();

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  storageState: AUTH_PATH,
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForTimeout(3500);

const landed = page.url();
const bodyText = await page.locator("body").innerText();
console.log("landed:", landed);
console.log("body:", bodyText.slice(0, 220).replace(/\n/g, " | "));

if (
  landed.includes("/login") ||
  /Request Closed Beta Access/i.test(bodyText) ||
  /THE OPERATING SYSTEM/i.test(bodyText)
) {
  console.error("Still on marketing/login — auth failed.");
  await browser.close();
  process.exit(1);
}

// Hide transient marketing/demo chrome so the hero shows application pixels.
await page.addStyleTag({
  content: `
    [aria-label="Closed beta"],
    [aria-label="Send feedback"],
    div.no-print.fixed.right-4.z-40 {
      display: none !important;
    }
  `,
});
await page.evaluate(() => {
  document.querySelectorAll("body *").forEach((el) => {
    const text = (el.textContent || "").trim();
    if (
      el.children.length === 0 &&
      (text === "DEMO MODE" || text.includes("Demo Mode"))
    ) {
      const host = el.closest("[class*='banner'], [class*='Banner'], [role='status'], [role='alert'], div");
      if (host && host !== document.body) {
        host.style.display = "none";
      }
    }
  });
});
await page.waitForTimeout(400);

await page.screenshot({ path: OUT, type: "png", fullPage: false });
const buf = fs.readFileSync(OUT);
console.log(
  `saved ${OUT} ${Math.round(buf.length / 1024)}KB ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`,
);
await browser.close();
