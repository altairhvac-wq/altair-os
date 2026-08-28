/**
 * Every authenticated route still renders.
 *
 * ===================== WHY THIS EXISTS =====================
 * The verifier suite proves individual figures and predicates. It does not
 * prove that a page RENDERS. A change to a shared loader, a query, a type or a
 * migration can take a route down while every unit-level check stays green, and
 * the only thing that catches it today is somebody opening that page.
 *
 * docs/reference/internal-alpha-smoke-test.md is the manual version of this. It
 * is thorough and it is manual, which means it happens before a release and
 * never between them.
 *
 * ===================== WHAT COUNTS AS RENDERED =====================
 * A 200 is not enough. Next.js serves an error boundary with a 200, so a page
 * that threw looks identical to one that worked at the status-code level. Each
 * route is therefore checked for:
 *
 *   - the expected status
 *   - no error-boundary marker in the HTML
 *   - no unauthorized marker
 *   - a non-trivial body
 *
 * ===================== SAFETY =====================
 * GET only. It refuses a non-local base URL without --allow-remote, for the
 * same reason the benchmark does: pointing a loop at production to check
 * whether production is up is a way to find out by taking it down.
 *
 * Run:
 *   npm run build && npm run start                 # in another terminal
 *   node scripts/loadtest-auth-cookie.mjs --confirm <ref> --email ... --password ...
 *   node scripts/smoke-authenticated-routes.mjs --cookie-file .tmp/loadtest-cookie.txt
 */

import { readFileSync, existsSync } from "node:fs";

/**
 * Routes a signed-in owner should be able to open.
 *
 * Parameterised routes are excluded: they need a real id, which makes them a
 * data-dependent test rather than a smoke test. Platform and design-lab routes
 * are included because they are reachable and a crash in one is still a crash.
 */
const ROUTES = [
  "/",
  "/customers",
  "/customers/import",
  "/sales",
  "/sales?tab=invoices",
  "/sales?tab=estimates",
  "/sales?tab=payments",
  "/sales?tab=estimate-pipeline",
  "/work",
  "/jobs",
  "/schedule",
  "/dispatch",
  "/expenses",
  "/leads",
  "/reports",
  "/reports?range=7d",
  "/reports?range=ytd",
  "/reports/tax-summary",
  "/estimates",
  "/invoices",
  "/payments",
  "/price-book",
  "/payroll",
  "/network",
  "/community",
  "/marketing",
  "/marketing/hq",
  "/time",
  "/technicians",
  "/team",
  "/settings",
  "/settings/company",
  "/settings/team",
  "/settings/users",
  "/settings/billing",
  "/settings/documents",
  "/settings/integrations",
  "/settings/notifications",
  "/settings/payments",
  "/settings/preferences",
  "/settings/subscription",
  "/settings/system-check",
  "/alpha-tracker",
  "/platform",
  "/platform/bugs",
];

/**
 * Markers that mean the page did not really render.
 *
 * Next.js serves error boundaries with a 200, so the status alone is not
 * evidence. These strings come from the shipped boundaries.
 */
const FAILURE_MARKERS = [
  "Something went wrong",
  "Application error: a client-side exception",
  "This page could not be loaded",
  "You do not have permission",
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else args[key] = true;
  }
  return args;
}

function fail(message) {
  console.error(`\nREFUSED: ${message}\n`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = (
  typeof args["base-url"] === "string" ? args["base-url"] : "http://localhost:3000"
).replace(/\/$/, "");

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl);
if (!isLocal && args["allow-remote"] !== true) {
  fail(
    `${baseUrl} is not local. Pass --allow-remote if that is deliberate.\n\n` +
      "Pointing a route sweep at production to check whether production is up " +
      "is a way to find out by taking it down.",
  );
}

const cookieFile =
  typeof args["cookie-file"] === "string" ? args["cookie-file"] : null;
if (!cookieFile || !existsSync(cookieFile)) {
  fail(
    "--cookie-file <path> is required.\n\n" +
      "Mint one with scripts/loadtest-auth-cookie.mjs. The value is never " +
      "printed by either script.",
  );
}
const cookie = readFileSync(cookieFile, "utf8").trim();

async function main() {
  console.log(`\nBase URL: ${baseUrl}`);
  console.log(`Routes:   ${ROUTES.length}\n`);

  const failures = [];
  const slow = [];
  let checked = 0;

  for (const route of ROUTES) {
    const started = Date.now();
    let status = 0;
    let body = "";

    try {
      const response = await fetch(`${baseUrl}${route}`, {
        headers: { cookie },
        redirect: "manual",
      });
      status = response.status;
      body = await response.text();
    } catch (error) {
      failures.push({ route, reason: `request failed: ${error.message}` });
      continue;
    }

    const elapsed = Date.now() - started;
    checked += 1;

    if (status !== 200) {
      const location = "";
      failures.push({
        route,
        reason: `status ${status}${location}`,
      });
      continue;
    }

    const marker = FAILURE_MARKERS.find((needle) => body.includes(needle));
    if (marker) {
      failures.push({ route, reason: `error boundary rendered: "${marker}"` });
      continue;
    }

    if (body.length < 2000) {
      failures.push({
        route,
        reason: `body is only ${body.length} bytes — the page did not render`,
      });
      continue;
    }

    if (elapsed > 5000) slow.push({ route, elapsed });

    console.log(
      `  OK    ${route.padEnd(34)} ${String(elapsed).padStart(6)} ms  ${(body.length / 1024).toFixed(0)} KB`,
    );
  }

  if (slow.length > 0) {
    console.log("\n  Slow (over 5s), reported not failed:");
    for (const entry of slow) {
      console.log(`    ${entry.route.padEnd(34)} ${entry.elapsed} ms`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n  ${failures.length} route(s) did not render:\n`);
    for (const entry of failures) {
      console.error(`    ${entry.route.padEnd(34)} ${entry.reason}`);
    }
    console.error("");
    process.exit(1);
  }

  console.log(`\nAll ${checked} authenticated routes rendered.\n`);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
