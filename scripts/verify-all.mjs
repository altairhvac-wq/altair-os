/**
 * Runs every static verifier, cross-platform.
 *
 * Chaining these with `&&` inside a package script works on both shells, but
 * the read-only variant needed an environment prefix to reach the typecheck
 * wrapper, and `VAR=value cmd` is POSIX-only. Sequencing in Node removes the
 * shell from the picture entirely — no `&&`, no prefixes, no quoting.
 *
 * Each verifier is spawned with the CURRENT Node binary, so there is no
 * dependency on PATH, on `.cmd` shims, or on npm's own script resolution.
 *
 * Every verifier here is offline and side-effect free: none opens a socket,
 * reads a credential, or writes to the repository. That is what makes it safe
 * to run anywhere, including a read-only checkout.
 *
 * Usage:
 *   node scripts/verify-all.mjs              # verifiers only
 *   node scripts/verify-all.mjs --readonly   # typecheck first, build info in temp
 */
import { spawnSync } from "node:child_process";

const readonly = process.argv.includes("--readonly");

const steps = [];

if (readonly) {
  steps.push({ name: "typecheck", script: "scripts/typecheck.mjs", args: ["--readonly"] });
}

steps.push(
  { name: "migrations", script: "scripts/verify-marketing-migrations.mjs" },
  { name: "delivery", script: "scripts/verify-marketing-delivery.mjs" },
  { name: "delivery-store", script: "scripts/verify-marketing-delivery-store.mjs" },
  { name: "media", script: "scripts/verify-marketing-media.mjs" },
  { name: "reel", script: "scripts/verify-marketing-reel.mjs" },
  { name: "reel-transport", script: "scripts/verify-marketing-reel-transport.mjs" },
  { name: "reel-identity", script: "scripts/verify-marketing-reel-identity.mjs" },
  { name: "publish-guard", script: "scripts/verify-marketing-publish-guard.mjs" },
  { name: "channels", script: "scripts/verify-marketing-channels.mjs" },
  { name: "agent-contract", script: "scripts/verify-agent-snapshot-contract.mjs" },
  { name: "workspace", script: "scripts/verify-marketing-workspace.mjs" },
  { name: "hq-queue", script: "scripts/verify-marketing-hq-queue.mjs" },
);

/**
 * ==================== THE MONEY PATH ====================
 * These four were passing individually but sat outside the aggregate gate, so
 * nothing routinely ran them and a regression in payment recording, dispute
 * handling, card-failure persistence, or subscription entitlement could reach
 * production unchallenged. The launch audit called that out; they belong here.
 *
 * Two of them (disputes, payment-intent-failed) contain an OPTIONAL DB probe
 * that authenticates with the service-role key from .env.local and writes a
 * row. That must never happen from `verify:all`, which is documented above as
 * offline and side-effect free and may be run in a checkout pointed at
 * production. `ALTAIR_VERIFY_OFFLINE=1` (set below) keeps every pure-logic
 * assertion and skips only the DB probe. Run either script directly, without
 * that variable, to exercise the DB half against a scratch project.
 *
 * The document-numbering verifier is pure and needs no such flag.
 */
steps.push(
  { name: "document-numbering", script: "scripts/verify-document-numbering.mjs" },
  { name: "observability", script: "scripts/verify-observability.mjs" },
  { name: "perimeter", script: "scripts/verify-perimeter.mjs" },
  { name: "loadtest-harness", script: "scripts/verify-loadtest-harness.mjs" },
  { name: "dashboard-aggregates", script: "scripts/verify-dashboard-aggregates.mjs" },
  { name: "cron-sweep", script: "scripts/verify-cron-sweep.mjs" },
  { name: "phase4-controls", script: "scripts/verify-phase4-controls.mjs" },
  {
    name: "payment-reconciliation",
    script: "scripts/test-payment-reconciliation-classification.mjs",
  },
  { name: "charge-disputes", script: "scripts/verify-charge-dispute-handler.mjs" },
  {
    name: "payment-intent-failed",
    script: "scripts/verify-payment-intent-failed-handler.mjs",
  },
  { name: "saas-app-access", script: "scripts/test-saas-billing-app-access.mjs" },
);

const results = [];
let failed = false;

for (const step of steps) {
  const result = spawnSync(process.execPath, [step.script, ...(step.args ?? [])], {
    stdio: "inherit",
    env: { ...process.env, ALTAIR_VERIFY_OFFLINE: "1" },
  });
  const status = result.error ? 1 : (result.status ?? 1);
  if (result.error) {
    console.error(`\n${step.name}: could not start — ${result.error.message}`);
  }
  results.push({ step: step.name, status });
  if (status !== 0) {
    failed = true;
    // Stop at the first failure: later verifiers reading the same files would
    // just repeat the same complaint at more length.
    break;
  }
}

console.log("\n=== verify-all ===");
for (const r of results) {
  console.log(`  ${r.status === 0 ? "PASS" : "FAIL"}  ${r.step}`);
}
const skipped = steps.length - results.length;
if (skipped > 0) console.log(`  (${skipped} not run — stopped at first failure)`);

process.exit(failed ? 1 : 0);
