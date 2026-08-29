/**
 * The service worker caches nothing, and that is a decision.
 *
 * ===================== WHY THIS IS ASSERTED =====================
 * Altair is installable and not offline-capable. The service worker is fifteen
 * lines of network-only pass-through on purpose, because Altair is multi-tenant
 * and a cache is a place tenant data outlives the session that fetched it — a
 * cached dashboard is one company's revenue and customer list sitting in the
 * browser profile of a shared office laptop or a technician's personal phone.
 * Signing out does not clear a service-worker cache unless someone remembers to.
 *
 * Adding caching is a reasonable future change. Adding it WITHOUT scoping
 * entries to a company, without evicting on sign-out and company switch, and
 * without idempotency keys on queued mutations is not, and it is the kind of
 * change that looks like a performance improvement in review.
 *
 * So this fails when the worker grows a cache. The fix when that day comes is
 * to update this file in the same change, having answered the questions in
 * docs/development/pwa-and-offline.md — not to delete it.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-pwa-offline.mjs
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

const SW_PATH = "public/sw.js";
const MANIFEST_PATH = "app/manifest.ts";
const HOOK_PATH = "shared/hooks/useConnectivityStatus.ts";
const DOC_PATH = "docs/development/pwa-and-offline.md";

console.log("\nInstallable");

check("a web app manifest exists", existsSync(MANIFEST_PATH));
const manifest = existsSync(MANIFEST_PATH)
  ? readFileSync(MANIFEST_PATH, "utf8")
  : "";
check(
  "it declares standalone display and a start_url",
  /display:\s*"standalone"/.test(manifest) && /start_url:\s*"\//.test(manifest),
);
check("a service worker exists", existsSync(SW_PATH));
check(
  "and something registers it",
  existsSync("shared/components/pwa/PwaServiceWorkerRegistration.tsx"),
);

console.log("\nNot offline-capable, deliberately");

const sw = existsSync(SW_PATH) ? readFileSync(SW_PATH, "utf8") : "";

// The Cache Storage API is the whole surface. Any of these appearing means the
// worker has started keeping responses.
const CACHE_APIS = [
  "caches.open",
  "caches.match",
  "caches.keys",
  "cache.put",
  "cache.add",
  "cache.addAll",
  "CacheStorage",
];
const usedCacheApi = CACHE_APIS.filter((api) => sw.includes(api));
check(
  "the worker uses no Cache Storage API",
  usedCacheApi.length === 0,
  `found ${usedCacheApi.join(", ")} — a cached response in a multi-tenant app ` +
    `outlives the session that fetched it. See ${DOC_PATH}.`,
);

check(
  "the worker does not persist to IndexedDB",
  !/indexedDB/i.test(sw),
  "tenant data written to IndexedDB survives sign-out",
);

check(
  "its fetch handler passes straight through to the network",
  /respondWith\(\s*fetch\(\s*event\.request\s*\)\s*\)/.test(sw),
  "the handler no longer answers every request from the network",
);

// Small enough to read in one sitting is not a style preference here: this file
// is the entire offline security boundary, so it has to stay reviewable.
const lines = sw.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
check(
  `the worker is still small enough to read in full (${lines} non-blank lines)`,
  lines <= 40,
  "a service worker that needs skimming is one whose caching nobody checked",
);

console.log("\nThe user is told, even though nothing is queued");

const hook = existsSync(HOOK_PATH) ? readFileSync(HOOK_PATH, "utf8") : "";
check(
  "a connectivity hook reflects navigator.onLine",
  /navigator\.onLine/.test(hook),
);
check(
  "it exposes a reconnect signal, so the UI can confirm recovery",
  /justReconnected/.test(hook),
);
check(
  "a technician-facing offline banner exists",
  existsSync("shared/components/technician/TechnicianConnectivityBanner.tsx"),
);

// A queue without idempotency turns a flaky connection into duplicate
// payments. There is no queue today; this records WHY there is no queue, so the
// absence stays a decision rather than an oversight.
check(
  "no offline mutation queue exists yet",
  !/outbox|queueMutation|retryQueue/i.test(hook),
  "a queue needs idempotency keys and explicit conflict behaviour first",
);

console.log("\nThe decision is written down");

check(
  "the PWA position is documented",
  existsSync(DOC_PATH),
  `${DOC_PATH} is what the next person reads before adding a cache`,
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} PWA checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
