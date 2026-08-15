/**
 * Cross-platform typecheck wrapper.
 *
 * ===================== WHY THIS FILE EXISTS =====================
 * The previous version of this seam lived in `package.json` as
 *
 *     "typecheck": "tsc --noEmit $TSC_EXTRA_ARGS"
 *
 * which is POSIX shell syntax. npm runs scripts through `cmd.exe` on Windows,
 * where `$TSC_EXTRA_ARGS` is not a variable — it is a literal string handed
 * to TypeScript, producing `TS6231: Could not resolve the path
 * '$TSC_EXTRA_ARGS'`. That did not merely break the opt-in read-only variant;
 * it broke the DEFAULT typecheck on the authoritative checkout, which is
 * Windows. Caught by independent audit.
 *
 * Node is the one interpreter guaranteed present in an npm script, so the
 * conditional logic lives here instead of in a shell string.
 *
 * ==================== WHY IT SPAWNS NODE, NOT tsc ====================
 * It runs `process.execPath` against TypeScript's own JS entry point rather
 * than the `tsc` binary. On Windows the binary is a `.cmd` shim, which
 * requires either `shell: true` (reintroducing quoting bugs) or a
 * PATHEXT-aware lookup. Executing the JS directly with the current Node
 * sidesteps both, and behaves identically on every platform.
 *
 * Usage:
 *   node scripts/typecheck.mjs                 # ordinary typecheck
 *   node scripts/typecheck.mjs --readonly      # build info outside the checkout
 *
 * `--readonly` exists because `incremental: true` in tsconfig.json makes tsc
 * write `tsconfig.tsbuildinfo` INTO the checkout, so a read-only clone fails
 * with TS5033 before typechecking anything. Override the location with
 * TSBUILDINFO_FILE if the default temp directory is unsuitable.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);

const readonly = process.argv.includes("--readonly");
const args = ["--noEmit"];

if (readonly) {
  const buildInfo =
    process.env.TSBUILDINFO_FILE || join(tmpdir(), "altair-os.tsbuildinfo");
  args.push("--tsBuildInfoFile", buildInfo);
  console.log(`typecheck: build info -> ${buildInfo}`);
}

// Pass through anything after `--` so the wrapper never becomes a ceiling.
const passthroughAt = process.argv.indexOf("--");
if (passthroughAt !== -1) args.push(...process.argv.slice(passthroughAt + 1));

const tsc = require.resolve("typescript/bin/tsc");
const result = spawnSync(process.execPath, [tsc, ...args], { stdio: "inherit" });

if (result.error) {
  console.error("typecheck: could not start TypeScript:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
