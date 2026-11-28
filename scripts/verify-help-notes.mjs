/**
 * The how-to library (shared/lib/help): every note is true to the product.
 *
 * Executes the SHIPPED catalog through the alias loader and checks:
 *   - slugs are unique, URL-safe and stable in shape;
 *   - every note sits in a known area, and every area has at least one note;
 *   - `requires` only names permissions the role table defines;
 *   - `startHref` is a real page in app/ (so "take me there" cannot 404);
 *   - steps are short, 2 to 7 of them, and use no markup but **Label**;
 *   - every **Label** a note quotes has an anchor, every anchor is used, and
 *     the anchor's source file still contains that exact text. A screen that
 *     renames a button fails here until its note is updated;
 *   - related notes exist;
 *   - the copy keeps the public-site rules (the pages are public): the
 *     product is never "Altair OS", nothing is called free, no em dashes;
 *   - titles and summaries fit a search result;
 *   - the search finds each note by its own title.
 *
 * Offline and side-effect free.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const catalog = await import("@/shared/lib/help/catalog");
const text = await import("@/shared/lib/help/text");
const roles = await import("@/lib/database/types/roles");

let checks = 0;
let failures = 0;
function check(name, condition, detail = "") {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

console.log("help notes");

const NOTES = catalog.HELP_NOTES;
const AREAS = catalog.HELP_AREAS;
const PERMISSIONS = new Set(Object.keys(roles.COMPANY_ROLE_PERMISSIONS));

// ---------------------------------------------------------------- real routes
/** Every page route in app/, as segment lists; route groups removed. */
function collectRoutes(dir, segments, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry.startsWith("_") || entry === "api") continue;
      const isGroup = entry.startsWith("(") && entry.endsWith(")");
      collectRoutes(full, isGroup ? segments : [...segments, entry], out);
    } else if (entry === "page.tsx") {
      out.push(segments);
    }
  }
  return out;
}
const ROUTES = collectRoutes("app", [], []);

function routeExists(href) {
  const path = href.split("#")[0].split("?")[0];
  const parts = path.split("/").filter(Boolean);
  return ROUTES.some(
    (route) =>
      route.length === parts.length &&
      route.every((segment, index) => segment === parts[index]),
  );
}

// ---------------------------------------------------------------- catalog shape
check("there are notes", NOTES.length > 0);

const slugs = new Set();
const fileCache = new Map();
function readSource(file) {
  if (!fileCache.has(file)) {
    fileCache.set(file, existsSync(file) ? readFileSync(file, "utf8") : null);
  }
  return fileCache.get(file);
}

const SUFFIX = " · Altair Operating System";
const BANNED = [
  [/\bAltair OS\b/, 'says "Altair OS"'],
  [/\bfree\b/i, 'uses the word "free"'],
  [/—/, "uses an em dash"],
  [/\bbest\b|#1/i, 'says "best" or "#1"'],
];

for (const note of NOTES) {
  const id = note.slug;

  check(`${id}: slug is URL-safe`, /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) && id.length <= 60);
  check(`${id}: slug is unique`, !slugs.has(id));
  slugs.add(id);

  check(`${id}: area is known`, AREAS.some((area) => area.id === note.area), note.area);
  check(`${id}: surface is known`, ["office", "technician", "any"].includes(note.surface));
  check(
    `${id}: requires names real permissions`,
    note.requires.every((permission) => PERMISSIONS.has(permission)),
    note.requires.join(", "),
  );

  check(
    `${id}: startHref is a real page`,
    note.startHref.startsWith("/") && routeExists(note.startHref),
    note.startHref,
  );
  check(`${id}: startLabel is set`, note.startLabel.trim().length > 0 && note.startLabel.length <= 32);

  check(`${id}: title fits a search result`, (note.title + SUFFIX).length <= 60, `${(note.title + SUFFIX).length} characters`);
  check(`${id}: title has no end stop`, !/[.?!]$/.test(note.title));
  check(`${id}: summary fits a search result`, note.summary.length >= 40 && note.summary.length <= 155, `${note.summary.length} characters`);

  check(`${id}: 2 to 7 steps`, note.steps.length >= 2 && note.steps.length <= 7, String(note.steps.length));

  const prose = [...note.steps, ...(note.goodToKnow ?? [])];
  const labels = new Set();
  for (const line of prose) {
    check(`${id}: step is short`, line.length <= 240, `${line.length}: ${line.slice(0, 60)}`);
    check(`${id}: markup is balanced`, (line.match(/\*\*/g) ?? []).length % 2 === 0, line);
    const stripped = text.plainHelpText(line);
    check(`${id}: only **Label** markup`, !/[*_`<>\[\]]/.test(stripped), stripped);
    for (const label of text.helpTextLabels(line)) labels.add(label);
  }

  const anchorTexts = new Set(note.anchors.map((anchor) => anchor.text));
  for (const label of labels) {
    check(`${id}: label "${label}" has an anchor`, anchorTexts.has(label));
  }
  for (const anchor of note.anchors) {
    check(`${id}: anchor "${anchor.text}" is quoted by a step`, labels.has(anchor.text));
    const source = readSource(anchor.file);
    check(`${id}: anchor file exists`, source !== null, anchor.file);
    if (source !== null) {
      check(
        `${id}: "${anchor.text}" is still on the screen`,
        source.includes(anchor.text),
        anchor.file,
      );
    }
  }

  for (const related of note.related ?? []) {
    check(`${id}: related note exists`, related !== id && NOTES.some((other) => other.slug === related), related);
  }
  for (const asked of note.alsoAsked ?? []) {
    check(`${id}: alsoAsked is lower case`, asked === asked.toLowerCase(), asked);
  }

  const copy = [note.title, note.summary, note.startLabel, ...prose, ...(note.alsoAsked ?? [])].join("\n");
  for (const [pattern, problem] of BANNED) {
    check(`${id}: copy never ${problem}`, !pattern.test(copy));
  }

  const found = catalog.searchHelpNotes(NOTES, note.title);
  check(`${id}: search finds it by its title`, found.length > 0 && found[0].slug === id, found[0]?.slug ?? "nothing");
}

for (const area of AREAS) {
  check(`area "${area.id}" has a note`, NOTES.some((note) => note.area === area.id));
}

// ---------------------------------------------------------------- who sees what
const none = Object.fromEntries([...PERMISSIONS].map((key) => [key, false]));
const technician = { ...none, viewAssignedJobs: true, createFieldEstimates: true };
const everyone = catalog.listHelpNotesFor(none);
check(
  "a person with no permissions sees only notes for everyone",
  everyone.every((note) => note.requires.length === 0),
);
check(
  "every technician-view note can be followed by a technician",
  NOTES.filter((note) => note.surface === "technician").every((note) =>
    catalog.canFollowHelpNote(note, technician),
  ),
);
check(
  "a technician is offered no note that needs an office permission",
  catalog
    .listHelpNotesFor(technician)
    .every((note) => note.requires.length === 0 || note.requires.some((p) => technician[p])),
);
check(
  "search with only filler words returns nothing",
  catalog.searchHelpNotes(NOTES, "how do I the").length === 0,
);

console.log(`  ${checks - failures} of ${checks} checks passed (${NOTES.length} notes)`);
if (failures > 0) {
  console.error(`help notes: ${failures} FAILED`);
  process.exit(1);
}
console.log("help notes: OK");
