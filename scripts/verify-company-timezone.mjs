/**
 * A company's time zone (migration 220): one rule, one place, no magic value.
 *
 * ===================== THE BUG THIS GUARDS =====================
 * companies.timezone defaults to 'America/New_York' and nothing ever asked
 * a new company where it was. The application therefore treated the literal
 * value 'America/New_York' as "not set" and ran the company on Mountain
 * time, and it applied that reading at several layers: the company context,
 * the client provider, the module-level setter, three settings cards. So a
 * company in New York that picked Eastern got Mountain time everywhere, and
 * fixing one layer would have been undone by the next.
 *
 * ===================== WHAT MUST STAY TRUE =====================
 *   1. THE RULE. Whether a zone was chosen is `timezone_set_at`, never the
 *      zone's name. Chosen: used exactly. Not chosen: what the company
 *      always ran on. The cases are executed below against the shipped
 *      function.
 *   2. ONE PLACE. Only resolveCompanyTimeZone compares a zone to the legacy
 *      default, and it takes the ROW. Nothing resolves a second time.
 *   3. NO SILENT MOVES. The migration marks as chosen only rows that cannot
 *      be the default, and the profile form cannot confirm a zone nobody
 *      looked at.
 *   4. HARMLESS BEFORE THE MIGRATION. Every read falls back, every write
 *      that needs the column does nothing, nothing is asked.
 *   5. THE WALL. Only an owner or admin changes it, through actions that
 *      check for themselves.
 *   6. ONE CALENDAR PER REPORT (migration 221). The Reports page's figures,
 *      charts and sparklines count a moment on the same day: the company's,
 *      or, when either database function cannot take a zone yet, the UTC
 *      day for all of them. Never one of each.
 *
 * ===================== EXECUTED, AND ONLY READ =====================
 * The rule, the profile form's save rule, the "is this a place" test and the
 * row reads' behaviour when the column is missing are EXECUTED against the
 * shipped code (the reads with a stand-in database that answers the way
 * PostgREST does before migration 220). The wiring (which file calls what,
 * what the migration says) is checked by reading the source; those checks
 * say "the code is written this way", not "it was run". The run-through in
 * a browser against a real database is in the pull request.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-company-timezone.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { register } from "node:module";
import { join } from "node:path";
import { loadPureModule } from "./lib/load-pure-module.mjs";

// The row reads live in a server module that imports through the "@/" alias.
// Registered here (not on the command line) so the script runs by itself.
register("./lib/ts-alias-loader.mjs", import.meta.url);

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail === undefined ? "" : `\n        ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  }
}

const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
/** Code only: a rule about what the code does must not be satisfied (or broken) by a comment. */
const code = (path) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const FILES = {
  datetime: "shared/lib/datetime.ts",
  provider: "shared/lib/company-timezone.tsx",
  context: "lib/database/company-context.ts",
  timezoneQueries: "lib/database/queries/company-timezone.ts",
  companies: "lib/database/queries/companies.ts",
  settingsAction: "app/actions/company-settings.ts",
  setupAction: "app/actions/business-setup.ts",
  setupQueries: "lib/database/queries/business-setup.ts",
  setupSteps: "shared/components/business-setup/steps.tsx",
  setupPage: "app/(admin)/get-started/page.tsx",
  prompt: "shared/components/settings/TimeZoneConfirmPrompt.tsx",
  home: "app/(admin)/(home)/page.tsx",
  settingsPage: "app/(admin)/settings/company/page.tsx",
  settingsView: "shared/components/settings/CompanySettingsView.tsx",
  authActions: "app/actions/auth.ts",
  postAuth: "lib/auth/post-auth.ts",
  signUpForm: "shared/components/auth/SignUpForm.tsx",
  companySetupForm: "shared/components/auth/CompanySetupForm.tsx",
  profileForm: "shared/components/settings/CompanyProfileForm.tsx",
  browserZoneHook: "shared/lib/use-browser-time-zone.ts",
  zoneList: "shared/lib/company-timezones.ts",
  reminders: "lib/database/services/evaluate-workflow-reminders.ts",
  approvalRouting: "lib/database/services/estimate-approval-routing.ts",
  overdueSweep: "lib/database/services/overdue-invoice-sweep.ts",
  draftInvoice: "lib/database/services/completion-draft-invoice.ts",
  aggregates: "lib/database/queries/reports-aggregates.ts",
  dashboardOverview: "lib/database/services/dashboard-overview.ts",
  coreTables: "lib/database/types/core-tables.ts",
  dbTypes: "lib/database/types/database.ts",
  migration: "supabase/migrations/220_company_timezone_choice.sql",
  migration170: "supabase/migrations/170_report_daily_series.sql",
  migration221: "supabase/migrations/221_reports_summary_time_zone.sql",
  migration169: "supabase/migrations/169_reports_summary_aggregates.sql",
  reportsLoader: "lib/database/queries/reports.ts",
  reportsPage: "app/(admin)/reports/page.tsx",
  taxSummaryPage: "app/(admin)/reports/tax-summary/page.tsx",
  reportsAi: "app/actions/reports-ai.ts",
  reportTypes: "shared/types/reports.ts",
  reportDayBasis: "shared/lib/reports/report-day-basis.ts",
};

console.log("\nFiles exist");
for (const [key, path] of Object.entries(FILES)) {
  check(`${key}: ${path}`, existsSync(path));
}
if (failed > 0) {
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ 1. rule */
console.log("\nThe rule, executed (shared/lib/datetime.ts)");
const dt = await loadPureModule(FILES.datetime, "company-timezone");
const NY = "America/New_York";
const DENVER = "America/Denver";
const SET = "2026-11-27T18:00:00.000Z";

check("the legacy default is the column default, and the fallback is Mountain", dt.LEGACY_DEFAULT_COMPANY_TIMEZONE === NY && dt.DEFAULT_COMPANY_TIMEZONE === DENVER);

// Chosen: exactly what is stored.
check("chosen Eastern is Eastern (the bug)", dt.resolveCompanyTimeZone({ timezone: NY, timezone_set_at: SET }) === NY);
check("chosen Mountain is Mountain", dt.resolveCompanyTimeZone({ timezone: DENVER, timezone_set_at: SET }) === DENVER);
check("chosen Central is Central", dt.resolveCompanyTimeZone({ timezone: "America/Chicago", timezone_set_at: SET }) === "America/Chicago");
check("a chosen zone is trimmed", dt.resolveCompanyTimeZone({ timezone: "  America/New_York ", timezone_set_at: SET }) === NY);

// Never chosen: what the company has always run on.
check("never chosen, column default: Mountain, as before", dt.resolveCompanyTimeZone({ timezone: NY, timezone_set_at: null }) === DENVER);
check("never chosen, another zone stored: that zone, as before", dt.resolveCompanyTimeZone({ timezone: "America/Chicago", timezone_set_at: null }) === "America/Chicago");
check("never chosen, Mountain stored: Mountain", dt.resolveCompanyTimeZone({ timezone: DENVER, timezone_set_at: null }) === DENVER);

// Migration pending: identical to "never chosen".
check("column absent, column default: Mountain, as before", dt.resolveCompanyTimeZone({ timezone: NY }) === DENVER);
check("column absent, another zone stored: that zone, as before", dt.resolveCompanyTimeZone({ timezone: "America/Los_Angeles" }) === "America/Los_Angeles");

// Nothing to read.
check("no row: the fallback", dt.resolveCompanyTimeZone(null) === DENVER && dt.resolveCompanyTimeZone(undefined) === DENVER && dt.resolveCompanyTimeZone({}) === DENVER);
check("blank zone, even if marked chosen: the fallback", dt.resolveCompanyTimeZone({ timezone: "  ", timezone_set_at: SET }) === DENVER);

check(
  "the choice is read from timezone_set_at alone",
  dt.getCompanyTimeZoneChoice({ timezone: NY, timezone_set_at: SET }) === "chosen" &&
    dt.getCompanyTimeZoneChoice({ timezone: "America/Chicago", timezone_set_at: null }) === "unconfirmed" &&
    dt.getCompanyTimeZoneChoice({ timezone: NY, timezone_set_at: null }) === "unconfirmed" &&
    dt.getCompanyTimeZoneChoice({ timezone: "America/Chicago" }) === "unavailable" &&
    dt.getCompanyTimeZoneChoice(null) === "unavailable",
);

// The module-level setter takes a RESOLVED zone and must not read meaning into it.
dt.setCompanyTimeZone(NY);
check("setCompanyTimeZone keeps Eastern (it used to turn it into Mountain)", dt.getCompanyTimeZone() === NY);
dt.setCompanyTimeZone("");
check("setCompanyTimeZone with nothing falls back", dt.getCompanyTimeZone() === DENVER);

// What "Eastern" changes: the same instant is a different day and hour.
const lateEvening = new Date("2026-12-01T04:30:00.000Z"); // 11:30 pm Nov 30 Eastern, 9:30 pm Nov 30 Mountain
check("an instant reads in the zone it is given", dt.getDateOnlyInTimeZone(lateEvening, NY) === "2026-11-30" && dt.getHourInTimeZone(lateEvening, NY) === 23 && dt.getHourInTimeZone(lateEvening, DENVER) === 21);
const justAfterMidnightEastern = new Date("2026-12-01T05:30:00.000Z"); // 12:30 am Dec 1 Eastern, 10:30 pm Nov 30 Mountain
check(
  "Eastern and Mountain disagree about the day late in the evening (why the zone matters)",
  dt.getDateOnlyInTimeZone(justAfterMidnightEastern, NY) === "2026-12-01" && dt.getDateOnlyInTimeZone(justAfterMidnightEastern, DENVER) === "2026-11-30",
);

console.log("\nA browser that only reports UTC is not telling us where the shop is");
check("real places count", ["America/Chicago", "America/Phoenix", "Europe/London", "Pacific/Auckland", " America/Denver "].every((zone) => dt.isPlaceTimeZone(zone)));
check("UTC and its aliases do not", ["UTC", "utc", "Etc/UTC", "Etc/GMT+5", "GMT", "GMT0", "Universal", "Zulu", "Greenwich", "UCT", "", "   ", null, undefined].every((zone) => !dt.isPlaceTimeZone(zone)));

/* ---------------------------------------------- 3. the profile form's save */
console.log("\nThe company profile form cannot confirm a zone nobody looked at");
const now = new Date("2026-11-27T12:00:00.000Z");
const stamp = now.toISOString();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
check(
  "never chosen, form sends the zone already shown: nothing written, still asked to confirm",
  same(dt.companyTimeZoneColumnsForProfileSave({ timezone: DENVER, timezone_set_at: null }, DENVER, now), {}),
);
check(
  "never chosen, form sends a different zone: stored and marked chosen",
  same(dt.companyTimeZoneColumnsForProfileSave({ timezone: DENVER, timezone_set_at: null }, NY, now), { timezone: NY, timezone_set_at: stamp }),
);
check(
  "chosen, unchanged: nothing written (the mark keeps its date)",
  same(dt.companyTimeZoneColumnsForProfileSave({ timezone: NY, timezone_set_at: SET }, NY, now), {}),
);
check(
  "chosen, changed: stored and marked again",
  same(dt.companyTimeZoneColumnsForProfileSave({ timezone: NY, timezone_set_at: SET }, "America/Chicago", now), { timezone: "America/Chicago", timezone_set_at: stamp }),
);
check(
  "migration pending: the zone alone, as the form always wrote it",
  same(dt.companyTimeZoneColumnsForProfileSave({ timezone: DENVER }, NY, now), { timezone: NY }),
);

/* ------------------------------------------------------------ 2. one place */
console.log("\nOne place decides what a stored zone means");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path.replace(/\\/g, "/"));
  }
  return out;
}
const sources = ["app", "lib", "shared"].flatMap((dir) => walk(dir));

const legacyUsers = sources.filter((path) => /LEGACY_DEFAULT_COMPANY_TIMEZONE/.test(code(path)));
check("only shared/lib/datetime.ts mentions the legacy default", same(legacyUsers, [FILES.datetime]), legacyUsers);

const literalUsers = sources.filter((path) => /["'`]America\/New_York["'`]/.test(code(path)));
check(
  "the only 'America/New_York' in the app is the legacy constant and the list of choices",
  same(literalUsers.sort(), ["shared/lib/company-timezones.ts", FILES.datetime].sort()),
  literalUsers,
);

// Every call hands over a row (or nothing). A call with a bare zone name is
// the old shape: it cannot know whether that zone was chosen.
const badCalls = [];
for (const path of sources) {
  const text = code(path);
  for (const match of text.matchAll(/resolveCompanyTimeZone\(([^)]*)\)/g)) {
    const arg = match[1].trim();
    if (path === FILES.datetime) continue;
    if (/timezone\b/i.test(arg) && !/^(company|row|fields|data)$/.test(arg)) badCalls.push(`${path}: resolveCompanyTimeZone(${arg})`);
    if (/\.timezone$/.test(arg) || /TimeZone$/.test(arg)) badCalls.push(`${path}: resolveCompanyTimeZone(${arg})`);
  }
}
check("resolveCompanyTimeZone is always given the row, never a bare zone name", badCalls.length === 0, badCalls);

const resolverCallers = sources.filter((path) => path !== FILES.datetime && /resolveCompanyTimeZone\(/.test(code(path))).sort();
check(
  "it is called where a row is read, and nowhere else",
  same(resolverCallers, [FILES.context, FILES.timezoneQueries, FILES.overdueSweep].sort()),
  resolverCallers,
);

const provider = code(FILES.provider);
check("the client provider uses the resolved zone as it is", !provider.includes("resolveCompanyTimeZone") && provider.includes("setCompanyTimeZone(resolvedTimeZone)"));
check("the context resolves from the whole row", code(FILES.context).includes("timezone: resolveCompanyTimeZone(company)"));

const datetime = code(FILES.datetime);
const setter = datetime.slice(datetime.indexOf("export function setCompanyTimeZone"), datetime.indexOf("export function getCompanyTimeZone"));
check("setCompanyTimeZone does not resolve again", !setter.includes("resolveCompanyTimeZone") && !setter.includes("LEGACY_DEFAULT"));
check("shared/lib/datetime.ts stays pure (no imports)", !/^\s*import\s/m.test(datetime));

// A query that names the timezone column must go through the helper that
// knows about the missing column. (Whole-row reads, select("*"), are the
// company context's: it resolves them. getUserCompanies also returns whole
// rows, unresolved; nothing may read a zone off those, which the next check
// holds.)
const rawReaders = sources.filter((path) => {
  if (path === FILES.timezoneQueries || path === FILES.companies) return false;
  return /\.select\(\s*["'`][^"'`]*\btimezone\b/.test(code(path));
});
check("no query names the timezone column outside the time zone helper", rawReaders.length === 0, rawReaders);
const membershipZoneReaders = sources.filter((path) => /getUserCompanies\(/.test(code(path)) && path !== FILES.context && /\.company\.timezone\b|company\??\.timezone\b/.test(code(path).replace(/(companyContext|context)\.company\.timezone/g, "")));
check("nothing reads a zone off the unresolved membership list", membershipZoneReaders.length === 0, membershipZoneReaders);
for (const [key, label] of [
  ["reminders", "reminders"],
  ["approvalRouting", "estimate approval routing"],
  ["draftInvoice", "the draft invoice made on completion"],
]) {
  check(`${label} resolve through loadResolvedCompanyTimeZone`, code(FILES[key]).includes("loadResolvedCompanyTimeZone("));
}
const sweep = code(FILES.overdueSweep);
check("the overdue sweep reads both columns, and falls back when one is missing", sweep.includes("COMPANY_TIMEZONE_COLUMNS") && sweep.includes("COMPANY_TIMEZONE_COLUMNS_LEGACY") && sweep.includes("isMissingDatabaseColumnError(error)") && sweep.includes("resolveCompanyTimeZone(row)"));

/* -------------------------------------------- 4. before the migration runs */
console.log("\nHarmless before migration 220");
const tzq = code(FILES.timezoneQueries);
check("server-only", read(FILES.timezoneQueries).startsWith('import "server-only";'));

// The row reads, executed. The stand-in answers a select the way PostgREST
// does: an error for a column it does not have, a row otherwise.
const zoneQueries = await import("@/lib/database/queries/company-timezone");
function standInDatabase({ row, missingColumnError = null, failure = null }) {
  const asked = [];
  return {
    asked,
    from(table) {
      return {
        select(columns) {
          asked.push(`${table}: ${columns}`);
          const answer = failure
            ? { data: null, error: failure }
            : missingColumnError && columns.includes("timezone_set_at")
              ? { data: null, error: missingColumnError }
              : { data: row ? Object.fromEntries(columns.split(",").map((c) => c.trim()).filter((c) => c in row).map((c) => [c, row[c]])) : null, error: null };
          const chain = { eq: () => chain, maybeSingle: async () => answer };
          return chain;
        },
      };
    },
  };
}
const quiet = async (run) => {
  const original = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = original;
  }
};

{
  const db = standInDatabase({ row: { timezone: NY, timezone_set_at: SET } });
  const read1 = await zoneQueries.readCompanyTimeZoneFields(db, "c1");
  check("migration in, zone chosen: both columns are read and Eastern is Eastern", db.asked.length === 1 && read1.fields?.timezone_set_at === SET && (await zoneQueries.loadResolvedCompanyTimeZone(db, "c1", "test")) === NY);
}
{
  const db = standInDatabase({ row: { timezone: NY, timezone_set_at: null } });
  check("migration in, never chosen: Mountain, as before", (await zoneQueries.loadResolvedCompanyTimeZone(db, "c1", "test")) === DENVER);
}
for (const [label, error] of [
  ["Postgres says no such column (42703)", { code: "42703", message: 'column companies.timezone_set_at does not exist' }],
  ["the API does not know the column (PGRST204)", { code: "PGRST204", message: "Could not find the 'timezone_set_at' column of 'companies' in the schema cache" }],
]) {
  const db = standInDatabase({ row: { timezone: NY }, missingColumnError: error });
  const fields = (await zoneQueries.readCompanyTimeZoneFields(db, "c1")).fields;
  check(`migration pending, ${label}: asked again without it, resolves as before`, db.asked.length === 2 && db.asked[1] === "companies: timezone" && fields?.timezone === NY && fields.timezone_set_at === undefined && dt.getCompanyTimeZoneChoice(fields) === "unavailable" && dt.resolveCompanyTimeZone(fields) === DENVER);
  const other = standInDatabase({ row: { timezone: "America/Chicago" }, missingColumnError: error });
  check(`migration pending, ${label}: a zone saved in Settings before is still used`, (await zoneQueries.loadResolvedCompanyTimeZone(other, "c1", "test")) === "America/Chicago");
}
{
  const db = standInDatabase({ failure: { code: "57014", message: "canceling statement due to statement timeout" } });
  const outcome = await quiet(async () => ({ read: await zoneQueries.readCompanyTimeZoneFields(db, "c1"), zone: await zoneQueries.loadResolvedCompanyTimeZone(db, "c1", "test") }));
  check("any other failure: asked once, reported, and the job carries on in the fallback zone", outcome.read.fields === null && outcome.read.error?.code === "57014" && outcome.zone === DENVER);
}
{
  const db = standInDatabase({ row: null });
  check("no such company: the fallback zone", (await zoneQueries.loadResolvedCompanyTimeZone(db, "c1", "test")) === DENVER);
}

console.log("\nA zone a browser reported is checked before it is used");
check("a real zone is kept", zoneQueries.readDetectedTimeZone("America/Phoenix") === "America/Phoenix" && zoneQueries.readDetectedTimeZone("  America/Chicago ") === "America/Chicago");
check("UTC is 'not known'", zoneQueries.readDetectedTimeZone("UTC") === null && zoneQueries.readDetectedTimeZone("Etc/UTC") === null);
check("nonsense, the wrong type and an over-long value are dropped", [ "Mars/Olympus", "", "   ", 42, null, undefined, {}, "America/" + "x".repeat(80) ].every((value) => zoneQueries.readDetectedTimeZone(value) === null));
check("the browser hook drops a UTC-only browser too", code(FILES.browserZoneHook).includes("zone && isPlaceTimeZone(zone) ? zone : null"));

console.log("\nHarmless before migration 220 (wiring)");

const record = tzq.slice(tzq.indexOf("export async function recordDetectedTimeZoneForNewCompany"), tzq.indexOf("export function readDetectedTimeZone"));
check("the sign-up zone is checked again at the write", record.includes("const detected = readDetectedTimeZone(input.detectedTimeZone);") && /if \(!detected\) \{\s*return;/.test(record));
check("it can only land on a company nobody has chosen for", record.includes('.is("timezone_set_at", null)'));
check("and only on one made in the last few minutes", record.includes('.gte(\n        "created_at"') || record.includes('.gte("created_at"'));
check("a missing column is not an error, and nothing here throws", record.includes("!isMissingDatabaseColumnError(error)") && record.includes("catch (recordError)"));
check("it writes with the person's own session (row level security decides)", record.includes("await createClient()") && !tzq.includes("createServiceRoleClient"));

const companies = code(FILES.companies);
const tzWrite = companies.slice(companies.indexOf("export async function updateCompanyTimezone"));
check("the confirm save marks the choice, and falls back to the zone alone when the column is missing", tzWrite.includes("timezone_set_at: new Date().toISOString()") && tzWrite.includes("isMissingDatabaseColumnError(error)") && tzWrite.includes("write({ timezone })"));
check("the profile save writes the zone by the shared rule", companies.includes("...companyTimeZoneColumnsForProfileSave(context.company, profile.timezone)") && !/\n\s*timezone: profile\.timezone,/.test(companies));

const home = code(FILES.home);
check("the dashboard asks only an owner or admin of a company that has not chosen", home.includes("canAccessCompanySettings(companyContext) &&") && home.includes('getCompanyTimeZoneChoice(companyContext.company) === "unconfirmed"') && home.includes("{askToConfirmTimeZone ? ("));
const settingsPage = code(FILES.settingsPage);
check("Settings > Company asks under the same condition", settingsPage.includes("canAccessCompanySettings(companyContext) &&") && settingsPage.includes('getCompanyTimeZoneChoice(company) === "unconfirmed"'));
check(
  "the profile form's zone box follows a zone saved elsewhere on the page, and keeps everything else typed",
  code(FILES.profileForm).includes("if (zoneOnRecord !== initialProfile.timezone) {") && code(FILES.profileForm).includes("setValues((previous) => ({ ...previous, timezone: initialProfile.timezone }));") && !code(FILES.settingsView).includes("key={`zone:"),
);

const steps = code(FILES.setupSteps);
check("step 1 shows the list only where the choice can be recorded", steps.includes('const asksZone = values.timeZoneChoice !== "unavailable";') && steps.includes("{asksZone ? ("));
check(
  "step 1 sends no zone where it did not ask, or when the choice on record was not touched",
  steps.includes('!asksZone || (values.timeZoneChoice === "chosen" && !zonePicked) ? {} : { timezone: shownZone, timezoneSource: zonePicked ? "picked" : "suggested" }') && steps.includes("saveShopStepAction({ ...contact, ...zoneToSend }, companyId)"),
);
check("step 1 says so when saving its suggestion would move the company's times", steps.includes("const suggestionMovesTimes = offersBrowserZone && browserZone !== values.timeZone;") && steps.includes("saving this step moves your schedule, reminders and due dates"));
check("step 1 offers the browser's zone only to a company that has not chosen", steps.includes('values.timeZoneChoice === "unconfirmed" && !zonePicked && browserZone !== null'));
check("the setup page passes the resolved zone and its choice", code(FILES.setupPage).includes("timeZone: company.timezone,") && code(FILES.setupPage).includes("timeZoneChoice: getCompanyTimeZoneChoice(company),"));

/* ------------------------------------------------------------- 5. the wall */
console.log("\nOnly an owner or admin changes it");
const settingsAction = code(FILES.settingsAction);
const tzAction = settingsAction.slice(settingsAction.indexOf("export async function updateCompanyTimezoneAction"));
check("the confirm action resolves the caller itself and checks settings access", tzAction.includes("requireCompanySettingsContext()") && tzAction.includes("assertCompanySettingsAccess(contextResult.context)"));
check("it refuses a card drawn for another company", tzAction.includes("expectedCompanyId !== contextResult.context.company.id"));
check("it checks the zone", tzAction.includes("validateCompanyTimezoneInput(timezone)"));
check("the query checks access and company again", tzWrite.includes("assertCompanySettingsAccess(context)") && tzWrite.includes("assertMatchingCompanyScope(context, companyId)"));
const settingsRevalidate = settingsAction.slice(settingsAction.indexOf("function revalidateCompanySettingsPaths"), settingsAction.indexOf("export async function updateCompanyBillingDefaultsAction"));
check("a confirmed zone redraws every page", settingsRevalidate.includes('revalidatePath("/", "layout")') && /updateCompanyTimezone\([\s\S]*revalidateCompanySettingsPaths\(\);\s*return \{ timezone: savedTimezone \};/.test(tzAction));

const setupAction = code(FILES.setupAction);
const shopAction = setupAction.slice(setupAction.indexOf("export async function saveShopStepAction"), setupAction.indexOf("export async function saveRateStepAction"));
check("step 1 goes through the setup's own gate (owner or admin, this company)", shopAction.includes("requireSetupContext(expectedCompanyId)"));
check("step 1 ignores a zone where the choice cannot be recorded", shopAction.includes("const zoneChoice = getCompanyTimeZoneChoice(context.company);") && shopAction.includes('"timezone" in input && zoneChoice !== "unavailable"'));
check("a suggestion never replaces a zone that was confirmed in the meantime", shopAction.includes('if (input.timezoneSource === "picked" || zoneChoice === "unconfirmed") chosenTimeZone = zone.timezone;'));
check("step 1 checks the zone by the rule Settings > Company uses", shopAction.includes("validateCompanyTimezoneInput(input.timezone)") && shopAction.includes('field: "timezone"'));
check(
  "a zone saved in step 1 redraws every page at once, before anything later in the step can fail",
  /const contactResult = await updateCompanyShopContact\(context\.company\.id, context, contact\.data, chosenTimeZone\);\s*if \(contactResult\.error\) return \{ error: contactResult\.error \};\s*if \(contactResult\.timeZoneWritten\) revalidatePath\("\/", "layout"\);/.test(shopAction) &&
    shopAction.indexOf('revalidatePath("/", "layout")') < shopAction.indexOf("updateCompanyBillingDefaults(context.company.id"),
);

const setupQueries = code(FILES.setupQueries);
const shopWrite = setupQueries.slice(setupQueries.indexOf("export async function updateCompanyShopContact"), setupQueries.indexOf("async function releaseTrashedSetupKeys"));
check("the step 1 write checks access and company", shopWrite.includes("assertBusinessNumbersAccess(context) ?? assertMatchingCompanyScope(context, companyId)"));
check("it writes the zone only together with its mark, and only where the column exists", shopWrite.includes('choice !== "unavailable"') && /columns\.timezone = chosenTimeZone;\s*columns\.timezone_set_at = new Date\(\)\.toISOString\(\);/.test(shopWrite) && (shopWrite.match(/columns\.timezone = /g) ?? []).length === 1);
check("it reports whether a zone was stored", shopWrite.includes("timeZoneWritten: columns.timezone !== undefined"));

console.log("\nZones outside the short list are named, and stay on the list");
const zoneList = await import("@/shared/lib/company-timezones");
check("a short-list zone keeps its plain name", zoneList.companyTimeZoneLabel("America/New_York") === "Eastern Time (US)");
check("any other is named by its city", zoneList.companyTimeZoneLabel("America/Detroit") === "Detroit (America/Detroit)" && zoneList.companyTimeZoneLabel("America/Indiana/Indianapolis") === "Indianapolis (America/Indiana/Indianapolis)" && zoneList.companyTimeZoneLabel("America/Puerto_Rico") === "Puerto Rico (America/Puerto_Rico)");
{
  const options = zoneList.getCompanyTimezoneSelectOptions("America/Detroit", "America/Denver", "America/Chicago", null, "America/Detroit");
  check("every zone passed in stays selectable, once", options.filter((o) => o.value === "America/Detroit").length === 1 && options.filter((o) => o.value === "America/Denver").length === 1 && options.length === zoneList.COMPANY_TIMEZONE_OPTIONS.length + 1);
}
check("both new lists keep the suggested and the current zone on the list", steps.includes("getCompanyTimezoneSelectOptions(browserZone, initial.timeZone, shownZone)") && code(FILES.prompt).includes("getCompanyTimezoneSelectOptions(browserZone, currentTimeZone, zone)"));

/* ----------------------------------------------------- new companies' zone */
console.log("\nA new company starts in its owner's zone");
check("the sign-up form sends the browser's zone", code(FILES.signUpForm).includes("<BrowserTimeZoneField />"));
check("so does the company setup form", code(FILES.companySetupForm).includes("<BrowserTimeZoneField />"));
const auth = code(FILES.authActions);
check("sign-up keeps it on the user for the emailed-link path, checked first", auth.includes('readDetectedTimeZone(formData.get("browserTimeZone"))') && auth.includes("{ time_zone: browserTimeZone }"));
check("every place a company is made records it", (auth.match(/recordDetectedTimeZoneForNewCompany\(/g) ?? []).length === 3 && code(FILES.postAuth).includes("recordDetectedTimeZoneForNewCompany("));
check("the emailed link records it before the context is read", (() => {
  const text = code(FILES.postAuth);
  const recordAt = text.indexOf("recordDetectedTimeZoneForNewCompany(");
  const contextAt = text.indexOf("companyContext = await getActiveCompanyContext({");
  return recordAt > 0 && contextAt > recordAt;
})());

/* ----------------------------------------------------------- the migration */
console.log("\nMigration 220");
const sql = read(FILES.migration);
const sqlCode = sql.replace(/^\s*--.*$/gm, "");
check("one transaction", /\bbegin;/.test(sqlCode) && /\bcommit;/.test(sqlCode));
check("adds the column, nullable, with no default", /alter table public\.companies\s+add column if not exists timezone_set_at timestamptz;/.test(sqlCode));
check("the column default of timezone is left alone", !/alter column timezone/i.test(sqlCode));
check(
  "marks as chosen only rows that cannot be the default or the fallback",
  /update public\.companies\s+set timezone_set_at = now\(\)\s+where timezone_set_at is null\s+and timezone not in \('America\/New_York', 'America\/Denver'\);/.test(sqlCode),
);
check("never rewrites a stored zone", !/set\s+timezone\s*=/.test(sqlCode));
check("touches no policy and no table grant", !/create policy|drop policy|alter policy/i.test(sqlCode) && !/on table public\.companies/i.test(sqlCode));
check("the types know the column", read(FILES.coreTables).includes("timezone_set_at?: Timestamp | null;"));

console.log("\nThe dashboard counts a job in the company's month");
const fnStart = sqlCode.indexOf("create or replace function public.get_company_report_daily_series(");
const fn = sqlCode.slice(fnStart, sqlCode.indexOf("$function$;", fnStart));
check("the function takes a zone, defaulting to UTC", /p_end_date date,\s+p_time_zone text default 'UTC'\s*\)/.test(fn));
check("no timestamp is still cast in a fixed zone", !/at time zone '/.test(fn) && (fn.match(/at time zone v_tz/g) ?? []).length === 17, (fn.match(/at time zone v_tz/g) ?? []).length);
check("a zone the server does not know falls back to UTC instead of failing", /perform now\(\) at time zone btrim\(p_time_zone\);[\s\S]*exception when others then\s+v_tz := 'UTC';/.test(fn));
check("still security definer with a pinned search_path", fn.includes("security definer") && fn.includes("set search_path = public, pg_temp"));
check("still checks membership and the reports permission", fn.includes("public.is_active_company_member(p_company_id)") && fn.includes("public.can_manage_billing(p_company_id) or public.can_dispatch_jobs(p_company_id)"));
check("the old three-argument function is dropped in the same transaction", /drop function if exists public\.get_company_report_daily_series\(uuid, date, date\);/.test(sqlCode) && sqlCode.indexOf("drop function") < fnStart);
check(
  "execute is revoked from public and anon and granted to authenticated and service_role",
  /revoke all on function public\.get_company_report_daily_series\(uuid, date, date, text\)\s+from public;/.test(sqlCode) &&
    /revoke all on function public\.get_company_report_daily_series\(uuid, date, date, text\)\s+from anon;/.test(sqlCode) &&
    /grant execute on function public\.get_company_report_daily_series\(uuid, date, date, text\)\s+to authenticated, service_role;/.test(sqlCode),
);

// The body is migration 170's with the zone swapped in, and nothing else.
const sql170 = read(FILES.migration170).replace(/^\s*--.*$/gm, "");
const fn170Start = sql170.indexOf("create or replace function public.get_company_report_daily_series(");
const fn170 = sql170.slice(fn170Start, sql170.indexOf("$function$;", fn170Start));
const squash = (text) => text.replace(/\s+/g, " ").trim();
const zoned170 = squash(fn170).replace(/at time zone 'UTC'/g, "at time zone v_tz");
const body220 = squash(fn)
  .replace(", p_time_zone text default 'UTC' )", " )")
  .replace(" v_tz text := 'UTC';", "")
  .replace(/ if p_time_zone is not null and btrim\(p_time_zone\) <> '' then begin perform now\(\) at time zone btrim\(p_time_zone\); v_tz := btrim\(p_time_zone\); exception when others then v_tz := 'UTC'; end; end if;/, "");
check("apart from the zone, the function is migration 170's, word for word", body220 === zoned170);

const aggregates = code(FILES.aggregates);
check("the series read passes the zone when given one", aggregates.includes("timeZone ? { ...args, p_time_zone: timeZone } : args"));
check("and asks again without it when the function does not take one yet", aggregates.includes("error && timeZone && error.code === NO_SUCH_FUNCTION") && aggregates.includes('const NO_SUCH_FUNCTION = "PGRST202";'));
check("the dashboard passes the company's zone", code(FILES.dashboardOverview).includes("{ timeZone },"));
check("the types know the argument is optional", read(FILES.dbTypes).includes("p_time_zone?: string;"));

/* ============================================================ the Reports page */
console.log("\nMigration 221: the Reports page's figures take the company's zone");
const sql221 = read(FILES.migration221);
const sql221Code = sql221.replace(/^\s*--.*$/gm, "");
const SUMMARY_OLD_ARGS = "uuid, date, date, date, date, date, timestamptz, integer";
const SUMMARY_NEW_ARGS = `${SUMMARY_OLD_ARGS}, text`;
const flat = (text) => text.replace(/\s+/g, " ");
const fn221Start = sql221Code.indexOf("create or replace function public.get_company_reports_summary(");
const fn221 = sql221Code.slice(fn221Start, sql221Code.indexOf("$function$;", fn221Start));
check("one transaction", /\bbegin;/.test(sql221Code) && /\bcommit;/.test(sql221Code));
check("the function takes a zone, last, defaulting to UTC", /p_limit integer default 5,\s+p_time_zone text default 'UTC'\s*\)/.test(fn221));
check("no timestamp is still cast in a fixed zone", !/at time zone '/.test(fn221) && (fn221.match(/at time zone v_tz/g) ?? []).length === 16, (fn221.match(/at time zone v_tz/g) ?? []).length);
check("a zone the server does not know falls back to UTC instead of failing", /perform now\(\) at time zone btrim\(p_time_zone\);[\s\S]*exception when others then\s+v_tz := 'UTC';/.test(fn221));
check("still security definer with a pinned search_path", fn221.includes("security definer") && fn221.includes("set search_path = public, pg_temp"));
check("still checks membership and the reports permission", fn221.includes("public.is_active_company_member(p_company_id)") && fn221.includes("public.can_manage_billing(p_company_id) or public.can_dispatch_jobs(p_company_id)"));
check(
  "the old eight-argument function is dropped first, in the same transaction",
  flat(sql221Code).includes(`drop function if exists public.get_company_reports_summary( ${SUMMARY_OLD_ARGS} );`) && sql221Code.indexOf("drop function") < fn221Start && sql221Code.indexOf("begin;") < sql221Code.indexOf("drop function"),
);
check(
  "execute is revoked from public and anon and granted to authenticated and service_role",
  flat(sql221Code).includes(`revoke all on function public.get_company_reports_summary( ${SUMMARY_NEW_ARGS} ) from public;`) &&
    flat(sql221Code).includes(`revoke all on function public.get_company_reports_summary( ${SUMMARY_NEW_ARGS} ) from anon;`) &&
    flat(sql221Code).includes(`grant execute on function public.get_company_reports_summary( ${SUMMARY_NEW_ARGS} ) to authenticated, service_role;`),
);
check("touches no table, no policy and no other function", !/alter table|create policy|drop policy|alter policy|create table/i.test(sql221Code) && (sql221Code.match(/create (or replace )?function/g) ?? []).length === 1);
check("the API is told to read its function list again", /notify pgrst, 'reload schema';/.test(sql221Code));

// The body is migration 169's with the zone swapped in, and nothing else.
const sql169 = read(FILES.migration169).replace(/^\s*--.*$/gm, "");
const fn169Start = sql169.indexOf("create or replace function public.get_company_reports_summary(");
const fn169 = sql169.slice(fn169Start, sql169.indexOf("$function$;", fn169Start));
const zoned169 = squash(fn169).replace(/at time zone 'UTC'/g, "at time zone v_tz");
const body221 = squash(fn221)
  .replace(", p_time_zone text default 'UTC' )", " )")
  .replace(" v_tz text := 'UTC';", "")
  .replace(/ if p_time_zone is not null and btrim\(p_time_zone\) <> '' then begin perform now\(\) at time zone btrim\(p_time_zone\); v_tz := btrim\(p_time_zone\); exception when others then v_tz := 'UTC'; end; end if;/, "");
check("apart from the zone, the function is migration 169's, word for word", body221 === zoned169);
check("the types know the summary's argument is optional", (read(FILES.dbTypes).match(/p_time_zone\?: string;/g) ?? []).length === 2);

console.log("\nA moment becomes a day on one calendar (executed)");
const reportTypes = await import("@/shared/types/reports");
const EVENING = "2026-11-01T03:30:00+00:00"; // 9:30 pm Oct 31 in Denver, 11:30 pm Oct 31 in New York
check(
  "a timestamp is the company's day with a zone, and the UTC day without one",
  reportTypes.toReportDateOnly(EVENING, DENVER) === "2026-10-31" &&
    reportTypes.toReportDateOnly(EVENING, NY) === "2026-10-31" &&
    reportTypes.toReportDateOnly(EVENING) === "2026-11-01" &&
    reportTypes.toReportDateOnly(EVENING, null) === "2026-11-01" &&
    reportTypes.toReportDateOnly(EVENING, "UTC") === "2026-11-01",
);
check(
  "a plain date is never shifted (payment, issue, due and purchase dates; the per-day series)",
  reportTypes.toReportDateOnly("2026-11-01", DENVER) === "2026-11-01" && reportTypes.toReportDateOnly("2026-01-01", "Pacific/Auckland") === "2026-01-01",
);
check(
  "bounds compare a timestamp on their own calendar",
  reportTypes.isDateWithinReportBounds(EVENING, { startDate: "2026-10-01", endDate: "2026-10-31", timeZone: DENVER }) &&
    !reportTypes.isDateWithinReportBounds(EVENING, { startDate: "2026-11-01", endDate: "2026-11-30", timeZone: DENVER }) &&
    reportTypes.isDateWithinReportBounds(EVENING, { startDate: "2026-11-01", endDate: "2026-11-30" }) &&
    !reportTypes.isDateWithinReportBounds(EVENING, { startDate: "2026-10-01", endDate: "2026-10-31" }),
);
check(
  "a value is bucketed on the day it was compared on",
  reportTypes.resolveReportChartBucketStart(EVENING, "month", DENVER) === "2026-10-01" && reportTypes.resolveReportChartBucketStart(EVENING, "month") === "2026-11-01" && reportTypes.resolveReportChartBucketStart(EVENING, "day", NY) === "2026-10-31",
);

const eveningNow = new Date("2026-11-01T03:30:00.000Z");
const serverToday = `${eveningNow.getFullYear()}-${String(eveningNow.getMonth() + 1).padStart(2, "0")}-${String(eveningNow.getDate()).padStart(2, "0")}`;
check("with a zone, today is the company's today", same(reportTypes.resolveReportDayBasis(DENVER, eveningNow), { timeZone: DENVER, today: "2026-10-31" }) && same(reportTypes.resolveReportDayBasis(" America/New_York ", eveningNow), { timeZone: NY, today: "2026-10-31" }));
check(
  "without one (or with one this runtime does not know), the old rule: the server's own today, UTC days",
  [undefined, null, "", "   ", "Mars/Olympus"].every((zone) => same(reportTypes.resolveReportDayBasis(zone, eveningNow), { timeZone: null, today: serverToday })),
);
const denverBasis = { timeZone: DENVER, today: "2026-11-27" };
const oldBasis = { timeZone: null, today: "2026-11-27" };
check("the period ends on the basis's today and carries its zone", same(reportTypes.resolveReportPageDateBounds("30d", denverBasis), { startDate: "2026-10-29", endDate: "2026-11-27", timeZone: DENVER }) && same(reportTypes.resolveReportPageDateBounds("ytd", denverBasis), { startDate: "2026-01-01", endDate: "2026-11-27", timeZone: DENVER }));
check("on the old rule the period is the plain pair of dates it always was", same(reportTypes.resolveReportPageDateBounds("30d", oldBasis), { startDate: "2026-10-29", endDate: "2026-11-27" }));
check(
  "on the old rule the period is what the unchanged helper gives for the same day",
  same(reportTypes.resolveReportPageDateBounds("90d", reportTypes.resolveReportDayBasis(null, eveningNow)), reportTypes.resolveProfitabilityReportDateBounds("90d", eveningNow)) &&
    same(reportTypes.resolveReportPageDateBounds("ytd", reportTypes.resolveReportDayBasis(null, eveningNow)), reportTypes.resolveProfitabilityReportDateBounds("ytd", eveningNow)),
);

const reportMetrics = await import("@/shared/lib/reports/report-metrics");
const chartSeriesModule = await import("@/shared/lib/reports/chart-series");
const chartAggregates = await import("@/shared/lib/reports/chart-series-aggregates");
const metricsAggregates = await import("@/shared/lib/reports/report-metrics-aggregates");
check("the period before is counted on the same calendar", same(reportMetrics.resolvePreviousReportDateBounds({ startDate: "2026-10-29", endDate: "2026-11-27", timeZone: DENVER }), { startDate: "2026-09-29", endDate: "2026-10-28", timeZone: DENVER }) && same(reportMetrics.resolvePreviousReportDateBounds({ startDate: "2026-10-29", endDate: "2026-11-27" }), { startDate: "2026-09-29", endDate: "2026-10-28" }));

// Two jobs finished at 03:30 UTC on the first of a month: one on November 1
// (October 31 for the company) and one on January 1 (December 31 of the year
// before, so outside "year to date" altogether).
const job = (id, completedAt) => ({ id, status: "completed", jobType: "Repair", customerId: "c1", scheduledDate: completedAt, completedAt });
const rows = {
  invoices: [],
  payments: [],
  estimates: [],
  expenses: [],
  leads: [],
  laborEntries: [],
  laborCostRates: new Map(),
  jobs: [job("nov", EVENING), job("jan", "2026-01-01T03:30:00+00:00")],
};
const monthOf = (bundle, month) => bundle.jobs.series.find((s) => s.key === "completed").points.find((p) => p.bucketStart === month)?.value;
const figuresFor = (dayBasis) => {
  const chartSeries = chartSeriesModule.buildReportChartSeriesBundle(rows, { dateRange: "ytd", dayBasis });
  const page = reportMetrics.buildReportsPageData({ companyName: "Proof", dateRange: "ytd", datasets: { ...rows, chartSeries }, showTechnicianProfitability: false, dayBasis });
  return { chartSeries, page, completed: page.salesFunnel.find((s) => s.key === "completed").count };
};
const onCompany = figuresFor(denverBasis);
const onOld = figuresFor(oldBasis);
check("company calendar, the figure: the November 1 job counts, the January 1 job is last year's", onCompany.completed === 1, onCompany.completed);
check("company calendar, the chart: it is in October, not November", monthOf(onCompany.chartSeries, "2026-10-01") === 1 && monthOf(onCompany.chartSeries, "2026-11-01") === 0 && monthOf(onCompany.chartSeries, "2026-01-01") === 0);
check("old rule, the figure: both count, as before", onOld.completed === 2, onOld.completed);
check("old rule, the chart: November and January, as before", monthOf(onOld.chartSeries, "2026-11-01") === 1 && monthOf(onOld.chartSeries, "2026-10-01") === 0 && monthOf(onOld.chartSeries, "2026-01-01") === 1);
const noBasis = chartSeriesModule.buildReportChartSeriesBundle(rows, { dateRange: "ytd" });
check("no basis at all is the old rule (every other caller of these builders)", same(noBasis.meta.dateBounds, reportTypes.resolveReportDateBounds("ytd")) && !("timeZone" in noBasis.meta.dateBounds));
check("the figures and the charts state the same period", same(onCompany.page.dateBounds, onCompany.chartSeries.meta.dateBounds) && same(onCompany.page.accountantSummary.dateBounds, onCompany.page.dateBounds) && same(onOld.page.dateBounds, onOld.chartSeries.meta.dateBounds));

// The page itself reads per-day totals the database already put on the
// company's calendar. They must land where they are and not move again.
const emptySeries = { authorized: true, payments: [], invoiced: [], openAr: [], overdueAr: [], expenses: [], labor: [], estimates: [], flags: { expenseCreatedDateFallback: false, jobScheduledCompletionFallback: false, openLaborExcluded: false } };
const fromDatabase = chartAggregates.buildReportChartSeriesFromDailySeries({ ...emptySeries, jobs: [{ d: "2026-10-31", scheduled: 0, completed: 1 }] }, { dateRange: "ytd", dayBasis: denverBasis });
check("a day the database returned is not shifted a second time", monthOf(fromDatabase, "2026-10-01") === 1 && monthOf(fromDatabase, "2026-11-01") === 0);
const emptyAggregate = {
  authorized: true,
  payments: { collectedInBounds: 0, countInBounds: 0, collectedInPrev: 0, countInPrev: 0, lifetimeTotal: 0 },
  paymentsByMethod: [],
  invoices: { activePaidSum: 0, activeNotOverdueOutstanding: 0, activeOverdueTotal: 0, activeOutstandingTotal: 0, activeUnpaidCount: 0, scopedInvoiceTotal: 0, paidInBoundsCount: 0 },
  invoiceAging: [],
  estimates: { sentInBounds: 0, approvedInBounds: 0, sentInPrev: 0, approvedInPrev: 0 },
  jobs: { completedInBounds: 1, completionSampleCount: 0, completionHoursTotal: 0, topTechnicianId: null, topTechnicianCount: null, topTechnicianName: null, topTechnicianEmail: null },
  expenses: { scopedApprovedReimbursedTotal: 0 },
  salesTaxCollected: 0,
  topCustomers: [],
  serviceCategories: [],
  overdueInvoices: [],
  technicians: [],
  customerHealth: { repeatCustomerCount: 0, totalCustomerCount: 0 },
  leads: { totalLeads: 0, wonLeads: 0, lostLeads: 0, followUpsDue: 0 },
  leadSources: [],
};
const pageFromDatabase = metricsAggregates.buildReportsPageDataFromAggregates({ companyName: "Proof", dateRange: "ytd", aggregate: emptyAggregate, chartSeries: fromDatabase, laborCostRates: new Map(), showTechnicianProfitability: false, dayBasis: denverBasis });
check("the page built from the database states the period it asked the database for", same(pageFromDatabase.dateBounds, reportTypes.resolveReportPageDateBounds("ytd", denverBasis)) && same(pageFromDatabase.dateBounds, fromDatabase.meta.dateBounds));

console.log("\nBoth halves of the page fall back together (executed)");
const dayBasisModule = await import("@/shared/lib/reports/report-day-basis");
{
  const asked = [];
  const result = await dayBasisModule.loadOnReportDayBasis(DENVER, async (basis) => { asked.push(basis); return { basis, timeZoneUnsupported: false }; }, eveningNow);
  check("the database takes a zone: asked once, on the company's calendar", asked.length === 1 && same(asked[0], { timeZone: DENVER, today: "2026-10-31" }) && result.basis === asked[0]);
}
{
  const asked = [];
  const result = await dayBasisModule.loadOnReportDayBasis(DENVER, async (basis) => { asked.push(basis); return { basis, timeZoneUnsupported: basis.timeZone !== null }; }, eveningNow);
  check("a function cannot take a zone yet: everything is asked again on the old calendar, with its own today", asked.length === 2 && same(asked[1], { timeZone: null, today: serverToday }) && result.basis === asked[1]);
}
{
  const asked = [];
  await dayBasisModule.loadOnReportDayBasis(DENVER, async (basis) => { asked.push(basis); return { basis, timeZoneUnsupported: true }; }, eveningNow);
  check("it never asks a third time", asked.length === 2);
}
{
  const asked = [];
  await dayBasisModule.loadOnReportDayBasis(undefined, async (basis) => { asked.push(basis); return { basis, timeZoneUnsupported: false }; }, eveningNow);
  check("no zone known: asked once, on the old calendar", asked.length === 1 && asked[0].timeZone === null);
}

console.log("\nThe Reports page is wired to that rule");
const loader = code(FILES.reportsLoader);
const loadFn = loader.slice(loader.indexOf("async function loadReportAggregates"), loader.indexOf("export async function getReportsPageData"));
check("the period comes from the basis", loadFn.includes("const dateBounds = resolveReportPageDateBounds(dateRange, basis);"));
check("the aging reference date is the basis's today", loadFn.includes("today: basis.today,") && !loader.includes("resolveAgingReferenceDate"));
check("the period before is derived from the same bounds", loadFn.includes("previousBounds: resolvePreviousReportDateBounds(dateBounds),"));
check("the figures and the per-day series are given the same zone", (loadFn.match(/\btimeZone,\n/g) ?? []).length === 2 && loadFn.includes("const timeZone = basis.timeZone ?? undefined;"));
check("the per-day series does not fall back by itself here", loadFn.includes("fallBackToUtcDays: false,"));
check("either function refusing a zone sends both back", loadFn.includes("summary.timeZoneUnsupported || dailySeries.timeZoneUnsupported"));
const pageFn = loader.slice(loader.indexOf("export async function getReportsPageData"));
check("the page loads through the one rule, with the company's zone", pageFn.includes("loadOnReportDayBasis(") && pageFn.includes("options.timeZone,"));
check("the builders get the basis the database actually counted on", pageFn.includes("const { basis: dayBasis, summary, dailySeries } = aggregates;") && (pageFn.match(/\n\s+dayBasis,\n/g) ?? []).length === 2);
check("nothing in the loader works out a date by itself", !/resolveReportDateBounds\(|resolveProfitabilityReportDateBounds\(|getFullYear\(|toISOString\(/.test(loader));
check("the Reports page passes the company's resolved zone as it is", code(FILES.reportsPage).includes("timeZone: companyContext.company.timezone,"));
check("so does the tax summary opened from it", code(FILES.taxSummaryPage).includes("timeZone: companyContext.company.timezone,"));
check("so does the AI summary of the same report", code(FILES.reportsAi).includes("timeZone: context.company.timezone,"));

const summaryRead = aggregates.slice(aggregates.indexOf("export async function getCompanyReportsSummary"), aggregates.indexOf("export async function getCompanyReportDailySeries"));
check("the summary read passes the zone when given one", summaryRead.includes("timeZone ? { ...args, p_time_zone: timeZone } : args"));
check(
  "when the function does not take one yet it says so, and does not retry with the company's dates",
  /if \(error && timeZone && error\.code === NO_SUCH_FUNCTION\) \{\s*return \{\s*data: null,\s*ok: false,\s*errorCode: error\.code,\s*timeZoneUnsupported: true,\s*\};\s*\}/.test(summaryRead) && (summaryRead.match(/supabase\.rpc\(/g) ?? []).length === 1,
);
check("that answer is not reported as a fault", summaryRead.indexOf("timeZoneUnsupported: true") < summaryRead.indexOf("reportFailure("));
const seriesRead = aggregates.slice(aggregates.indexOf("export async function getCompanyReportDailySeries"));
check("the series read answers the same way only when asked not to fall back (the dashboard still does)", seriesRead.includes("if (options.fallBackToUtcDays === false) {") && seriesRead.indexOf("options.fallBackToUtcDays === false") < seriesRead.lastIndexOf('"get_company_report_daily_series"') && !code(FILES.dashboardOverview).includes("fallBackToUtcDays"));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
