/**
 * The public site's stylesheet split (app/public.css vs app/app.css).
 *
 * ===================== WHAT THIS GUARDS =====================
 * The marketing and sign-in pages load app/public.css, whose Tailwind
 * utilities are generated only from the files listed in its `@source` rules.
 * If a public page starts importing a component from a file that list does
 * not cover, that component's utilities are simply missing on the public
 * site. Nothing errors; the page just renders wrong. So this walks every
 * import from the public routes and fails if a reached file in app/ or
 * shared/ falls outside the list.
 *
 * It also checks the wiring: the root layout imports no stylesheet, the public
 * route groups import public.css, the root not-found and error pages import
 * only the tiny status-page.css (Next.js puts those two on every route), and
 * every other top-level route that renders a page imports app.css through a
 * layout. A route that imports neither would render unstyled.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-public-stylesheet.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "app");

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

const rel = (file) => path.relative(ROOT, file).split(path.sep).join("/");
const read = (file) => readFileSync(file, "utf8");

// ---------- the public sheet's sources ----------
const publicCss = read(path.join(APP, "public.css"));
const sources = [...publicCss.matchAll(/^@source\s+"([^"]+)";/gm)].map((m) => path.resolve(APP, m[1]));
check("public.css lists its sources", sources.length > 0);
for (const source of sources) {
  check(`source exists: ${rel(source)}`, existsSync(source), "Remove the line or fix the path.");
}
const covered = (file) => sources.some((source) => file === source || file.startsWith(source + path.sep));

// ---------- the import graph from the public routes ----------
const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];
function resolveImport(spec, from) {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null; // a package
  for (const ext of EXTENSIONS) {
    const candidate = path.normalize(base + ext);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s+['"]([^'"]+)['"]/gm;
function importsOf(file) {
  const out = [];
  for (const match of read(file).matchAll(IMPORT)) {
    const spec = match[1] ?? match[2] ?? match[3];
    const target = resolveImport(spec, file);
    if (target && /\.(tsx?|jsx?|mjs)$/.test(target)) out.push(target);
  }
  return out;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const PUBLIC_GROUPS = ["(marketing)", "(auth)"];
const ROOT_PUBLIC_FILES = ["layout.tsx"];
const entries = [
  ...PUBLIC_GROUPS.flatMap((group) => walk(path.join(APP, group))),
  ...ROOT_PUBLIC_FILES.map((name) => path.join(APP, name)).filter((file) => existsSync(file)),
];

const seen = new Set();
const stack = [...entries];
while (stack.length > 0) {
  const file = stack.pop();
  if (seen.has(file)) continue;
  seen.add(file);
  stack.push(...importsOf(file));
}

// Class names live in app/ and shared/. lib/ is server logic; app/actions are Server Actions.
const mustCover = [...seen].filter((file) => {
  const r = rel(file);
  return (r.startsWith("app/") || r.startsWith("shared/")) && !r.startsWith("app/actions/");
});
const uncovered = mustCover.filter((file) => !covered(file)).map(rel).sort();
check(
  `every file the public pages import is a public.css source (${mustCover.length} files)`,
  uncovered.length === 0,
  `Add these (or their folder) as @source lines in app/public.css:\n        ${uncovered.join("\n        ")}`,
);

// ---------- which routes load which sheet ----------
const importsSheet = (file, sheet) =>
  existsSync(file) && new RegExp(`^\\s*import\\s+["']\\.{1,2}/${sheet.replace(".", "\\.")}["'];`, "m").test(read(file));

const rootLayout = path.join(APP, "layout.tsx");
check(
  "the root layout imports no stylesheet",
  !/^\s*import\s+["'][^"']+\.css["'];/m.test(read(rootLayout)),
  "A stylesheet in app/layout.tsx loads on every route; import it from the route's own layout.",
);
for (const group of PUBLIC_GROUPS) {
  check(`app/${group}/layout.tsx imports public.css`, importsSheet(path.join(APP, group, "layout.tsx"), "public.css"));
}
// Next.js puts the root not-found and error boundaries in EVERY route's tree,
// so whatever they import, every page downloads. They use the tiny
// status-page.css and nothing else.
for (const name of ["not-found.tsx", "error.tsx"]) {
  const file = path.join(APP, name);
  const sheets = [...read(file).matchAll(/^\s*import\s+["']([^"']+\.css)["'];/gm)].map((m) => m[1]);
  check(
    `app/${name} imports only status-page.css`,
    sheets.length === 1 && sheets[0] === "./status-page.css",
    `Found: ${sheets.join(", ") || "no stylesheet"}. A bigger sheet here would load on every page, admin included.`,
  );
}

const hasPage = (dir) => walk(dir).some((file) => /[\\/]page\.(tsx|jsx|ts|js)$/.test(file));
for (const entry of readdirSync(APP, { withFileTypes: true })) {
  if (!entry.isDirectory() || PUBLIC_GROUPS.includes(entry.name) || ["api", "actions"].includes(entry.name)) continue;
  const dir = path.join(APP, entry.name);
  if (!hasPage(dir)) continue;
  check(
    `app/${entry.name}/layout.tsx imports app.css`,
    importsSheet(path.join(dir, "layout.tsx"), "app.css"),
    "Every top-level route outside the public site needs a layout that imports ../app.css, or it renders unstyled.",
  );
}

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures > 0) process.exit(1);
