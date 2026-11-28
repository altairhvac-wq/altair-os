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
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-company-timezone.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadPureModule } from "./lib/load-pure-module.mjs";

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

// Every read of the stored zone outside the context goes through the helper
// that knows about the missing column.
const rawReaders = sources.filter((path) => {
  if (path === FILES.timezoneQueries || path === FILES.companies) return false;
  return /\.select\(\s*["'`][^"'`]*\btimezone\b/.test(code(path));
});
check("no query selects companies.timezone by itself", rawReaders.length === 0, rawReaders);
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
check("the row read asks again without the column when it is missing", tzq.includes("isMissingDatabaseColumnError(withChoice.error)") && tzq.includes(".select(COMPANY_TIMEZONE_COLUMNS_LEGACY)"));
check("a failed lookup still resolves (to the fallback), it never throws", tzq.includes("return resolveCompanyTimeZone(fields);"));
check("server-only", read(FILES.timezoneQueries).startsWith('import "server-only";'));

const record = tzq.slice(tzq.indexOf("export async function recordDetectedTimeZoneForNewCompany"), tzq.indexOf("export function readDetectedTimeZone"));
check("the sign-up zone is checked before it is written", record.includes("isValidIanaTimeZone(detected)"));
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
check("the profile form remounts when the zone changes under it", code(FILES.settingsView).includes("key={`zone:${companyProfile.timezone}`}"));

const steps = code(FILES.setupSteps);
check("step 1 shows the list only where the choice can be recorded", steps.includes('const asksZone = values.timeZoneChoice !== "unavailable";') && steps.includes("{asksZone ? ("));
check("step 1 sends a zone only when it asked for one", steps.includes("asksZone ? { ...contact, timezone: shownZone } : contact"));
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
check("a new zone redraws every page", settingsAction.includes('revalidatePath("/", "layout")'));

const setupAction = code(FILES.setupAction);
const shopAction = setupAction.slice(setupAction.indexOf("export async function saveShopStepAction"), setupAction.indexOf("export async function saveRateStepAction"));
check("step 1 goes through the setup's own gate (owner or admin, this company)", shopAction.includes("requireSetupContext(expectedCompanyId)"));
check("step 1 ignores a zone where the choice cannot be recorded", shopAction.includes('"timezone" in input && getCompanyTimeZoneChoice(context.company) !== "unavailable"'));
check("step 1 checks the zone by the rule Settings > Company uses", shopAction.includes("validateCompanyTimezoneInput(input.timezone)") && shopAction.includes('field: "timezone"'));
check("a zone saved in step 1 redraws every page", setupAction.includes('if (options.timeZoneChanged) revalidatePath("/", "layout");'));

const setupQueries = code(FILES.setupQueries);
const shopWrite = setupQueries.slice(setupQueries.indexOf("export async function updateCompanyShopContact"), setupQueries.indexOf("async function releaseTrashedSetupKeys"));
check("the step 1 write checks access and company", shopWrite.includes("assertBusinessNumbersAccess(context) ?? assertMatchingCompanyScope(context, companyId)"));
check("it writes the zone only together with its mark, and only where the column exists", shopWrite.includes('choice !== "unavailable"') && shopWrite.includes("columns.timezone = chosenTimeZone;") && shopWrite.includes("columns.timezone_set_at = new Date().toISOString();"));

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
check("and asks again without it when the function does not take one yet", aggregates.includes('error && timeZone && error.code === "PGRST202"'));
check("the dashboard passes the company's zone", code(FILES.dashboardOverview).includes("{ timeZone },"));
check("the types know the argument is optional", read(FILES.dbTypes).includes("p_time_zone?: string;"));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
