/**
 * Phase 4 benchmark harness.
 *
 * Measures what an HTTP client can honestly measure about a running Altair
 * instance, so a before/after comparison of the Phase 4 scalability work is a
 * measurement rather than an impression.
 *
 * ============================ WHAT IT MEASURES, AND WHAT IT DOES NOT ============================
 *
 * MEASURED HERE (end to end, over HTTP, against a real server):
 *   - time to first byte and total response time, as min / p50 / p95 / max
 *   - response payload size, which is the clearest single proxy for "this page
 *     serialized the entire dataset into the RSC payload"
 *   - cold (first request after boot) versus warm behaviour
 *   - list pages under the same treatment
 *
 * NOT MEASURED HERE — and deliberately not guessed at:
 *   - QUERY COUNT. An HTTP client cannot see it. Get it from the database, not
 *     from this script: enable pg_stat_statements on the SCRATCH project, call
 *     pg_stat_statements_reset(), issue exactly one dashboard request, then
 *     read calls/rows/total_exec_time. The method is written up in
 *     docs/development/load-testing.md. Reporting a static count from reading
 *     the fan-out would be an estimate wearing a measurement's clothes.
 *   - SERVER MEMORY. Next.js does not expose per-request memory, and RSS of the
 *     whole process is dominated by the framework. Payload size is the honest
 *     proxy and is reported. If a real number is needed, run the server under
 *     `node --max-old-space-size` and watch RSS across a sustained run.
 *
 * ============================ AUTHENTICATION ============================
 *
 * The dashboard is behind auth, so a session is required. Pass the Supabase
 * auth cookie(s) with --cookie, copied from a signed-in browser session
 * against the SCRATCH instance. The script never logs the cookie value and
 * never writes it to disk.
 *
 * ============================ SAFETY ============================
 *
 * Read-only: it issues GET requests and nothing else. It still refuses to run
 * against a non-local base URL without --allow-remote, because pointing a
 * benchmark loop at production is a way to cause an outage while trying to
 * measure one.
 *
 * ============================ USAGE ============================
 *
 *   npm run build && npm run start        # in another terminal
 *
 *   node scripts/loadtest-benchmark.mjs \
 *     --cookie "sb-<ref>-auth-token=...; sb-<ref>-auth-token.1=..." \
 *     --runs 12 \
 *     --label before
 *
 *   # ...apply Phase 4 changes, rebuild, then:
 *   node scripts/loadtest-benchmark.mjs --cookie "..." --runs 12 --label after
 *
 *   node scripts/loadtest-benchmark.mjs --compare before after
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const RESULTS_DIR = ".tmp/loadtest";

/** The surfaces Phase 4 is expected to change. */
const DEFAULT_TARGETS = [
  { name: "dashboard", path: "/" },
  { name: "customers", path: "/customers" },
  { name: "sales-invoices", path: "/sales?tab=invoices" },
  { name: "sales-estimates", path: "/sales?tab=estimates" },
  { name: "jobs", path: "/work" },
  { name: "expenses", path: "/expenses" },
  { name: "reports", path: "/reports" },
  { name: "schedule", path: "/schedule" },
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    n: sorted.length,
    min: Math.round(sorted[0] ?? 0),
    p50: Math.round(percentile(sorted, 50)),
    p95: Math.round(percentile(sorted, 95)),
    max: Math.round(sorted[sorted.length - 1] ?? 0),
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function timeRequest(url, cookie) {
  const startedAt = performance.now();
  let firstByteAt = null;

  const response = await fetch(url, {
    headers: {
      ...(cookie ? { cookie } : {}),
      // Ask for the HTML document, not an RSC payload, so the measurement is
      // of a real navigation rather than a client-side patch.
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "manual",
  });

  firstByteAt = performance.now();
  const body = await response.arrayBuffer();
  const doneAt = performance.now();

  return {
    status: response.status,
    ttfbMs: firstByteAt - startedAt,
    totalMs: doneAt - startedAt,
    bytes: body.byteLength,
    redirectedTo: response.headers.get("location"),
  };
}

function assertLocalOrAllowed(baseUrl, args) {
  const host = new URL(baseUrl).hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!isLocal && !args["allow-remote"]) {
    console.error(
      `\nREFUSED: --base-url points at "${host}", which is not local.\n\n` +
        `A benchmark issues many requests in a loop. Pointing one at a shared or\n` +
        `production deployment is a way to cause an outage while measuring one.\n` +
        `If the target really is a scratch deployment, pass --allow-remote.\n`,
    );
    process.exit(1);
  }
}

async function runBenchmark(args) {
  const baseUrl = String(args["base-url"] ?? "http://localhost:3000").replace(/\/$/, "");
  assertLocalOrAllowed(baseUrl, args);

  // --cookie-file is preferred: a session cookie is a bearer credential, and
  // passing it inline puts it in shell history. scripts/loadtest-auth-cookie.mjs
  // writes one to a gitignored file.
  const cookie =
    typeof args["cookie-file"] === "string"
      ? readFileSync(args["cookie-file"], "utf8").trim()
      : typeof args.cookie === "string"
        ? args.cookie
        : "";
  const runs = Number.parseInt(String(args.runs ?? 10), 10);
  const warmups = Number.parseInt(String(args.warmups ?? 2), 10);
  const label = String(args.label ?? "run");

  const only = typeof args.only === "string" ? args.only.split(",") : null;
  const targets = only
    ? DEFAULT_TARGETS.filter((t) => only.includes(t.name))
    : DEFAULT_TARGETS;

  if (!cookie) {
    console.warn(
      "\nWARNING: no --cookie supplied. Authenticated pages will 307 to /login and\n" +
        "the numbers below will measure a redirect, not the page. Copy the Supabase\n" +
        "auth cookie from a signed-in browser session against this instance.\n",
    );
  }

  console.log(`\nBenchmark "${label}" against ${baseUrl}`);
  console.log(`  runs=${runs} (plus ${warmups} discarded warmups) targets=${targets.length}\n`);

  const results = [];

  for (const target of targets) {
    const url = `${baseUrl}${target.path}`;

    // Warmups are discarded: the first request after boot pays for route
    // compilation and connection setup, which is not what we are comparing.
    let cold = null;
    for (let i = 0; i < warmups; i += 1) {
      const sample = await timeRequest(url, cookie);
      if (i === 0) cold = sample;
    }

    const totals = [];
    const ttfbs = [];
    let lastStatus = 0;
    let lastBytes = 0;
    let lastRedirect = null;

    for (let i = 0; i < runs; i += 1) {
      const sample = await timeRequest(url, cookie);
      totals.push(sample.totalMs);
      ttfbs.push(sample.ttfbMs);
      lastStatus = sample.status;
      lastBytes = sample.bytes;
      lastRedirect = sample.redirectedTo;
    }

    const row = {
      name: target.name,
      path: target.path,
      status: lastStatus,
      redirectedTo: lastRedirect,
      bytes: lastBytes,
      coldTotalMs: cold ? Math.round(cold.totalMs) : null,
      ttfb: summarize(ttfbs),
      total: summarize(totals),
    };
    results.push(row);

    const flag =
      row.status >= 300 && row.status < 400
        ? `  <-- ${row.status} redirect (not authenticated?)`
        : row.status !== 200
          ? `  <-- HTTP ${row.status}`
          : "";
    console.log(
      `  ${row.name.padEnd(18)} ` +
        `ttfb p50 ${String(row.ttfb.p50).padStart(5)}ms  p95 ${String(row.ttfb.p95).padStart(5)}ms   ` +
        `total p50 ${String(row.total.p50).padStart(5)}ms  p95 ${String(row.total.p95).padStart(5)}ms   ` +
        `${formatBytes(row.bytes).padStart(9)}  cold ${String(row.coldTotalMs).padStart(5)}ms${flag}`,
    );
  }

  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = join(RESULTS_DIR, `${label}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        label,
        baseUrl,
        runs,
        warmups,
        // Deliberately not recorded: the cookie, or anything derived from it.
        recordedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\n  written: ${outPath}\n`);
  console.log(
    "  Query count is NOT in this file. Measure it on the scratch database with\n" +
      "  pg_stat_statements — see docs/development/load-testing.md.\n",
  );
}

function runCompare(args) {
  const [beforeLabel, afterLabel] = args._;
  if (!beforeLabel || !afterLabel) {
    console.error("\nUsage: --compare <before-label> <after-label>\n");
    process.exit(1);
  }

  const load = (label) => {
    const path = join(RESULTS_DIR, `${label}.json`);
    if (!existsSync(path)) {
      console.error(`\nNo results file at ${path}\n`);
      process.exit(1);
    }
    return JSON.parse(readFileSync(path, "utf8"));
  };

  const before = load(beforeLabel);
  const after = load(afterLabel);
  const afterByName = new Map(after.results.map((r) => [r.name, r]));

  console.log(`\n${beforeLabel} -> ${afterLabel}\n`);
  console.log(
    `  ${"page".padEnd(18)} ${"p50 total".padEnd(24)} ${"p95 total".padEnd(24)} payload`,
  );

  for (const b of before.results) {
    const a = afterByName.get(b.name);
    if (!a) continue;
    const delta = (from, to) => {
      if (!from) return "n/a";
      const pct = Math.round(((to - from) / from) * 100);
      const sign = pct > 0 ? "+" : "";
      return `${String(from).padStart(5)} -> ${String(to).padStart(5)}ms ${sign}${pct}%`;
    };
    const bytesDelta =
      b.bytes > 0
        ? `${formatBytes(b.bytes)} -> ${formatBytes(a.bytes)} ${
            a.bytes > b.bytes ? "+" : ""
          }${Math.round(((a.bytes - b.bytes) / b.bytes) * 100)}%`
        : "n/a";
    console.log(
      `  ${b.name.padEnd(18)} ${delta(b.total.p50, a.total.p50).padEnd(24)} ` +
        `${delta(b.total.p95, a.total.p95).padEnd(24)} ${bytesDelta}`,
    );
  }
  console.log("");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.compare) return runCompare(args);
  return runBenchmark(args);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
