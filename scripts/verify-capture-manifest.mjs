/**
 * Proves shared/capture/capture-manifest.json against the source.
 *
 * The manifest is the capture contract: every testid, attribute, label and
 * route it declares is something the Altair Demo Tool may target. A declared
 * hook that no longer exists in the source is exactly the drift that used to
 * surface as a burned capture run ("'dashboard' never reached a ready state
 * within 9000ms") - this makes it a failed verify instead.
 *
 * Deliberately grep-shaped, not AST-shaped: a hook is a LITERAL the browser
 * will see, so a literal search is the honest check. Template ids
 * ({placeholder} forms) are checked by their static prefix against the
 * template expression that renders them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = path.join(ROOT, "shared", "capture", "capture-manifest.json");
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

/** Every .ts/.tsx source file under app/ shared/ lib/, read once. */
function loadSource() {
  const chunks = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(entry.name)) chunks.push(fs.readFileSync(p, "utf8"));
    }
  };
  for (const top of ["app", "shared", "lib"]) walk(path.join(ROOT, top));
  return chunks.join("\n");
}
const SOURCE = loadSource();

const problems = [];
const must = (what, ok) => {
  if (!ok) problems.push(what);
};

/** A concrete testid must appear as a data-testid literal somewhere. */
const hasTestId = (id) =>
  SOURCE.includes(`data-testid="${id}"`) || SOURCE.includes(`data-testid={"${id}"`);

/** A templated id ({x} form) is checked by its template-literal prefix — the
 *  expression may be assigned to a variable before reaching data-testid. */
const hasTemplate = (prefix) => SOURCE.includes(`\`${prefix}\${`);

// ── shell ────────────────────────────────────────────────────────────────────
must("shell.main testid", hasTestId(manifest.shell.main));
must(
  "desktop nav landmark",
  SOURCE.includes('aria-label="Desktop navigation"')
);
must("nav-link template", hasTemplate("nav-link-"));
must("mobile-nav-link template", hasTemplate("mobile-nav-link-"));
must("quick-nav toggle testid", hasTestId(manifest.shell.quickNavToggle));
must("quick-nav drawer testid", hasTestId(manifest.shell.quickNavDrawer));
must(
  "quick-nav open label",
  SOURCE.includes(manifest.shell.quickNavOpenLabel)
);
must("toast viewport", hasTestId(manifest.shell.toastViewport));

// ── async contract ───────────────────────────────────────────────────────────
must(
  "AsyncSection loading suffix",
  SOURCE.includes(`${"${feature}"}${manifest.asyncContract.loadingSuffix}`)
);
must(
  "AsyncSection ready suffix",
  SOURCE.includes(`${"${feature}"}${manifest.asyncContract.readySuffix}`)
);
must("page skeletons carry aria-busy", SOURCE.includes('aria-busy="true"') || SOURCE.includes('"aria-busy": ariaBusy'));

// ── endpoints ────────────────────────────────────────────────────────────────
for (const [name, route] of Object.entries(manifest.endpoints)) {
  const routeDir = path.join(ROOT, "app", ...route.split("/").filter(Boolean));
  must(`endpoint ${name} (${route})`, fs.existsSync(path.join(routeDir, "route.ts")));
}

// ── map ──────────────────────────────────────────────────────────────────────
must("map window handle", SOURCE.includes(`__altairMap`));
must("map idle attribute", SOURCE.includes(`data-map-idle`));
must("technician lane id template", SOURCE.includes("dispatch-tech-"));

// ── screens ──────────────────────────────────────────────────────────────────
for (const [name, screen] of Object.entries(manifest.screens)) {
  for (const [variant, id] of Object.entries(screen.container ?? {})) {
    must(`screen ${name} container (${variant}: ${id})`, hasTestId(id));
  }
  const rows =
    typeof screen.row === "string" ? { any: screen.row } : (screen.row ?? {});
  for (const [variant, id] of Object.entries(rows)) {
    must(`screen ${name} row (${variant}: ${id})`, hasTestId(id));
  }
  for (const [regionName, id] of Object.entries(screen.regions ?? {})) {
    if (regionName.endsWith("Landmark")) {
      must(`screen ${name} landmark ${id}`, SOURCE.includes('aria-label="Unassigned jobs"'));
    } else {
      must(`screen ${name} region ${regionName} (${id})`, hasTestId(id));
    }
  }
  if (screen.async) {
    must(`screen ${name} async loading`, hasTestId(screen.async.loading));
    must(`screen ${name} async ready`, hasTestId(screen.async.ready));
  }
  if (screen.detailContainer) {
    must(`screen ${name} detail container`, hasTestId(screen.detailContainer));
  }
}
must("dashboard mobile landmark", SOURCE.includes('aria-label="Needs attention"'));
must("sales invoices row desktop", hasTestId(manifest.screens.sales.invoices.row.desktop));
must("sales invoices row mobile", hasTestId(manifest.screens.sales.invoices.row.mobile));
must("invoice queue template", hasTemplate("invoice-queue-"));
must("invoice send button", hasTestId(manifest.screens.sales.invoices.sendButton));
must("invoice send success", hasTestId(manifest.screens.sales.invoices.sendSuccess));

// ── breakpoints ──────────────────────────────────────────────────────────────
must(
  "md breakpoint is Tailwind's default 768 (no custom breakpoints configured)",
  manifest.breakpoints.md === 768 &&
    !fs.existsSync(path.join(ROOT, "tailwind.config.js")) &&
    !fs.existsSync(path.join(ROOT, "tailwind.config.ts")) &&
    !fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8").includes("--breakpoint")
);

if (problems.length > 0) {
  console.error(`capture-manifest verify FAILED — ${problems.length} declared hook(s) not found in source:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log("capture-manifest verify OK — every declared hook exists in source.");
