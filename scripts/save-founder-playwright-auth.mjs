/**
 * Save Playwright storage state for founder marketing screenshot capture.
 *
 * Interactive (recommended):
 *   1. npm run dev
 *   2. node scripts/save-founder-playwright-auth.mjs
 *   3. Log in to your founder/internal Altair account in the opened browser
 *   4. Return to the terminal and press Enter
 *
 * Optional env login (local .env.local only — never commit credentials):
 *   FOUNDER_CAPTURE_EMAIL=you@example.com
 *   FOUNDER_CAPTURE_PASSWORD=your-password
 *
 * Output: .playwright/founder-auth.json (gitignored)
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return {};
  }

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

function waitForEnter(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function waitForAuthenticatedApp(page) {
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login") && !url.pathname.startsWith("/signup"),
    { timeout: 120_000 },
  );
  await page.waitForLoadState("networkidle");
}

async function tryEnvLogin(page, env) {
  const email = process.env.FOUNDER_CAPTURE_EMAIL?.trim() || env.FOUNDER_CAPTURE_EMAIL?.trim();
  const password =
    process.env.FOUNDER_CAPTURE_PASSWORD?.trim() || env.FOUNDER_CAPTURE_PASSWORD?.trim();

  if (!email || !password) {
    return false;
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await waitForAuthenticatedApp(page);
  return true;
}

async function main() {
  fs.mkdirSync(path.dirname(AUTH_PATH), { recursive: true });

  const env = loadEnvFile();
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const loggedInViaEnv = await tryEnvLogin(page, env);

    if (!loggedInViaEnv) {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
      console.log("");
      console.log("Founder auth helper");
      console.log("-------------------");
      console.log(`1. Log in at ${BASE_URL}/login using your founder/internal Altair account.`);
      console.log("2. Confirm you land on an authenticated admin route (not /setup for a blank tenant).");
      console.log("3. Press Enter here to save storage state.");
      console.log("");
      await waitForEnter("Press Enter after login… ");
      await waitForAuthenticatedApp(page);
    }

    await context.storageState({ path: AUTH_PATH });
    console.log(`Saved founder Playwright auth state to ${path.relative(ROOT, AUTH_PATH)}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
