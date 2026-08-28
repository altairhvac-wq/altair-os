/**
 * Every unauthenticated entry point applies a rate limit.
 *
 * ===================== WHY A STATIC CHECK TOO =====================
 * verify-public-rate-limits-live proves the limiter WORKS. It cannot prove the
 * limiter is CALLED — a new public action, or one that loses its guard in a
 * refactor, passes every behavioural test in the suite while being wide open.
 *
 * The failure mode is not exotic. Login, signup, password reset, password
 * update, public estimate approval and public invoice checkout all shipped with
 * no limit at all, and two of them write: approval records a signature and
 * converts an estimate into a job, checkout creates a Stripe session.
 *
 * So this asserts the wiring, by reading the source:
 *
 *   1. every entry point on the list below calls enforcePublicRateLimit
 *   2. every scope declared in PUBLIC_RATE_LIMITS has a call site — a rule
 *      nothing invokes is a rule that does not exist
 *   3. no call site names a scope that is not declared
 *
 * The list is explicit rather than discovered. "Which server actions can be
 * reached without a session" is not decidable by grep, and a check that
 * silently stopped covering a file would be worse than no check. Adding a
 * public entry point means adding it here, which is the point.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-public-surface-limits.mjs
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

/**
 * The entry points a caller can reach without an established session, plus the
 * one that is authenticated but selects its target by an id an attacker can
 * walk.
 */
const ENTRY_POINTS = [
  {
    file: "app/actions/auth.ts",
    fn: "loginAction",
    scope: "auth.login",
    why: "password guessing and user enumeration",
  },
  {
    file: "app/actions/auth.ts",
    fn: "signupAction",
    scope: "auth.signup",
    why: "account-creation flooding",
  },
  {
    file: "app/actions/auth.ts",
    fn: "requestPasswordResetAction",
    scope: "auth.password_reset_request",
    why: "mail flooding against any address",
  },
  {
    file: "app/actions/auth.ts",
    fn: "updatePasswordAction",
    scope: "auth.password_update",
    why: "recovery-token guessing",
  },
  {
    file: "app/actions/memberships.ts",
    fn: "acceptInviteAction",
    scope: "auth.invite_accept",
    why: "membership id walking",
  },
  {
    file: "app/actions/estimate-public-approval.ts",
    fn: "submitPublicEstimateApprovalAction",
    scope: "public.estimate_approval",
    why: "token guessing against a WRITE that signs and converts an estimate",
  },
  {
    file: "app/actions/public-invoice-checkout.ts",
    fn: "createPublicInvoiceCheckoutSessionAction",
    scope: "public.invoice_checkout",
    why: "token guessing against a WRITE that creates a Stripe session",
  },
  {
    file: "lib/database/queries/estimate-approval-tokens.ts",
    fn: "getPublicEstimateApprovalView",
    scope: "public.token_view",
    why: "approval token enumeration",
  },
  {
    file: "lib/database/queries/invoice-payment-tokens.ts",
    fn: "getPublicInvoicePaymentView",
    scope: "public.token_view",
    why: "payment token enumeration",
  },
];

/** The body of one exported function, to its closing brace at column 0. */
function functionBody(source, name) {
  const start = source.search(
    new RegExp(`export (?:async )?function ${name}\\b`),
  );
  if (start < 0) return null;
  const end = source.indexOf("\n}", start);
  return end < 0 ? source.slice(start) : source.slice(start, end);
}

console.log(
  `\nEvery unauthenticated entry point applies a rate limit (${ENTRY_POINTS.length})`,
);

const missing = [];
const usedScopes = new Set();

for (const entry of ENTRY_POINTS) {
  if (!existsSync(entry.file)) {
    missing.push(`${entry.file} does not exist — the list is stale`);
    continue;
  }
  const source = readFileSync(entry.file, "utf8");
  const body = functionBody(source, entry.fn);

  if (body == null) {
    missing.push(
      `${entry.fn} not found in ${entry.file} — renamed or removed, and the ` +
        "list must be updated rather than the check dropped",
    );
    continue;
  }

  if (!/enforcePublicRateLimit\(/.test(body)) {
    missing.push(
      `${entry.file}: ${entry.fn} does not call enforcePublicRateLimit (${entry.why})`,
    );
    continue;
  }

  const named = body.match(/enforcePublicRateLimit\(\s*"([^"]+)"/);
  if (!named || named[1] !== entry.scope) {
    missing.push(
      `${entry.file}: ${entry.fn} limits on "${named?.[1] ?? "?"}", expected "${entry.scope}"`,
    );
    continue;
  }

  usedScopes.add(entry.scope);
}

check(
  "every listed entry point calls the limiter with its own scope",
  missing.length === 0,
  missing.map((line) => `        ${line}`).join("\n"),
);

// ---------------------------------------------------------------- scopes
const limiterSource = readFileSync("lib/security/public-rate-limit.ts", "utf8");
const declaredBlock = limiterSource.slice(
  limiterSource.indexOf("PUBLIC_RATE_LIMITS"),
);
const declared = [
  ...new Set(
    [...declaredBlock.matchAll(/^\s{2}"([a-z_]+\.[a-z_]+)":/gm)].map(
      (match) => match[1],
    ),
  ),
];

check(
  "the declared scopes were parsed",
  declared.length >= 5,
  `parsed ${declared.length}: ${declared.join(", ")}`,
);

const unused = declared.filter((scope) => !usedScopes.has(scope));
check(
  "every declared scope has a call site",
  unused.length === 0,
  unused
    .map((scope) => `        "${scope}" is declared but nothing enforces it`)
    .join("\n"),
);

const undeclared = [...usedScopes].filter((scope) => !declared.includes(scope));
check(
  "no entry point limits on an undeclared scope",
  undeclared.length === 0,
  undeclared.map((scope) => `        "${scope}"`).join("\n"),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} public surface limit checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
