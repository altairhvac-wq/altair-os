/**
 * Local developer tool: capture founder-safe marketing screenshots from a running app.
 *
 * Not for production, not exposed to end users, and not for customer companies.
 *
 * Prerequisites:
 *   1. npm run dev (or a reachable BASE_URL such as a Vercel preview)
 *   2. Founder auth storage state at .playwright/founder-auth.json
 *      Create it with: node scripts/save-founder-playwright-auth.mjs
 *      For non-localhost targets: BASE_URL=<url> npm run capture:founder-auth
 *      Or refresh automatically when Supabase CLI is linked (local dev only).
 *
 * Usage:
 *   node scripts/capture-founder-marketing-screenshots.mjs
 *   BASE_URL=http://localhost:3000 node scripts/capture-founder-marketing-screenshots.mjs
 *   FOUNDER_CAPTURE_JSON=1 …  (machine-readable progress for the local Marketing Hub button)
 *
 * Output:
 *   public/marketing/screenshots/social/*-full-page.png (1600×900 viewport)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUTPUT_DIR = path.join(ROOT, "public", "marketing", "screenshots", "social");
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";
const JSON_MODE = process.env.FOUNDER_CAPTURE_JSON === "1";
const FOUNDER_EMAIL = "altairhvac@gmail.com";
const SUPABASE_PROJECT_REF = "acsmgzkbvstrbggsukyx";

/**
 * @param {{ type: string; [key: string]: unknown }} event
 */
function emitEvent(event) {
  if (!JSON_MODE) {
    return;
  }

  process.stdout.write(`${JSON.stringify(event)}\n`);
}

/**
 * @param {string} message
 */
function log(message) {
  if (JSON_MODE) {
    emitEvent({ type: "log", message });
    return;
  }

  console.log(message);
}

/**
 * @param {string} message
 */
function logError(message) {
  if (JSON_MODE) {
    emitEvent({ type: "log", message });
    return;
  }

  console.error(message);
}

/**
 * @param {string} code
 * @param {string} message
 */
function failWithCode(code, message) {
  emitEvent({ type: "error", code, message });
  if (!JSON_MODE) {
    console.error(message);
  }
  process.exit(1);
}

function getBaseHostname() {
  try {
    return new URL(BASE_URL).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * @param {string} cookieDomain
 * @param {string} hostname
 */
function cookieDomainMatchesHost(cookieDomain, hostname) {
  const domain = cookieDomain.replace(/^\./, "").toLowerCase();
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function readAuthState() {
  if (!fs.existsSync(AUTH_PATH)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
  } catch {
    return null;
  }
}

function authDomainMatchesBaseUrl() {
  const hostname = getBaseHostname();
  if (!hostname) {
    return false;
  }

  const auth = readAuthState();
  const cookies = Array.isArray(auth?.cookies) ? auth.cookies : [];
  if (cookies.length === 0) {
    return false;
  }

  return cookies.some(
    (cookie) =>
      typeof cookie?.domain === "string" &&
      cookieDomainMatchesHost(cookie.domain, hostname),
  );
}

function describeAuthDomains() {
  const auth = readAuthState();
  const cookies = Array.isArray(auth?.cookies) ? auth.cookies : [];
  const domains = [
    ...new Set(
      cookies
        .map((cookie) =>
          typeof cookie?.domain === "string"
            ? cookie.domain.replace(/^\./, "")
            : null,
        )
        .filter(Boolean),
    ),
  ];

  return domains.length > 0 ? domains.join(", ") : "(none)";
}

function authDomainMismatchMessage() {
  const hostname = getBaseHostname() ?? BASE_URL;
  return [
    `Founder Playwright auth is for ${describeAuthDomains()}, but BASE_URL targets ${hostname}.`,
    "Cookies are domain-scoped, so localhost auth will not work on a preview/prod host.",
    `Refresh auth for that host first: BASE_URL=${BASE_URL} npm run capture:founder-auth`,
    "Then re-run capture (or use the Marketing Hub button again).",
    "Magic-link auto-refresh can also work when Supabase CLI is linked and the redirect URL is allowlisted.",
  ].join(" ");
}

const VIEWPORT = { width: 1600, height: 900 };

const FEEDBACK_HIDE_CSS = `
  div.no-print.fixed.right-4.z-40:has(button[aria-label="Send feedback"]),
  button[aria-label="Send feedback"].rounded-full,
  div[role="note"]:has(button[aria-label="Dismiss feedback hint"]),
  form#${"beta-bug-report-form"},
  [id="${"beta-bug-report-sheet-title"}"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

/** @type {Array<{ id: string; label: string; route: string; output: string; anchor: string; ready?: string }>} */
const CAPTURES = [
  {
    id: "reports-workspace",
    label: "Reports workspace",
    route: "/reports?range=30d",
    output: "reports-full-page.png",
    anchor: ".north-star-reports-page-header",
    ready: ".reports-north-star-brief",
  },
  {
    id: "leads-workspace",
    label: "Leads workspace",
    route: "/leads",
    output: "leads-full-page.png",
    anchor: "h1",
    ready:
      "button.north-star-leads-primary-action, .leads-north-star-filter-bar, .north-star-leads-primary-action",
  },
  {
    id: "marketing-workspace",
    label: "Marketing Hub workspace",
    route: "/marketing",
    output: "marketing-full-page.png",
    anchor: ".north-star-page-header h1",
    ready: "button.north-star-marketing-primary-action, .north-star-marketing-primary-action",
  },
  {
    id: "customers-workspace",
    label: "Customers workspace",
    route: "/customers",
    output: "customers-full-page.png",
    anchor: ".north-star-page-header h1",
    ready:
      "button.north-star-customers-primary-action, .customer-north-star-filter-bar, .customer-north-star-ledger",
  },
  {
    id: "jobs-workspace",
    label: "Jobs workspace",
    route: "/jobs",
    output: "jobs-full-page.png",
    anchor: ".north-star-page-header h1",
    ready:
      "button.north-star-jobs-primary-action, .job-north-star-filter-bar, .job-north-star-ledger",
  },
  {
    id: "estimates-workspace",
    label: "Estimates workspace",
    route: "/estimates",
    output: "estimates-full-page.png",
    anchor: ".north-star-page-header h1",
    ready:
      "button.north-star-estimates-primary-action, .estimate-north-star-filter-bar, .estimate-north-star-ledger",
  },
  {
    id: "invoices-workspace",
    label: "Invoices workspace",
    route: "/invoices",
    output: "invoices-full-page.png",
    anchor: ".north-star-page-header h1",
    ready:
      "button.north-star-invoices-primary-action, .invoice-north-star-ledger, table",
  },
  {
    id: "dispatch-workspace",
    label: "Dispatch workspace",
    route: "/dispatch",
    output: "dispatch-full-page.png",
    anchor: ".north-star-dispatch-page-header",
    ready: ".dispatch-north-star-filter-bar",
  },
  {
    id: "expenses-workspace",
    label: "Expenses workspace",
    route: "/expenses",
    output: "expenses-full-page.png",
    anchor: ".north-star-expenses-page-header, .north-star-page-header h1",
    ready:
      "button.north-star-expenses-primary-action, .expense-north-star-filter-bar, .expense-north-star-ledger",
  },
  {
    id: "pricebook-workspace",
    label: "Price Book workspace",
    route: "/price-book",
    output: "pricebook-full-page.png",
    anchor: ".north-star-page-header h1",
    ready: "table, .north-star-page-header",
  },
  {
    id: "network-workspace",
    label: "Community workspace",
    route: "/network",
    output: "network-full-page.png",
    anchor: ".north-star-network-page-header",
    ready: "button.north-star-network-primary-action, .north-star-network-primary-action",
  },
];

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

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") {
    return null;
  }

  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function readStoredSession() {
  if (!fs.existsSync(AUTH_PATH)) {
    return null;
  }

  try {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const chunks = auth.cookies
      .filter((cookie) => cookie.name.includes("auth-token"))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (chunks.length === 0) {
      return null;
    }

    let raw = chunks.map((chunk) => chunk.value).join("");
    if (raw.startsWith("base64-")) {
      raw = raw.slice(7);
    }

    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isSessionFresh(session) {
  if (!session?.expires_at) {
    return false;
  }

  return session.expires_at > Math.floor(Date.now() / 1000) + 120;
}

function getServiceRoleKey() {
  try {
    const keysJson = execSync(
      `npx supabase projects api-keys --project-ref ${SUPABASE_PROJECT_REF} -o json`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const keys = JSON.parse(keysJson);
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
  if (!supabaseUrl) {
    return false;
  }

  const serviceRole = getServiceRoleKey();
  if (!serviceRole) {
    return false;
  }

  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: FOUNDER_EMAIL,
    options: { redirectTo: `${BASE_URL}/auth/callback` },
  });

  if (error || !data?.properties?.hashed_token) {
    return false;
  }

  const callbackUrl = `${BASE_URL}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(callbackUrl, { waitUntil: "networkidle", timeout: 60_000 });
    await context.storageState({ path: AUTH_PATH });
    log("Refreshed founder auth via Supabase magic link.");
    emitEvent({ type: "status", message: "Refreshed founder auth via magic link." });
    return true;
  } finally {
    await browser.close();
  }
}

async function ensureFounderAuth() {
  const session = readStoredSession();
  const domainOk = authDomainMatchesBaseUrl();

  if (isSessionFresh(session) && domainOk) {
    emitEvent({ type: "status", message: "Founder auth is ready." });
    return;
  }

  if (!domainOk && fs.existsSync(AUTH_PATH)) {
    log("Founder auth domain does not match BASE_URL — attempting refresh...");
    emitEvent({
      type: "status",
      message: "Auth domain mismatch — attempting magic-link refresh…",
    });
  } else {
    log("Founder auth missing or expired — attempting refresh...");
    emitEvent({
      type: "status",
      message: "Founder auth missing or expired — attempting refresh…",
    });
  }

  const refreshed = await refreshFounderAuthViaMagicLink();
  if (refreshed && authDomainMatchesBaseUrl()) {
    return;
  }

  assertAuthFile();

  if (!authDomainMatchesBaseUrl()) {
    failWithCode("AUTH_DOMAIN_MISMATCH", authDomainMismatchMessage());
  }
}

async function installFeedbackHiding(context) {
  await context.addInitScript((css) => {
    const install = () => {
      if (document.getElementById("founder-screenshot-feedback-hide")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "founder-screenshot-feedback-hide";
      style.textContent = css;
      document.head.appendChild(style);
    };

    install();
    document.addEventListener("DOMContentLoaded", install);
  }, FEEDBACK_HIDE_CSS);
}

/** Hide the floating beta feedback pill + hint popover without masking page content. */
async function hideFeedbackWidget(page) {
  await page.addStyleTag({
    content: FEEDBACK_HIDE_CSS,
  });

  await page.evaluate(() => {
    document
      .querySelectorAll('button[aria-label="Send feedback"], button[aria-label="Dismiss feedback hint"]')
      .forEach((element) => {
        const floatingHost = element.closest("div.no-print.fixed.right-4.z-40");
        if (floatingHost) {
          floatingHost.remove();
          return;
        }

        const hint = element.closest('[role="note"]');
        if (hint) {
          hint.remove();
        }
      });
  });
}

async function waitForLoadingSkeletonsGone(page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".north-star-skeleton").length === 0,
    { timeout: 45_000 },
  );
}

async function waitForRouteReady(page, capture) {
  await page.waitForSelector(capture.anchor, {
    state: "visible",
    timeout: 45_000,
  });

  if (capture.ready) {
    await page.waitForSelector(capture.ready, {
      state: "attached",
      timeout: 45_000,
    });
  }

  await waitForLoadingSkeletonsGone(page);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

/**
 * @returns {Promise<{ ok: true; outputPath: string; dimensions: { width: number; height: number } | null } | { ok: false; error: string }>}
 */
async function captureFullPageScreenshot(page, capture) {
  const url = `${BASE_URL}${capture.route}`;
  log(`Capturing ${capture.id} from ${url}`);
  emitEvent({
    type: "page",
    id: capture.id,
    label: capture.label,
    route: capture.route,
    output: capture.output,
    status: "started",
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForRouteReady(page, capture);

  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `Auth required for ${capture.route}. ` +
        (authDomainMatchesBaseUrl()
          ? `Create ${path.relative(ROOT, AUTH_PATH)} with BASE_URL=${BASE_URL} npm run capture:founder-auth`
          : authDomainMismatchMessage()),
    );
  }

  if (currentUrl.includes("/setup")) {
    throw new Error(
      `Founder account is not bootstrapped (${capture.route} redirected to /setup). Use a founder/internal Altair account with demo data.`,
    );
  }

  const unauthorized = await page
    .getByText("Unauthorized", { exact: false })
    .first()
    .isVisible()
    .catch(() => false);
  if (unauthorized) {
    throw new Error(`${capture.route} returned unauthorized access for the founder account.`);
  }

  await hideFeedbackWidget(page);

  const outputPath = path.join(OUTPUT_DIR, capture.output);
  await page.screenshot({
    path: outputPath,
    type: "png",
  });

  const dimensions = readPngDimensions(outputPath);
  log(
    `  → ${path.relative(ROOT, outputPath)} (${dimensions?.width ?? "?"}x${dimensions?.height ?? "?"})`,
  );

  return { ok: true, outputPath, dimensions };
}

function assertAuthFile() {
  if (fs.existsSync(AUTH_PATH)) {
    return;
  }

  failWithCode(
    "AUTH_MISSING",
    [
      "Missing founder Playwright auth state.",
      "1. Start the app: npm run dev",
      `2. Save auth: BASE_URL=${BASE_URL} npm run capture:founder-auth`,
      "3. Re-run: npm run capture:founder-screenshots",
    ].join(" "),
  );
}

function printSummary(results) {
  if (JSON_MODE) {
    return;
  }

  console.log("");
  console.log("Capture summary:");
  console.log(
    "Page | Route | Output | Dimensions | Status | Notes",
  );
  console.log("-".repeat(100));

  for (const result of results) {
    const dimensions = result.dimensions
      ? `${result.dimensions.width}x${result.dimensions.height}`
      : "—";
    const status = result.ok ? "OK" : "SKIP";
    console.log(
      `${result.label} | ${result.route} | ${result.output} | ${dimensions} | ${status} | ${result.notes}`,
    );
  }
}

async function main() {
  if (!getBaseHostname()) {
    failWithCode("INVALID_BASE_URL", `Invalid BASE_URL: ${BASE_URL}`);
  }

  emitEvent({ type: "status", message: `Starting capture against ${BASE_URL}` });
  await ensureFounderAuth();
  assertAuthFile();

  if (!authDomainMatchesBaseUrl()) {
    failWithCode("AUTH_DOMAIN_MISMATCH", authDomainMismatchMessage());
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    storageState: AUTH_PATH,
  });
  await installFeedbackHiding(context);
  const page = await context.newPage();

  /** @type {Array<{ id: string; label: string; route: string; output: string; ok: boolean; dimensions: { width: number; height: number } | null; notes: string }>} */
  const results = [];

  try {
    for (const capture of CAPTURES) {
      try {
        const outcome = await captureFullPageScreenshot(page, capture);
        const dimensionNote =
          outcome.dimensions?.width === VIEWPORT.width &&
          outcome.dimensions?.height === VIEWPORT.height
            ? "viewport match"
            : "unexpected dimensions";

        const result = {
          id: capture.id,
          label: capture.label,
          route: capture.route,
          output: capture.output,
          ok: true,
          dimensions: outcome.dimensions,
          notes: dimensionNote,
        };
        results.push(result);
        emitEvent({
          type: "page",
          id: capture.id,
          label: capture.label,
          route: capture.route,
          output: capture.output,
          status: "ok",
          notes: dimensionNote,
          dimensions: outcome.dimensions,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logError(`  ✗ ${capture.id}: ${message}`);
        results.push({
          id: capture.id,
          label: capture.label,
          route: capture.route,
          output: capture.output,
          ok: false,
          dimensions: null,
          notes: message,
        });
        emitEvent({
          type: "page",
          id: capture.id,
          label: capture.label,
          route: capture.route,
          output: capture.output,
          status: "failed",
          notes: message,
          dimensions: null,
        });
      }
    }
  } finally {
    await browser.close();
  }

  printSummary(results);

  const successCount = results.filter((result) => result.ok).length;
  emitEvent({
    type: "summary",
    successCount,
    total: results.length,
    results,
  });
  log("");
  log(`Founder marketing screenshots captured: ${successCount}/${results.length} succeeded.`);

  if (successCount === 0) {
    failWithCode(
      "ALL_CAPTURES_FAILED",
      "No screenshots were captured. Check auth, BASE_URL reachability, and page readiness.",
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  failWithCode("CAPTURE_CRASHED", message);
});
