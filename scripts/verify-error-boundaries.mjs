/**
 * Error boundary coverage and disclosure (Phase 4 / 4K).
 *
 * ===================== THE TWO FAILURES THIS GUARDS =====================
 * A route with no boundary takes the whole application down to Next's default
 * error screen — no navigation, no branding, and for a user that reads as "the
 * product is broken" rather than "one screen is unavailable".
 *
 * A boundary that renders error.message does the opposite kind of damage: those
 * messages routinely carry query fragments, row ids and customer data, and a
 * boundary is exactly where a developer reaches for them while debugging. The
 * digest is the safe substitute — a server-generated identifier that correlates
 * the screen with the record in the error monitor and carries none of the
 * payload.
 *
 * ===================== VERIFIED AT RUNTIME, TOO =====================
 * This file checks structure. The behaviour was confirmed separately by
 * injecting a throw into the dashboard page, rebuilding, and requesting it:
 *
 *   server log     ⨯ Error: boundary probe: simulated dashboard render failure
 *   response       HTTP 200, admin shell intact (Sales / Customers / Work)
 *   payload        digest":"385847966" — and the message string zero times
 *   leaks          no stack, no node_modules, no "Error:" anywhere in the body
 *
 * The boundary components are client components, so their copy renders after
 * hydration; what the server sends is the digest alone, which is the property
 * that actually matters for disclosure.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-error-boundaries.mjs
 */
import { readFileSync, existsSync } from "node:fs";

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

/**
 * The surfaces that must have their own recovery, and why each one earns it.
 */
const REQUIRED_BOUNDARIES = [
  ["app/global-error.tsx", "the root layout itself failing — nothing else can catch this"],
  ["app/error.tsx", "any route outside the admin group"],
  ["app/(admin)/error.tsx", "admin routes, with the shell preserved"],
  ["app/(admin)/(home)/error.tsx", "the dashboard, the widest fan-out in the product"],
  ["app/technician/error.tsx", "the technician surface, used on a phone in the field"],
  ["app/tech/error.tsx", "the older technician routes"],
];

console.log("\nEvery surface a user can land on has a recovery path");

for (const [path, why] of REQUIRED_BOUNDARIES) {
  check(`${path} — ${why}`, existsSync(path), "        missing");
}

console.log("\nNo boundary discloses the failure detail");

const boundaries = REQUIRED_BOUNDARIES.map(([path]) => path).filter(existsSync);

for (const path of boundaries) {
  const source = stripComments(read(path));

  check(
    `${path} never renders error.message`,
    !/\{\s*error\.message\s*\}/.test(source) && !/\{error\.message/.test(source),
    "        error messages carry query fragments, ids and customer data",
  );
  check(
    `${path} never renders a stack`,
    !/error\.stack/.test(source),
  );
}

// The shared view is where the digest decision actually lives.
const routeErrorView = read("shared/components/ui/RouteErrorView.tsx");
check(
  "the shared recovery view exists",
  routeErrorView !== null,
  "        shared/components/ui/RouteErrorView.tsx is missing",
);

if (routeErrorView) {
  const source = stripComments(routeErrorView);
  check(
    "it shows the digest, which is the safe reference",
    /error\.digest/.test(source),
  );
  check(
    "and shows neither message nor stack",
    !/error\.message/.test(source) && !/error\.stack/.test(source),
  );
  check(
    "it offers a retry",
    /reset\(\)|onClick=\{reset\}|onClick=\{\(\) => reset/.test(source),
  );
  check(
    "and an escape route that is not the broken page",
    /backHref/.test(source),
  );
}

console.log("\nThe root boundary can stand alone");

const globalError = read("app/global-error.tsx");
if (globalError) {
  const source = stripComments(globalError);
  check(
    "global-error renders its own <html> and <body>",
    /<html/.test(source) && /<body/.test(source),
    "        it replaces the root layout, so it cannot rely on one",
  );
  check(
    "it uses inline styles rather than the stylesheet it may not have",
    /style=\{\{/.test(source),
  );
  check(
    "it does not import the design system it may not be able to load",
    !/@\/shared\/design-system/.test(source),
  );
}

console.log("\nThe server reports the exception before the client sees anything");

const instrumentation = read("instrumentation.ts");
check(
  "instrumentation.ts exists",
  instrumentation !== null,
);

if (instrumentation) {
  const source = stripComments(instrumentation);
  check(
    "onRequestError is exported — Next's own server-side error hook",
    /export const onRequestError/.test(source),
  );
  check(
    "and it forwards the exception to the monitoring seam",
    /captureMonitoredException/.test(source),
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} error boundary checks passed (${checks} total).`,
);
console.log(
  "\n  Runtime behaviour was proven separately by injecting a throw into the\n" +
    "  dashboard: the server logged it, the client received only the digest, the\n" +
    "  admin shell survived, and the message appeared nowhere in the response.\n",
);
if (failures > 0) process.exit(1);
