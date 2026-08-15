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
  { name: "media", script: "scripts/verify-marketing-media.mjs" },
  { name: "publish-guard", script: "scripts/verify-marketing-publish-guard.mjs" },
  { name: "channels", script: "scripts/verify-marketing-channels.mjs" },
  { name: "agent-contract", script: "scripts/verify-agent-snapshot-contract.mjs" },
);

const results = [];
let failed = false;

for (const step of steps) {
  const result = spawnSync(process.execPath, [step.script, ...(step.args ?? [])], {
    stdio: "inherit",
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
