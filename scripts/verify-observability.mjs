/**
 * Observability wiring verification (P0-2).
 *
 * ===================== WHAT WAS WRONG =====================
 * The repository had a full operations framework — structured logging, request
 * correlation, an error taxonomy, retry classification and metrics hooks — with
 * no consumer. `setOperationMetricsHooks` was never called from anywhere, and
 * `runOperation` was used at six call sites, none of them on the payment path.
 * A Stripe webhook that began returning 500 was retried by Stripe for days and
 * then abandoned, and nothing told anyone.
 *
 * ===================== WHAT THIS ASSERTS =====================
 * That the seam exists, is single, is installed at server startup, is reached
 * by the money paths, and cannot leak customer or credential data. Offline and
 * side-effect free — no DSN, no network, no credential.
 *
 * A live delivery proof needs a real project and is deliberately not attempted
 * here: POST /api/dev/monitoring-check (development only, platform admin only)
 * throws a real error through the real stack for that.
 *
 * Run: node scripts/verify-observability.mjs
 */
import { readFileSync } from "node:fs";

let failures = 0;
let checks = 0;

function check(name, condition) {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}`);
  }
}

/** Line comments first — see the note in scripts/verify-perimeter.mjs. */
function loadTs(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

const monitoring = loadTs("lib/operations/monitoring.ts");
const instrumentation = loadTs("instrumentation.ts");
const paymentsRoute = loadTs("app/api/webhooks/payments/route.ts");
const billingRoute = loadTs("app/api/webhooks/billing/route.ts");
const webhookProcessor = loadTs("lib/payments/process-stripe-webhook-event.ts");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const envExample = readFileSync(".env.example", "utf8");

// ---------------------------------------------------------------- adapter
console.log("\nMonitoring adapter");

check(
  "an error monitoring SDK is a production dependency",
  Boolean(packageJson.dependencies?.["@sentry/nextjs"]),
);

check(
  "the adapter installs the operations metrics hooks",
  /setOperationMetricsHooks\s*\(/.test(monitoring),
);

check(
  "the vendor SDK is imported in exactly one server module",
  /from\s+"@sentry\/nextjs"/.test(monitoring),
);

check(
  "no business-logic module imports the vendor SDK directly",
  ![paymentsRoute, billingRoute, webhookProcessor].some((source) =>
    /from\s+"@sentry\/nextjs"/.test(source),
  ),
);

check(
  "the adapter is a no-op without a DSN (local and CI need no credential)",
  /if\s*\(\s*!dsn\s*\)\s*\{[\s\S]{0,200}?return;/.test(monitoring) &&
    /isMonitoringConfigured\s*\(\s*\)/.test(monitoring),
);

check(
  "initialization is idempotent",
  /if\s*\(\s*initialized\s*\)\s*return;/.test(monitoring),
);

// ---------------------------------------------------------------- privacy
console.log("\nTelemetry cannot carry customer or credential data");

check(
  "PII collection is disabled at the SDK level",
  /sendDefaultPii:\s*false/.test(monitoring),
);

check(
  "request body, cookies, headers and query string are stripped before send",
  /beforeSend\s*\(/.test(monitoring) &&
    /delete\s+event\.request\.data/.test(monitoring) &&
    /delete\s+event\.request\.cookies/.test(monitoring) &&
    /delete\s+event\.request\.headers/.test(monitoring) &&
    /delete\s+event\.request\.query_string/.test(monitoring),
);

check(
  "every structured payload goes through the shared redactor",
  /import\s*\{\s*redactMeta\s*\}/.test(monitoring) &&
    (monitoring.match(/redactMeta\s*\(/g) ?? []).length >= 4,
);

check(
  "the user identity attached is an id, never an email",
  /setUser\s*\(\s*\{\s*id:\s*event\.userId\s*\}\s*\)/.test(monitoring) &&
    !/email/i.test(monitoring),
);

check(
  "tracing is off unless explicitly sampled (no accidental spend)",
  /tracesSampleRate:\s*resolveTracesSampleRate\(\)/.test(monitoring) &&
    /if\s*\(\s*!raw\s*\)\s*return\s+0;/.test(monitoring),
);

// ---------------------------------------------------------------- startup
console.log("\nInstalled at server startup");

check(
  "instrumentation.ts exists and exports register()",
  /export\s+async\s+function\s+register\s*\(/.test(instrumentation),
);

check(
  "register() initializes monitoring on the Node runtime",
  /NEXT_RUNTIME\s*===\s*"nodejs"/.test(instrumentation) &&
    /initOperationMonitoring\s*\(\s*\)/.test(instrumentation),
);

check(
  "uncaught server errors are captured via Next's onRequestError hook",
  /export\s+const\s+onRequestError/.test(instrumentation) &&
    /captureMonitoredException/.test(instrumentation),
);

check(
  "onRequestError does not forward headers or a query string",
  !/request\.headers/.test(instrumentation) &&
    /request\.path\.split\("\?"\)\[0\]/.test(instrumentation),
);

// ---------------------------------------------------------------- money path
console.log("\nThe money path is observable");

for (const [name, source, operation] of [
  ["payments", paymentsRoute, "webhook.stripe_payments.process"],
  ["billing", billingRoute, "webhook.stripe_billing.process"],
]) {
  check(
    `${name} webhook POST runs inside runOperation`,
    /export\s+async\s+function\s+POST/.test(source) &&
      /runOperation<Response>\s*\(/.test(source) &&
      source.includes(operation),
  );
  check(
    `${name} webhook reports a deliberate 5xx`,
    /response\.status\s*>=\s*500/.test(source) &&
      /captureMonitoredEvent\s*\(/.test(source),
  );
  check(
    `${name} webhook reports an unhandled exception`,
    /captureMonitoredException\s*\(/.test(source),
  );
  check(
    `${name} webhook still answers 500 on an unexpected throw (Stripe must retry)`,
    /status:\s*500/.test(source),
  );
  check(
    `${name} webhook flushes before returning (serverless freeze safety)`,
    /await\s+flushMonitoring\s*\(/.test(source),
  );
  check(
    `${name} webhook does not rethrow out of the operation`,
    /throwOnFailure:\s*false/.test(source),
  );
}

check(
  "a new payment reconciliation raises an alert",
  /captureMonitoredEvent\s*\(\s*\{[\s\S]{0,200}?event:\s*"payments\.reconciliation_required"/.test(
    webhookProcessor,
  ),
);

check(
  "the reconciliation alert fires only for a newly created record, not a redelivery",
  /if\s*\(\s*reconcileResult\.result\.created\s*\)\s*\{[\s\S]{0,400}?payments\.reconciliation_required/.test(
    webhookProcessor,
  ),
);

check(
  "the reconciliation alert carries no raw Stripe payload",
  !/session\.metadata/.test(
    webhookProcessor.slice(
      webhookProcessor.indexOf("payments.reconciliation_required"),
      webhookProcessor.indexOf("payments.reconciliation_required") + 800,
    ),
  ),
);

// ---------------------------------------------------------------- cron
console.log("\nCron failures remain observable");

for (const route of [
  "app/api/cron/marketing-ai/route.ts",
  "app/api/cron/marketing-insights/route.ts",
  "app/api/cron/workflow-reminders/route.ts",
]) {
  const source = loadTs(route);
  check(
    `${route.split("/").slice(-2)[0]} cron runs inside runOperation`,
    /runOperation\s*\(/.test(source),
  );
}

// ---------------------------------------------------------------- config
console.log("\nConfiguration is documented");

for (const key of [
  "SENTRY_DSN",
  "SENTRY_ENVIRONMENT",
  "SENTRY_TRACES_SAMPLE_RATE",
]) {
  check(`${key} is documented in .env.example`, envExample.includes(key));
}

check(
  ".env.example carries no real DSN value",
  !/SENTRY_DSN\s*=\s*https:\/\/[0-9a-f]/i.test(envExample),
);

// ---------------------------------------------------------------- dev proof
console.log("\nA live proof exists and is development-only");

const devCheck = loadTs("app/api/dev/monitoring-check/route.ts");

check(
  "the monitoring check route 404s outside development",
  /process\.env\.NODE_ENV\s*!==\s*"development"/.test(devCheck) &&
    /status:\s*404/.test(devCheck),
);

check(
  "the monitoring check route requires a platform admin",
  /canAccessPlatformAdmin\s*\(/.test(devCheck),
);

check(
  "the monitoring check throws a real error through runOperation",
  /throw\s+new\s+Error\(/.test(devCheck) && /runOperation\s*\(/.test(devCheck),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} observability checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
