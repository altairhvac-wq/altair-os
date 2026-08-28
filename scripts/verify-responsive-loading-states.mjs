/**
 * A loading boundary must branch the same way its page does.
 *
 * ===================== THE DEFECT THIS ENCODES =====================
 * The dashboard renders two whole layouts and lets CSS pick between them:
 *
 *   <div className="md:hidden">        <AdminMobileHome ... />
 *   <div className="hidden md:contents"><MissionControlV2View ... />
 *
 * Its loading boundary rendered one layout at every width. Neither
 * OperationalDashboardLoadingState nor DashboardNorthStarLoadingState contains
 * a single `md:` class -- both are the desktop Mission Control shape -- so on a
 * phone the first frame was a light desktop skeleton, held for as long as the
 * dashboard took to load (8.4 s on the scale-seeded tenant), and then replaced
 * by a dark launcher with a completely different structure.
 *
 * That is what "the old layout appears briefly before the current one" was. Not
 * a hydration mismatch, not a duplicate mount, not a legacy fallback -- the
 * first frame was simply the wrong layout, and the slower the page the longer
 * it stayed wrong.
 *
 * ===================== WHY A VERIFIER =====================
 * The page and its skeleton are different files, edited at different times, and
 * nothing connects them. Adding a breakpoint swap to a view is a local change
 * that silently invalidates a skeleton two directories away, and the symptom
 * only appears at one viewport width on a slow load -- which is exactly the
 * condition nobody develops under.
 *
 * ===================== WHAT COUNTS AS A WHOLE-PAGE SWAP =====================
 * Both halves of the pair: a `md:hidden` wrapper AND a `hidden md:contents` or
 * `hidden md:block` wrapper. That pair means "two layouts, pick one".
 *
 * A lone `md:hidden` is NOT flagged. The mobile card lists use it to swap a
 * table for cards inside a layout whose shape does not change, and a skeleton
 * for that page is right at both widths.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-responsive-loading-states.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

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

/** Comments describe the idiom; only real class strings count. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const MOBILE_ONLY = /className=["'`][^"'`]*\bmd:hidden\b/;
const DESKTOP_ONLY = /className=[^>]*\bhidden\s+md:(contents|block|flex|grid)\b/;

function hasWholePageSwap(source) {
  const code = stripComments(source);
  return MOBILE_ONLY.test(code) && DESKTOP_ONLY.test(code);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (entry.endsWith(".tsx")) {
      out.push(full.replace(/\\/g, "/"));
    }
  }
  return out;
}

/** `@/shared/...` and `@/app/...` imports, resolved to files that exist. */
function importedComponentFiles(source) {
  const files = [];
  for (const match of source.matchAll(/from\s+["'](@\/[^"']+)["']/g)) {
    const base = match[1].replace(/^@\//, "");
    for (const suffix of [".tsx", "/index.tsx", ".ts", "/index.ts"]) {
      const candidate = base + suffix;
      if (existsSync(candidate)) {
        files.push(candidate);
        break;
      }
    }
  }
  return files;
}

const pages = walk("app").filter((file) => file.endsWith("/page.tsx"));

console.log(
  `\nA loading boundary branches the same way its page does (${pages.length} routes)`,
);

const violations = [];
const covered = [];

for (const page of pages) {
  const dir = dirname(page);
  const loading = join(dir, "loading.tsx").replace(/\\/g, "/");
  if (!existsSync(loading)) continue;

  const pageSource = readFileSync(page, "utf8");

  // One level of indirection: a page renders a view, and the view holds the
  // swap. Going deeper would start reporting card-list swaps nested inside
  // layouts that do not change shape.
  const swapping = importedComponentFiles(pageSource).filter((file) =>
    hasWholePageSwap(readFileSync(file, "utf8")),
  );

  if (swapping.length === 0) continue;

  const loadingSource = readFileSync(loading, "utf8");
  if (hasWholePageSwap(loadingSource)) {
    covered.push({ loading, swapping });
  } else {
    violations.push({ page, loading, swapping });
  }
}

check(
  "every page that swaps its whole layout by breakpoint has a skeleton that does too",
  violations.length === 0,
  violations
    .map(
      (v) =>
        `        ${v.loading}\n` +
        `          renders ${v.swapping.join(", ")}, which picks between two\n` +
        `          whole layouts by breakpoint, but the skeleton has one shape.\n` +
        `          The narrower viewport gets the wrong layout until the data lands.`,
    )
    .join("\n"),
);

console.log("\nRoutes where both sides branch");
if (covered.length === 0) {
  console.log("  (none)");
} else {
  for (const entry of covered) {
    console.log(`  ${entry.loading}`);
    console.log(`    matches ${entry.swapping.join(", ")}`);
  }
}

check(
  "at least one route is actually covered",
  covered.length > 0,
  "no page was found using the whole-page breakpoint swap, so this verifier is " +
    "asserting nothing — check that the idiom detector still matches",
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} responsive loading-state checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
