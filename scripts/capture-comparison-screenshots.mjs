/**
 * Local developer tool: full-content screenshots for before/after comparison.
 *
 * Not for production, not exposed to end users. Expands every overflow
 * auto/scroll region whose content overflows (Y and/or X), unlocks clipping
 * ancestors, and takes Playwright page.screenshot({ fullPage: true }) so nested
 * scrollports like Dispatch's sidebar + hour axis flatten into document flow.
 * Throwaway browser context — no style restore.
 *
 * After capture, each PNG is proportionally resized to OUTPUT_WIDTH (default
 * 1600px) so every file shares the same width; height scales with aspect ratio.
 * No cropping — wide pages (e.g. Dispatch) shrink into the shared width.
 *
 * Prerequisites:
 *   1. Reachable BASE_URL (local dev, preview, or production)
 *   2. Founder auth at .playwright/founder-auth.json
 *      Create/refresh: BASE_URL=<url> npm run capture:founder-auth
 *
 * Usage:
 *   LABEL=before ROUTES=/,/customers npm run capture:comparison-screenshots
 *   BASE_URL=https://app.example.com LABEL=before ROUTES=/ node scripts/capture-comparison-screenshots.mjs
 *   node scripts/capture-comparison-screenshots.mjs --label after --routes /,/jobs
 *   node scripts/capture-comparison-screenshots.mjs --label after / /customers
 *   OUTPUT_WIDTH=1600 LABEL=before ROUTES=/ npm run capture:comparison-screenshots
 *
 * Output:
 *   public/marketing/screenshots/comparison/<page>-<label>.png
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUTPUT_DIR = path.join(
  ROOT,
  "public",
  "marketing",
  "screenshots",
  "comparison",
);
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";
const FOUNDER_EMAIL = "altairhvac@gmail.com";
const SUPABASE_PROJECT_REF = "acsmgzkbvstrbggsukyx";
const VIEWPORT = { width: 1600, height: 900 };
const OUTPUT_WIDTH = Math.max(
  1,
  Number.parseInt(process.env.OUTPUT_WIDTH?.trim() || "1600", 10) || 1600,
);

const DEFAULT_ROUTES = [
  "/",
  "/customers",
  "/work",
  "/leads",
  "/reports?range=30d",
];

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

/**
 * @param {string} message
 */
function log(message) {
  console.log(message);
}

/**
 * @param {string} message
 */
function fail(message) {
  console.error(message);
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
  ].join(" ");
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {string | null} */
  let label = process.env.LABEL?.trim() || null;
  /** @type {string[]} */
  let routes = [];

  const envRoutes = process.env.ROUTES?.trim();
  if (envRoutes) {
    routes = envRoutes
      .split(",")
      .map((route) => route.trim())
      .filter(Boolean);
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--label" || arg === "-l") {
      label = argv[i + 1]?.trim() || null;
      i += 1;
      continue;
    }
    if (arg.startsWith("--label=")) {
      label = arg.slice("--label=".length).trim() || null;
      continue;
    }
    if (arg === "--routes" || arg === "-r") {
      const value = argv[i + 1]?.trim() || "";
      routes = value
        .split(",")
        .map((route) => route.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
    if (arg.startsWith("--routes=")) {
      routes = arg
        .slice("--routes=".length)
        .split(",")
        .map((route) => route.trim())
        .filter(Boolean);
      continue;
    }
    if (arg.startsWith("-")) {
      fail(`Unknown flag: ${arg}`);
    }
    routes.push(arg.trim());
  }

  if (!label) {
    fail(
      "Missing LABEL. Example: LABEL=before ROUTES=/ npm run capture:comparison-screenshots",
    );
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(label)) {
    fail(
      `Invalid LABEL "${label}". Use letters, numbers, hyphens, or underscores only (e.g. before, after, prod).`,
    );
  }

  if (routes.length === 0) {
    routes = [...DEFAULT_ROUTES];
    log(
      `No ROUTES provided — using defaults: ${DEFAULT_ROUTES.join(", ")}`,
    );
  }

  return {
    label,
    routes: routes.map(normalizeRoute),
  };
}

/**
 * @param {string} route
 */
function normalizeRoute(route) {
  const trimmed = route.trim();
  if (!trimmed) {
    fail("Empty route in ROUTES list.");
  }
  if (/^https?:\/\//i.test(trimmed)) {
    fail(
      `Pass path routes only (e.g. / or /customers), not full URLs. Use BASE_URL for the host. Got: ${trimmed}`,
    );
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * @param {string} route
 */
function routeToSlug(route) {
  const pathOnly = route.split("?")[0] || "/";
  if (pathOnly === "/" || pathOnly === "/dashboard") {
    return "dashboard";
  }

  const slug = pathOnly
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "page";
}

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

/**
 * Proportionally resize a captured PNG to OUTPUT_WIDTH. Height scales to
 * preserve aspect ratio — never crops. Overwrites the file in place.
 *
 * @param {string} filePath
 * @returns {Promise<{
 *   native: { width: number; height: number } | null;
 *   final: { width: number; height: number } | null;
 *   resized: boolean;
 * }>}
 */
async function resizePngToOutputWidth(filePath) {
  const native = readPngDimensions(filePath);
  if (!native) {
    return { native: null, final: null, resized: false };
  }

  if (native.width === OUTPUT_WIDTH) {
    return { native, final: native, resized: false };
  }

  const tempPath = `${filePath}.resize-tmp.png`;
  try {
    // Width only — sharp scales height to preserve aspect ratio (no crop).
    await sharp(filePath)
      .resize({ width: OUTPUT_WIDTH })
      .png()
      .toFile(tempPath);

    fs.renameSync(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }

  const final = readPngDimensions(filePath);
  return { native, final, resized: true };
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
  const fileEnv = loadEnvFile();
  const supabaseUrl = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    fileEnv.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).trim();
  if (!supabaseUrl) {
    return false;
  }

  const serviceRole =
    (process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY || "").trim() ||
    getServiceRoleKey();
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
    return true;
  } finally {
    await browser.close();
  }
}

function assertAuthFile() {
  if (fs.existsSync(AUTH_PATH)) {
    return;
  }

  fail(
    [
      "Missing founder Playwright auth state.",
      "1. Start the app (or point BASE_URL at a reachable host)",
      `2. Save auth: BASE_URL=${BASE_URL} npm run capture:founder-auth`,
      "3. Re-run: LABEL=before ROUTES=/ npm run capture:comparison-screenshots",
    ].join(" "),
  );
}

async function ensureFounderAuth() {
  const session = readStoredSession();
  const domainOk = authDomainMatchesBaseUrl();

  if (isSessionFresh(session) && domainOk) {
    return;
  }

  if (!domainOk && fs.existsSync(AUTH_PATH)) {
    log("Founder auth domain does not match BASE_URL — attempting refresh...");
  } else {
    log("Founder auth missing or expired — attempting refresh...");
  }

  const refreshed = await refreshFounderAuthViaMagicLink();
  if (refreshed && authDomainMatchesBaseUrl()) {
    return;
  }

  assertAuthFile();

  if (!authDomainMatchesBaseUrl()) {
    fail(authDomainMismatchMessage());
  }
}

async function installFeedbackHiding(context) {
  await context.addInitScript((css) => {
    const install = () => {
      if (document.getElementById("comparison-screenshot-feedback-hide")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "comparison-screenshot-feedback-hide";
      style.textContent = css;
      document.head.appendChild(style);
    };

    install();
    document.addEventListener("DOMContentLoaded", install);
  }, FEEDBACK_HIDE_CSS);
}

async function hideFeedbackWidget(page) {
  await page.addStyleTag({ content: FEEDBACK_HIDE_CSS });

  await page.evaluate(() => {
    document
      .querySelectorAll(
        'button[aria-label="Send feedback"], button[aria-label="Dismiss feedback hint"]',
      )
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

async function waitForPageSettled(page) {
  await page
    .waitForFunction(
      () => document.querySelectorAll(".north-star-skeleton").length === 0,
      { timeout: 45_000 },
    )
    .catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * Expand every overflow-y auto/scroll region into document flow, unlock
 * clipping ancestors, and return capture diagnostics. Styles are not restored
 * (throwaway browser context per capture run).
 *
 * @param {import("playwright").Page} page
 * @returns {Promise<{
 *   mode: "expanded" | "window";
 *   scrollerCount: number;
 *   scrollers: Array<{
 *     tagName: string;
 *     className: string;
 *     clientWidth: number;
 *     clientHeight: number;
 *     scrollWidth: number;
 *     scrollHeight: number;
 *   }>;
 *   documentScrollWidth: number;
 *   documentScrollHeight: number;
 *   clientWidth: number;
 *   clientHeight: number;
 *   scrollWidth: number;
 *   scrollHeight: number;
 * }>}
 */
async function expandAllScrollRegionsForFullPage(page) {
  return page.evaluate(() => {
    /**
     * @param {CSSStyleDeclaration} style
     */
    function isScrollOverflow(style, axis) {
      const value = axis === "y" ? style.overflowY : style.overflowX;
      return value === "auto" || value === "scroll";
    }

    /**
     * @param {CSSStyleDeclaration} style
     */
    function clipsOverflow(style) {
      return (
        style.overflow === "hidden" ||
        style.overflow === "clip" ||
        style.overflow === "auto" ||
        style.overflow === "scroll" ||
        style.overflowY === "hidden" ||
        style.overflowY === "clip" ||
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        style.overflowX === "hidden" ||
        style.overflowX === "clip" ||
        style.overflowX === "auto" ||
        style.overflowX === "scroll"
      );
    }

    /** @type {Array<{
     *   el: HTMLElement;
     *   tagName: string;
     *   className: string;
     *   clientWidth: number;
     *   clientHeight: number;
     *   scrollWidth: number;
     *   scrollHeight: number;
     *   expandY: boolean;
     *   expandX: boolean;
     * }>} */
    const scrollers = [];
    /** @type {Set<HTMLElement>} */
    const seen = new Set();

    for (const el of document.querySelectorAll("body *")) {
      if (!(el instanceof HTMLElement) || seen.has(el)) {
        continue;
      }

      const style = window.getComputedStyle(el);
      const expandY =
        isScrollOverflow(style, "y") && el.scrollHeight > el.clientHeight + 1;
      // overflow:auto often scrolls on X only (Dispatch hour axis) while Y fits.
      const expandX =
        isScrollOverflow(style, "x") && el.scrollWidth > el.clientWidth + 1;

      if (!expandY && !expandX) {
        continue;
      }

      seen.add(el);
      const className = typeof el.className === "string" ? el.className : "";
      scrollers.push({
        el,
        tagName: el.tagName.toLowerCase(),
        className: className.slice(0, 120),
        clientWidth: el.clientWidth,
        clientHeight: el.clientHeight,
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
        expandY,
        expandX,
      });
    }

    /** @type {Set<HTMLElement>} */
    const toUnlock = new Set(scrollers.map((entry) => entry.el));

    for (const entry of scrollers) {
      let ancestor = entry.el.parentElement;
      while (ancestor && ancestor instanceof HTMLElement) {
        if (clipsOverflow(window.getComputedStyle(ancestor))) {
          toUnlock.add(ancestor);
        }
        ancestor = ancestor.parentElement;
      }
    }

    const root = document.documentElement;
    const body = document.body;
    if (root instanceof HTMLElement) {
      toUnlock.add(root);
    }
    if (body instanceof HTMLElement) {
      toUnlock.add(body);
    }

    // Unlock clipping ancestors first so expanded scrollports can grow the document.
    for (const el of toUnlock) {
      el.style.overflow = "visible";
      el.style.overflowX = "visible";
      el.style.overflowY = "visible";
      el.style.height = "auto";
      el.style.maxHeight = "none";
      el.style.maxWidth = "none";
    }

    // Expand each scroller to its full scroll size (flex + min-h-0 needs explicit mins).
    for (const entry of scrollers) {
      const { el, expandY, expandX, scrollWidth, scrollHeight } = entry;
      el.style.overflow = "visible";
      el.style.overflowX = "visible";
      el.style.overflowY = "visible";
      if (expandY) {
        el.style.height = "auto";
        el.style.maxHeight = "none";
        el.style.minHeight = `${scrollHeight}px`;
      }
      if (expandX) {
        el.style.width = "auto";
        el.style.maxWidth = "none";
        el.style.minWidth = `${scrollWidth}px`;

        // Widen ancestors so board chrome grows with the hour axis (not just paint overflow).
        let ancestor = el.parentElement;
        while (ancestor && ancestor instanceof HTMLElement && ancestor !== body) {
          ancestor.style.maxWidth = "none";
          ancestor.style.minWidth = `${Math.max(ancestor.clientWidth, scrollWidth)}px`;
          ancestor = ancestor.parentElement;
        }
      }
    }

    // Force layout so document metrics reflect the expanded flow.
    void document.body?.offsetHeight;

    const documentScrollWidth = Math.max(
      root.scrollWidth,
      body?.scrollWidth ?? 0,
    );
    const documentScrollHeight = Math.max(
      root.scrollHeight,
      body?.scrollHeight ?? 0,
    );

    return {
      mode: scrollers.length > 0 ? "expanded" : "window",
      scrollerCount: scrollers.length,
      scrollers: scrollers.map(
        ({
          tagName,
          className,
          clientWidth,
          clientHeight,
          scrollWidth,
          scrollHeight,
          expandX,
          expandY,
        }) => ({
          tagName,
          className,
          clientWidth,
          clientHeight,
          scrollWidth,
          scrollHeight,
          expandX,
          expandY,
        }),
      ),
      documentScrollWidth,
      documentScrollHeight,
      // Summary fields used by the capture table (document after expand).
      clientWidth: window.innerWidth || 1600,
      clientHeight: window.innerHeight || 900,
      scrollWidth: documentScrollWidth,
      scrollHeight: documentScrollHeight,
    };
  });
}

/**
 * @param {import("playwright").Page} page
 * @param {{ route: string; slug: string; label: string; output: string }} capture
 */
async function captureRoute(page, capture) {
  const url = `${BASE_URL}${capture.route}`;
  log(`Capturing ${capture.slug} (${capture.label}) from ${url}`);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitForPageSettled(page);

  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `Auth required for ${capture.route}. ` +
        (authDomainMatchesBaseUrl()
          ? `Refresh with BASE_URL=${BASE_URL} npm run capture:founder-auth`
          : authDomainMismatchMessage()),
    );
  }

  if (currentUrl.includes("/setup")) {
    throw new Error(
      `Founder account is not bootstrapped (${capture.route} redirected to /setup).`,
    );
  }

  const unauthorized = await page
    .getByText("Unauthorized", { exact: false })
    .first()
    .isVisible()
    .catch(() => false);
  if (unauthorized) {
    throw new Error(
      `${capture.route} returned unauthorized access for the founder account.`,
    );
  }

  await hideFeedbackWidget(page);

  const target = await expandAllScrollRegionsForFullPage(page);
  const outputPath = path.join(OUTPUT_DIR, capture.output);

  if (target.scrollerCount > 0) {
    log(
      `  expanded ${target.scrollerCount} scroll region(s) → document ${target.documentScrollWidth}x${target.documentScrollHeight}`,
    );
    for (const scroller of target.scrollers.slice(0, 8)) {
      const axes = [
        scroller.expandY ? "y" : null,
        scroller.expandX ? "x" : null,
      ]
        .filter(Boolean)
        .join("+");
      log(
        `    <${scroller.tagName}> [${axes || "?"}] client=${scroller.clientWidth}x${scroller.clientHeight} scroll=${scroller.scrollWidth}x${scroller.scrollHeight}`,
      );
    }
    if (target.scrollers.length > 8) {
      log(`    … +${target.scrollers.length - 8} more`);
    }
  } else {
    log(
      `  no overflow scrollers — window fullPage (document scrollHeight=${target.scrollHeight})`,
    );
  }

  // Layout settle after expand; context is throwaway so no style restore.
  await page.waitForTimeout(150);
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: true,
    animations: "disabled",
  });

  const nativeDimensions = readPngDimensions(outputPath);
  const tallerThanViewport =
    nativeDimensions != null && nativeDimensions.height > VIEWPORT.height + 2;
  const widerThanViewport =
    nativeDimensions != null && nativeDimensions.width > VIEWPORT.width + 2;
  const documentFitsViewport =
    target.scrollHeight <= VIEWPORT.height + 2 &&
    target.scrollWidth <= VIEWPORT.width + 2;
  const capturedFullScroll =
    documentFitsViewport ||
    (nativeDimensions != null &&
      nativeDimensions.height >=
        Math.min(target.scrollHeight, VIEWPORT.height) &&
      (tallerThanViewport ||
        widerThanViewport ||
        target.scrollHeight <= VIEWPORT.height + 2));

  const resizeResult = await resizePngToOutputWidth(outputPath);
  const dimensions = resizeResult.final ?? nativeDimensions;

  const nativeLabel =
    nativeDimensions != null
      ? `${nativeDimensions.width}x${nativeDimensions.height}`
      : "?x?";
  const finalLabel =
    dimensions != null ? `${dimensions.width}x${dimensions.height}` : "?x?";

  log(
    `  → ${path.relative(ROOT, outputPath)} native ${nativeLabel}` +
      (resizeResult.resized
        ? ` → resized ${finalLabel}`
        : ` (already ${OUTPUT_WIDTH}w)`) +
      (capturedFullScroll
        ? " [full content]"
        : " [warning: height may still be viewport-clipped]"),
  );

  return {
    ok: true,
    outputPath,
    dimensions,
    nativeDimensions,
    resized: resizeResult.resized,
    target,
    capturedFullScroll,
  };
}

async function main() {
  if (!getBaseHostname()) {
    fail(`Invalid BASE_URL: ${BASE_URL}`);
  }

  const { label, routes } = parseArgs(process.argv.slice(2));

  log(`Comparison capture against ${BASE_URL}`);
  log(`Label: ${label}`);
  log(`Routes: ${routes.join(", ")}`);

  await ensureFounderAuth();
  assertAuthFile();

  if (!authDomainMatchesBaseUrl()) {
    fail(authDomainMismatchMessage());
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

  /** @type {Array<{
   *   slug: string;
   *   route: string;
   *   output: string;
   *   ok: boolean;
   *   dimensions: { width: number; height: number } | null;
   *   nativeDimensions: { width: number; height: number } | null;
   *   resized: boolean;
   *   mode: string;
   *   scrollerCount: number;
   *   scrollHeight: number;
   *   clientHeight: number;
   *   capturedFullScroll: boolean;
   *   notes: string;
   * }>} */
  const results = [];

  log(`Output width: ${OUTPUT_WIDTH}px (proportional resize, no crop)`);

  try {
    for (const route of routes) {
      const slug = routeToSlug(route);
      const output = `${slug}-${label}.png`;
      try {
        const outcome = await captureRoute(page, {
          route,
          slug,
          label,
          output,
        });
        results.push({
          slug,
          route,
          output,
          ok: true,
          dimensions: outcome.dimensions,
          nativeDimensions: outcome.nativeDimensions,
          resized: outcome.resized,
          mode: outcome.target.mode,
          scrollerCount: outcome.target.scrollerCount,
          scrollHeight: outcome.target.scrollHeight,
          clientHeight: outcome.target.clientHeight,
          capturedFullScroll: outcome.capturedFullScroll,
          notes: outcome.capturedFullScroll
            ? "full content"
            : "possible clip",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ ${slug}: ${message}`);
        results.push({
          slug,
          route,
          output,
          ok: false,
          dimensions: null,
          nativeDimensions: null,
          resized: false,
          mode: "—",
          scrollerCount: 0,
          scrollHeight: 0,
          clientHeight: 0,
          capturedFullScroll: false,
          notes: message,
        });
      }
    }
  } finally {
    await browser.close();
  }

  log("");
  log("Capture summary:");
  log(
    "Page | Route | Output | Mode | Scrollers | Doc size | Native | Final PNG | Status",
  );
  log("-".repeat(140));
  for (const result of results) {
    const native = result.nativeDimensions
      ? `${result.nativeDimensions.width}x${result.nativeDimensions.height}`
      : "—";
    const png = result.dimensions
      ? `${result.dimensions.width}x${result.dimensions.height}`
      : "—";
    const docSize = result.ok ? `doc ${result.scrollHeight}h` : "—";
    const scrollers = result.ok ? String(result.scrollerCount) : "—";
    const resizeNote = result.resized ? "resized" : result.ok ? "same w" : "";
    log(
      `${result.slug} | ${result.route} | ${result.output} | ${result.mode} | ${scrollers} | ${docSize} | ${native} | ${png}${resizeNote ? ` (${resizeNote})` : ""} | ${result.ok ? result.notes : "FAIL"}`,
    );
  }

  const successCount = results.filter((result) => result.ok).length;
  log("");
  log(
    `Comparison screenshots captured: ${successCount}/${results.length} → ${path.relative(ROOT, OUTPUT_DIR)}`,
  );

  if (successCount === 0) {
    fail(
      "No screenshots were captured. Check auth, BASE_URL reachability, and routes.",
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
