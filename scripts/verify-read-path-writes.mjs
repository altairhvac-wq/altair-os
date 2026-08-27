/**
 * Read paths must not perform maintenance writes (Phase 4 / 4F).
 *
 * ===================== WHAT WAS WRONG =====================
 * syncOverdueInvoiceStatuses transitions past-due invoices to `overdue` and
 * writes an activity row for each one. It ran during PAGE RENDERS — the
 * dashboard, the sales hub, the customers hub, the invoice detail and edit
 * pages, reports, and a job workflow action all reached it through
 * ensureInvoiceBillingStatesSynced.
 *
 * That is an unbounded write executed while a person waits for a page, and it
 * has three separate problems: the user pays for maintenance latency, the same
 * work runs once per concurrent reader, and a read request acquires row locks on
 * the invoice table. On the seeded tenant it was measured at 3.3 seconds for 450
 * invoices — on a page render.
 *
 * The work now belongs to the billing-maintenance cron
 * (app/api/cron/billing-maintenance/route.ts), proven by
 * scripts/verify-billing-maintenance-live.mjs across normal transition,
 * idempotent rerun, multi-company isolation, company-timezone due dates and a
 * 450-invoice candidate set.
 *
 * ===================== WHY A VERIFIER RATHER THAN A NOTE =====================
 * Nothing about writing `await ensureInvoiceBillingStatesSynced(...)` in a page
 * looks wrong, and the symptom — a slightly slower page — is invisible until a
 * tenant is large. It was added to nine call sites for exactly that reason. A
 * comment would not have stopped the tenth.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-read-path-writes.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n${detail}` : ""}`);
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(full.replace(/\\/g, "/"));
    }
  }
  return out;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

const files = [...walk("app"), ...walk("lib"), ...walk("shared")];

/**
 * The maintenance entry points. Any appearance of these outside the cron and
 * the sweep that backs it means a read path is writing again.
 */
const MAINTENANCE_SYMBOLS = [
  "ensureInvoiceBillingStatesSynced",
  "listInvoicesWithBillingSync",
  "listInvoicesByCustomerWithBillingSync",
];

/** Where the maintenance is allowed to live. */
const ALLOWED = [
  "lib/database/queries/invoices.ts", // defines syncOverdueInvoiceStatuses
  "lib/database/services/overdue-invoice-sweep.ts", // the scheduled sweep
  "app/api/cron/billing-maintenance/route.ts", // the cron entry point
];

console.log("\nThe read-path maintenance wrappers are gone");

const offenders = [];
for (const file of files) {
  const source = stripComments(readFileSync(file, "utf8"));
  for (const symbol of MAINTENANCE_SYMBOLS) {
    if (source.includes(symbol)) offenders.push({ file, symbol });
  }
}

check(
  "no file references the removed billing-sync wrappers",
  offenders.length === 0,
  offenders
    .map(
      (o) =>
        `        ${o.file} references ${o.symbol}\n        ` +
        `read paths must not run maintenance; the billing-maintenance cron owns it.`,
    )
    .join("\n"),
);

check(
  "the wrapper module itself is deleted",
  !existsSync("lib/database/services/invoice-billing.ts"),
  "        lib/database/services/invoice-billing.ts still exists",
);

console.log("\nsyncOverdueInvoiceStatuses is only called from the scheduled path");

const callers = [];
for (const file of files) {
  const source = stripComments(readFileSync(file, "utf8"));
  // A call, not the definition or an import of the name.
  if (!/syncOverdueInvoiceStatuses\s*\(/.test(source)) continue;
  if (ALLOWED.includes(file)) continue;
  callers.push(file);
}

check(
  "nothing outside the sweep calls it",
  callers.length === 0,
  callers
    .map((f) => `        ${f} calls syncOverdueInvoiceStatuses outside the scheduled sweep`)
    .join("\n"),
);

console.log("\nThe scheduled path can actually do the work");

const invoices = stripComments(readFileSync("lib/database/queries/invoices.ts", "utf8"));
check(
  "syncOverdueInvoiceStatuses accepts an injected client",
  /export async function syncOverdueInvoiceStatuses\([\s\S]{0,200}?db\?: DbClient,/.test(invoices),
  "        without this the cron resolves the cookie-scoped client, which has no\n" +
    "        session in a scheduled request — it would mark zero invoices overdue\n" +
    "        while reporting success.",
);

const sweep = stripComments(
  readFileSync("lib/database/services/overdue-invoice-sweep.ts", "utf8"),
);
check(
  "the sweep builds a service-role client",
  /createServiceRoleClient\(\)/.test(sweep),
);
check(
  "and passes it into every per-company call",
  /syncOverdueInvoiceStatuses\([\s\S]{0,160}?client,\s*\)/.test(sweep),
  "        the sweep must hand its own client down, or the cookie client is used",
);

console.log("\nThe cron that owns this work is scheduled");
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const crons = vercel.crons ?? [];
check(
  "vercel.json schedules /api/cron/billing-maintenance",
  crons.some((entry) => entry.path === "/api/cron/billing-maintenance"),
  `        found: ${crons.map((c) => c.path).join(", ") || "(none)"}`,
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} read-path write checks passed (${checks} total).`,
);
console.log(
  "\n  DEPLOY ORDER MATTERS: the billing-maintenance cron must be live when this\n" +
    "  ships. Removing the read-path sync without it running means invoices simply\n" +
    "  stop becoming overdue, and nothing errors.\n",
);
if (failures > 0) process.exit(1);
