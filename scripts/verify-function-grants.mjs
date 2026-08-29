/**
 * Function EXECUTE-privilege verification.
 *
 * ===================== THE BUG CLASS =====================
 * PostgreSQL grants EXECUTE on a new function to PUBLIC by default. So a
 * migration that creates a function and says nothing about privileges has not
 * left it locked down — it has left it callable by every role, including `anon`.
 *
 * That is not hypothetical here. Migration 151 set its privileges correctly:
 *
 *     revoke all on function public.get_company_dashboard_aggregates(uuid, timestamptz) from public;
 *     grant execute on function ... to authenticated, service_role;
 *
 * 151 never reached production, because its body referenced columns that do not
 * exist. Migration 158 fixed the body and carried no GRANT, on the reasoning that
 * CREATE OR REPLACE preserves an existing grant — true, and irrelevant, because
 * in production there was no existing grant to preserve. The CREATE OR REPLACE
 * was a CREATE, the ACL was null, and the function became anon-callable.
 * Confirmed against a live endpoint: HTTP 200 for an anonymous caller.
 *
 * The lesson is not "remember the grant". It is that a privileged function's
 * caller set must be written down in the same migration that creates it, so a
 * later replacement cannot silently inherit a default instead.
 *
 * ===================== THE RULE =====================
 * A migration that creates a callable function in `public` must, in the same
 * file, revoke EXECUTE from PUBLIC for that function.
 *
 * Two exemptions, both narrow:
 *
 *   * TRIGGER FUNCTIONS. A function returning `trigger` is not exposed by
 *     PostgREST and cannot be invoked without trigger context, so PUBLIC on one
 *     is not a reachable surface.
 *
 *   * DELIBERATELY PUBLIC FUNCTIONS. The customer-facing token flows — estimate
 *     approval, invoice payment — are meant to be reachable by anon. They are
 *     listed below WITH a reason, so "anon can call this" stays a decision
 *     someone made rather than a default nobody noticed.
 *
 * A SECURITY DEFINER function additionally has to name the roles it grants to.
 * Revoking from PUBLIC without granting to anyone leaves a function only its
 * owner can call, which is usually a mistake rather than a lockdown.
 *
 * ===================== AND IT HAS TO PIN search_path =====================
 * SECURITY DEFINER means the body runs with the OWNER's privileges. If
 * search_path is left to the caller, the caller chooses which `jobs` or which
 * `now()` the body resolves to — a schema they can create objects in, placed
 * ahead of `public`, turns a privileged function into a way to run their own
 * code as the owner. `set search_path = public, pg_temp` on the definition
 * closes it, and `pg_temp` is last deliberately.
 *
 * Individual verifiers assert this for the functions they care about, which
 * means it is asserted for the functions someone remembered. This asserts it
 * for every SECURITY DEFINER function in every migration, so a new one cannot
 * ship without it.
 *
 * Two rules, because they are two different strengths of the same idea:
 *
 *   1. EVERY definer function fixes its search_path. This is the security rule.
 *      A function with no setting at all inherits the caller's path.
 *
 *   2. Definer functions written from migration 148 onward end that path with
 *      `pg_temp`. PostgreSQL searches the temporary schema FIRST for relation
 *      names when pg_temp is not listed, so `= public` still lets a session's
 *      temp table shadow a real one; listing pg_temp last is the documented way
 *      to stop it. The 47 older functions set `= public` and are brought to the
 *      same form by migration 176's catalog sweep, which is why the rule starts
 *      at 148 rather than failing the whole history it cannot edit.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-function-grants.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const FIRST_CHECKED = 1;

/**
 * Functions intended to be callable by anon. Each needs a reason: these are the
 * unauthenticated entry points, and the list is the record of which ones are
 * supposed to exist.
 */
const INTENTIONALLY_PUBLIC = new Map([
  [
    "get_public_estimate_approval_view",
    "Customer-facing estimate approval page. Authorizes on a raw token, not a session.",
  ],
  [
    "get_public_invoice_payment_view",
    "Customer-facing invoice payment page. Authorizes on a raw token, not a session.",
  ],
  [
    "submit_public_estimate_approval",
    "Customer submits an approval without an account. Authorizes on a raw token.",
  ],
]);

/**
 * SECURITY DEFINER functions that deliberately grant EXECUTE to NOBODY.
 *
 * ============================== WHY THAT IS THE STRONGEST SETTING ==============================
 * A function called only from inside other SECURITY DEFINER functions never
 * needs a grant: the caller already executes as the owner, so the nested call is
 * authorized as the owner. Revoking from PUBLIC and granting to no role at all
 * means the function has no reachable surface whatsoever — which is stricter
 * than granting it to `authenticated`, not weaker.
 *
 * The general rule still holds and should: a definer function that names nobody
 * is usually an oversight, and the two below are on this list precisely so that
 * "nobody" stays a decision. Each was checked: every call site is inside another
 * definer function in the same migration set, and nothing in app/ or lib/ calls
 * either one.
 */
const INTENTIONALLY_UNGRANTED = new Map([
  [
    "hash_estimate_approval_token",
    "Called only from get_public_estimate_approval_view and " +
      "submit_public_estimate_approval, both SECURITY DEFINER. No role needs it.",
  ],
  [
    "hash_invoice_payment_token",
    "Called only from get_public_invoice_payment_view, which is SECURITY " +
      "DEFINER. No role needs it.",
  ],
]);

/**
 * Functions whose privileges are set by a LATER migration rather than the one
 * that created them.
 *
 * This is a real and legitimate pattern — it is how the 158/159 defect was
 * repaired without rewriting applied history — but it is exactly the shape the
 * rule exists to catch, so an entry is not a waiver. Each names the migration
 * that supplies the privileges, and that migration is checked below to confirm
 * it actually revokes EXECUTE for that function. An exemption pointing at a
 * migration that does not do the job fails just as loudly as no exemption.
 */
const PRIVILEGES_SUPPLIED_LATER = new Map([
  [
    "158_dashboard_aggregate_column_fix.sql:get_company_dashboard_aggregates",
    "159_dashboard_aggregate_privileges.sql",
  ],
]);

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n${detail}` : ""}`);
  }
}

function stripSql(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => {
    const n = Number.parseInt(f.slice(0, 3), 10);
    return Number.isFinite(n) && n >= FIRST_CHECKED;
  })
  .sort();

const ungranted = [];
const definerWithoutGrant = [];
const definerWithoutPinnedPath = [];
const definerWithoutTempTail = [];

/**
 * One record per FUNCTION, accumulated across every migration.
 *
 * ============================== WHY NOT PER FILE ==============================
 * CREATE OR REPLACE PRESERVES a function's existing privileges. A migration
 * that rewrites a body therefore has no reason to repeat the revoke, and
 * demanding one would teach people to paste a line that does nothing — which
 * is how a check stops being read. clear_company_demo_data alone is replaced
 * by five migrations; none of them is a defect.
 *
 * The question that matters is about the function, over the whole history:
 * does anything revoke PUBLIC EXECUTE on it, and does anything name who may
 * call it? Asked that way, the check covers migration 1 onwards.
 */
const functions = new Map();

for (const file of files) {
  const sql = stripSql(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));

  for (const match of sql.matchAll(
    /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(/gi,
  )) {
    const name = match[1];

    // Everything from the name to the `as $$` that opens the body: the
    // parameter list, the return type, the language, `security definer` and the
    // search_path setting all live there.
    //
    // This used to be a flat 600 characters, which is a bug that reads as a
    // finding: record_invoice_payment_atomic takes fourteen parameters, so its
    // `set search_path` sits past the cutoff and the function was reported as
    // unpinned when it is pinned. Ending at the body marker has no such cliff.
    const bodyStart = sql.slice(match.index).search(/\bas\s+\$/i);
    const header = sql.slice(
      match.index,
      match.index + (bodyStart === -1 ? 600 : bodyStart),
    );
    if (/returns\s+trigger/i.test(header)) continue;
    if (INTENTIONALLY_PUBLIC.has(name)) continue;

    const entry = functions.get(name) ?? {
      name,
      firstFile: file,
      lastFile: file,
      isDefiner: false,
      revoked: false,
      granted: false,
      pinned: false,
      pinnedWithTemp: false,
      definerFile: null,
    };
    entry.lastFile = file;
    if (/security\s+definer/i.test(header)) {
      entry.isDefiner = true;
      // Recorded per definition site and overwritten by later ones, because a
      // CREATE OR REPLACE that drops the setting is the live definition — the
      // same shape as the 158 grant bug this file exists for.
      entry.definerFile = file;
      entry.pinned = /set\s+search_path\s*=/i.test(header);
      entry.pinnedWithTemp =
        /set\s+search_path\s*=[^;$]*?(^|,)\s*pg_temp\s*(;|$|\n)/im.test(header);
    }
    functions.set(name, entry);
  }
}

// A second pass for the privileges, because they may be stated in a migration
// that does not create the function — which is the legitimate 158/159 shape.
for (const file of files) {
  const sql = stripSql(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));

  for (const entry of functions.values()) {
    if (
      new RegExp(
        `revoke[\\s\\S]{0,80}?on\\s+function\\s+public\\.${entry.name}\\s*\\([^)]*\\)[\\s\\S]{0,40}?from\\s+public`,
        "i",
      ).test(sql)
    ) {
      entry.revoked = true;
      entry.privilegesFile = file;
    }

    if (
      new RegExp(
        `grant\\s+execute\\s+on\\s+function\\s+public\\.${entry.name}\\s*\\([^)]*\\)[\\s\\S]{0,80}?to\\s+\\w`,
        "i",
      ).test(sql)
    ) {
      entry.granted = true;
    }

    // A definition can pin its own search_path, or a later migration can pin it
    // with ALTER FUNCTION. Both leave the function with a fixed search_path,
    // which is the property being asserted — ALTER is in fact the safer of the
    // two for an existing function, because it changes the setting and not the
    // body. Accepting it is not a relaxation: a function nobody pins either way
    // still fails.
    if (
      new RegExp(
        `alter\\s+function\\s+public\\.${entry.name}\\s*\\([^)]*\\)[\\s\\S]{0,80}?set\\s+search_path\\s*=\\s*public\\s*,\\s*pg_temp`,
        "i",
      ).test(sql)
    ) {
      entry.pinned = true;
      entry.pinnedWithTemp = true;
    }
  }
}

const inspected = functions.size;

/** Migration 148 is where `set search_path = public, pg_temp` became the house
 *  form. Everything before it is covered by 176's sweep instead. */
const TEMP_TAIL_REQUIRED_FROM = 148;

for (const entry of functions.values()) {
  if (!entry.isDefiner) continue;
  if (!entry.pinned) {
    definerWithoutPinnedPath.push({ file: entry.definerFile, name: entry.name });
    continue;
  }
  const number = Number.parseInt(entry.definerFile, 10);
  if (
    Number.isFinite(number) &&
    number >= TEMP_TAIL_REQUIRED_FROM &&
    !entry.pinnedWithTemp
  ) {
    definerWithoutTempTail.push({ file: entry.definerFile, name: entry.name });
  }
}

for (const entry of functions.values()) {
  if (!entry.revoked) {
    ungranted.push({ file: entry.lastFile, name: entry.name });
    continue;
  }
  if (entry.isDefiner && !entry.granted && !INTENTIONALLY_UNGRANTED.has(entry.name)) {
    definerWithoutGrant.push({ file: entry.privilegesFile ?? entry.lastFile, name: entry.name });
  }
}

check(
  "every SECURITY DEFINER function fixes its search_path",
  definerWithoutPinnedPath.length === 0,
  definerWithoutPinnedPath
    .map(
      (entry) =>
        `${entry.file}: public.${entry.name} runs as its owner with a ` +
        `caller-controlled search_path`,
    )
    .join("\n        "),
);

check(
  `definer functions from ${TEMP_TAIL_REQUIRED_FROM} onward end that path with pg_temp`,
  definerWithoutTempTail.length === 0,
  definerWithoutTempTail
    .map(
      (entry) =>
        `${entry.file}: public.${entry.name} — without pg_temp listed, the ` +
        `temp schema is searched FIRST for relation names`,
    )
    .join("\n        "),
);

console.log("\nEvery function the migrations create states its callers");
console.log(`  (${files.length} migrations, ${inspected} callable functions)`);

check(
  "no migration leaves a function on PostgreSQL's default PUBLIC EXECUTE",
  ungranted.length === 0,
  ungranted
    .map(
      (o) =>
        `        ${o.file}  public.${o.name}\n        ` +
        `add: revoke all on function public.${o.name}(<types>) from public;\n        ` +
        `then grant execute to the roles that should call it.`,
    )
    .join("\n"),
);

check(
  "every SECURITY DEFINER function names the roles it grants to",
  definerWithoutGrant.length === 0,
  definerWithoutGrant
    .map((o) => `        ${o.file}  public.${o.name} revokes from PUBLIC but grants to nobody`)
    .join("\n"),
);

// An exemption that points at a migration which does not actually supply the
// privileges is worse than no exemption: it reads as handled.
console.log("\nDeferred privileges are actually supplied where they claim to be");
for (const [key, supplier] of PRIVILEGES_SUPPLIED_LATER) {
  const [, fnName] = key.split(":");
  const supplierExists = files.includes(supplier);
  const supplierSql = supplierExists
    ? stripSql(readFileSync(join(MIGRATIONS_DIR, supplier), "utf8"))
    : "";
  check(
    `${key.split(":")[0]} defers public.${fnName} to ${supplier}, which delivers`,
    supplierExists &&
      new RegExp(
        `revoke[\\s\\S]{0,80}?${fnName}[\\s\\S]{0,40}?from\\s+public`,
        "i",
      ).test(supplierSql),
    supplierExists
      ? `        ${supplier} does not revoke EXECUTE on public.${fnName} from PUBLIC`
      : `        ${supplier} does not exist`,
  );
}

// The exemption list is a record of the unauthenticated surface, so it should be
// short and each entry should say why.
console.log("\nDefiner functions granted to nobody, and why");
for (const [name, reason] of INTENTIONALLY_UNGRANTED) {
  console.log(`  ${name}`);
  console.log(`    ${reason}`);
}
check(
  "every ungranted definer function carries a reason",
  [...INTENTIONALLY_UNGRANTED.values()].every((reason) => reason.length > 20),
);

console.log("\nThe deliberately-public list stays a decision, not a default");
check(
  "every intentionally public function carries a reason",
  [...INTENTIONALLY_PUBLIC.values()].every((reason) => reason.trim().length > 20),
);
check(
  "the unauthenticated surface has not quietly grown",
  INTENTIONALLY_PUBLIC.size <= 3,
  `        ${INTENTIONALLY_PUBLIC.size} functions are exempt; each addition widens what an ` +
    `anonymous caller can reach and should be a deliberate review, not an edit to this list.`,
);

// The specific regression that motivated this file.
console.log("\nThe dashboard aggregate RPC is locked down");
const privileges = files.find((f) => f.startsWith("159_"));
check(
  "a migration restores the privileges 151 intended",
  Boolean(privileges),
  "        159_dashboard_aggregate_privileges.sql is missing",
);
if (privileges) {
  const sql = stripSql(readFileSync(join(MIGRATIONS_DIR, privileges), "utf8"));
  check(
    "it revokes from PUBLIC (the line that actually closes the gap)",
    /revoke[\s\S]{0,80}?get_company_dashboard_aggregates[\s\S]{0,40}?from\s+public/i.test(sql),
  );
  check(
    "it names anon explicitly as well",
    /revoke[\s\S]{0,80}?get_company_dashboard_aggregates[\s\S]{0,40}?from\s+anon/i.test(sql),
  );
  check(
    "it grants to the same roles migration 151 named",
    /grant\s+execute[\s\S]{0,120}?to\s+authenticated,\s*service_role/i.test(sql),
  );
  check(
    "it changes privileges only — no function, policy or table",
    !/create\s+(or\s+replace\s+)?function/i.test(sql) &&
      !/create\s+policy|drop\s+policy|create\s+table/i.test(sql),
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} function grant checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
