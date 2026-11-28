/**
 * Settings > Integrations, the page a customer company reads.
 *
 * ===================== WHAT THIS HOLDS TOGETHER =====================
 * The page makes three promises, and nothing but a check like this would
 * notice if one of them quietly stopped being true:
 *
 *   1. IT NEVER CLAIMS A CONNECTION. Everything under "Not available yet" is
 *      something Altair does not do. No Connect button, no promise, and the
 *      public "not yet" list still says the same thing.
 *   2. A REQUEST IS REMEMBERED. A request is stored as text in the feedback
 *      table and read back by parsing that text. The writer and the reader
 *      are run against each other here, for every entry in the catalog.
 *   3. THE WALL. The request action checks the signed-in company and
 *      permission itself; the read-back (service role) is pinned to one
 *      company and to request rows only; the founder's marketing channels
 *      are loaded for platform admins and nobody else.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-customer-integrations.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
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

const FILES = {
  types: "shared/types/customer-integrations.ts",
  query: "lib/database/queries/integration-requests.ts",
  action: "app/actions/integration-requests.ts",
  page: "app/(admin)/settings/integrations/page.tsx",
  view: "shared/components/settings/integrations/IntegrationsPageView.tsx",
  form: "shared/components/settings/integrations/IntegrationRequestForm.tsx",
  marketing: "shared/components/settings/integrations/MarketingChannelIntegrations.tsx",
  nav: "shared/components/settings/SettingsNavigation.tsx",
  layout: "app/(admin)/settings/layout.tsx",
  notYet: "shared/lib/site/not-yet.ts",
  feedbackMigration: "supabase/migrations/059_beta_feedback_reports.sql",
};

console.log("\nFiles exist");
for (const [name, path] of Object.entries(FILES)) check(`${name}: ${path}`, existsSync(path));

const types = await loadPureModule(FILES.types, "customer-integrations");
const {
  PLANNED_INTEGRATIONS,
  PLANNED_INTEGRATION_GROUPS,
  INTEGRATION_REQUEST_PAGE_URL,
  INTEGRATION_REQUEST_NOTE_MAX_LENGTH,
  normalizeIntegrationRequest,
  buildIntegrationRequestMessage,
  parseIntegrationRequestMessage,
  summarizeIntegrationRequests,
  describeCardPaymentsConnection,
} = types;

/* ------------------------------------------------------------------ */
console.log("\nThe catalog");
const keys = PLANNED_INTEGRATIONS.map((item) => item.key);
const labels = PLANNED_INTEGRATIONS.map((item) => item.label);
const groupIds = new Set(PLANNED_INTEGRATION_GROUPS.map((group) => group.id));
check("keys are unique", new Set(keys).size === keys.length);
check("labels are unique", new Set(labels).size === labels.length);
check("every entry belongs to a listed group", PLANNED_INTEGRATIONS.every((item) => groupIds.has(item.group)));
check("every group has at least one entry", PLANNED_INTEGRATION_GROUPS.every((group) => PLANNED_INTEGRATIONS.some((item) => item.group === group.id)));
const formerLabels = PLANNED_INTEGRATIONS.flatMap((item) => item.formerLabels ?? []);
check("no label, current or former, contains the separator or a line break", [...labels, ...formerLabels].every((label) => !label.includes(" | ") && !/[\n\r|]/.test(label)));
check("a former label never collides with another entry's name", new Set([...labels, ...formerLabels]).size === labels.length + formerLabels.length);
check(
  "every description says what it WOULD do, never what it does",
  PLANNED_INTEGRATIONS.every((item) => /\b(would|could)\b/.test(item.wouldDo) || /^The same,/.test(item.wouldDo)),
  PLANNED_INTEGRATIONS.filter((item) => !/\b(would|could)\b/.test(item.wouldDo)).map((item) => item.key),
);
const allCopy = PLANNED_INTEGRATIONS.map((item) => `${item.label} ${item.wouldDo}`).join(" ");
check("no partnership, certification or date is implied", !/\b(partner|certified|official|coming soon|soon|next month|Q[1-4]|202\d)\b/i.test(allCopy));
check('never "Altair OS", never "free"', !/Altair OS\b/.test(allCopy) && !/\bfree\b/i.test(allCopy));
check("accounting comes first, QuickBooks Desktop first of all", PLANNED_INTEGRATION_GROUPS[0].id === "accounting" && PLANNED_INTEGRATIONS[0].key === "quickbooks_desktop");
check("QuickBooks Online shipped, so it is not listed as not available", !PLANNED_INTEGRATIONS.some((item) => item.key === "quickbooks_online"));

/* ------------------------------------------------------------------ */
console.log("\nA request is written and read back");
for (const item of PLANNED_INTEGRATIONS) {
  const message = buildIntegrationRequestMessage({ keys: [item.key], note: "" });
  const back = parseIntegrationRequestMessage(message);
  check(`round trip: ${item.key}`, back.length === 1 && back[0] === item.key, { message, back });
}
{
  const message = buildIntegrationRequestMessage({ keys, note: "We also use a spreadsheet." });
  const back = parseIntegrationRequestMessage(message);
  check("round trip: every key at once, with a note", JSON.stringify(back) === JSON.stringify(keys), back);
  check("the note is on its own line and is not read as a name", message.split("\n").length === 3 && message.includes("In their words: We also use a spreadsheet."));
}
{
  const noteOnly = buildIntegrationRequestMessage({ keys: [], note: "Asked for: QuickBooks Online" });
  check(
    "a note cannot forge a request line (it is one line, behind its own prefix)",
    parseIntegrationRequestMessage(noteOnly).length === 0,
    noteOnly,
  );
  check("an ordinary feedback message reads as no request", parseIntegrationRequestMessage("The invoice page is slow.").length === 0);
}

console.log("\nWhat the browser sends is not trusted");
{
  const cleaned = normalizeIntegrationRequest({
    keys: ["xero", "not_a_real_one", "xero", 7, null, "quickbooks_desktop"],
    note: `  line one\n\nAsked for: Zapier   ${"x".repeat(900)}`,
  });
  check("unknown and repeated keys are dropped, order is the catalog's", JSON.stringify(cleaned.keys) === JSON.stringify(["quickbooks_desktop", "xero"]), cleaned.keys);
  check("the note is flattened to one line and cut to the limit", !/\n/.test(cleaned.note) && cleaned.note.length === INTEGRATION_REQUEST_NOTE_MAX_LENGTH && cleaned.note.startsWith("line one Asked for: Zapier"));
  const junk = normalizeIntegrationRequest({ keys: "quickbooks_desktop", note: { a: 1 } });
  check("a non-list and a non-text note become nothing", junk.keys.length === 0 && junk.note === "");
  const stored = buildIntegrationRequestMessage(cleaned);
  check("a line break smuggled in a note still cannot add a name", JSON.stringify(parseIntegrationRequestMessage(stored)) === JSON.stringify(["quickbooks_desktop", "xero"]));
}

console.log("\nWhat a company has asked for");
{
  const now = "2026-11-27T18:00:00.000Z";
  const rows = [
    { message: buildIntegrationRequestMessage({ keys: ["quickbooks_desktop"], note: "" }), createdAt: "2026-11-27T17:00:00.000Z" },
    { message: buildIntegrationRequestMessage({ keys: ["quickbooks_desktop", "zapier"], note: "" }), createdAt: "2026-11-20T10:00:00.000Z" },
    { message: buildIntegrationRequestMessage({ keys: [], note: "payroll please" }), createdAt: "2026-11-27T01:00:00.000Z" },
  ];
  const summary = summarizeIntegrationRequests(rows, now);
  check("the earliest request for a key keeps its date", summary.requestedAt.quickbooks_desktop === "2026-11-20T10:00:00.000Z" && summary.requestedAt.zapier === "2026-11-20T10:00:00.000Z");
  check("only the last 24 hours count towards the daily limit", summary.sentInLastDay === 2, summary.sentInLastDay);
  check("no rows means nothing asked for", Object.keys(summarizeIntegrationRequests([], now).requestedAt).length === 0);
}

/* ------------------------------------------------------------------ */
console.log("\nCard payments: the status shown is the status stored");
{
  const state = (status, onlinePaymentsEnabled, readyToCharge) => describeCardPaymentsConnection({ status, onlinePaymentsEnabled, readyToCharge });
  check("never set up reads as not set up", describeCardPaymentsConnection(null).statusLabel === "Not set up" && state("not_connected", false, false).statusLabel === "Not set up");
  check('only an active account that can charge, with payments on, reads "Connected"', state("active", true, true).statusLabel === "Connected" && state("active", true, true).tone === "success");
  check("active but switched off does not read as plain Connected", state("active", false, true).statusLabel !== "Connected" && state("active", false, true).tone !== "success");
  check(
    "active on paper but not able to charge (capability pending, onboarding unfinished) is not shown as working",
    [true, false].every((enabled) => {
      const row = state("active", enabled, false);
      return row.tone === "warning" && !/Connected/.test(row.statusLabel);
    }),
  );
  for (const status of ["pending", "restricted", "disabled", "error"]) {
    for (const enabled of [true, false]) {
      for (const ready of [true, false]) {
        const row = state(status, enabled, ready);
        check(`${status}${enabled ? ", payments flag on" : ""}${ready ? ", ready flag on" : ""} is never shown as working`, row.tone !== "success" && !/Connected/.test(row.statusLabel), row);
      }
    }
  }
  const hidden = describeCardPaymentsConnection("hidden");
  check("someone who may not see payments gets no status at all", hidden.tone === "neutral" && !/Connected|Not set up/.test(hidden.statusLabel));
  const pageSource = read(FILES.page);
  check(
    "the page works out 'can charge' with the Billing page's own helpers and the checkout's conditions",
    /buildStripePaymentSettingsSummary\(/.test(pageSource) &&
      /getCardPaymentsDisplayStatus\(summary\) === "active"/.test(pageSource) &&
      ["summary.chargesEnabled", "summary.payoutsEnabled", "summary.hasProviderAccountId", "summary.onboardingCompletedAt !== null", "summary.disabledAt === null"].every((part) => pageSource.includes(part)),
  );
}

/* ------------------------------------------------------------------ */
console.log("\nThe wall");
const action = read(FILES.action);
const query = read(FILES.query);
const page = read(FILES.page);
const actionBody = action.slice(action.indexOf("export async function requestIntegrationsAction"));
check('the action file is "use server"', /^"use server";/.test(action));
check(
  "the action resolves the user, the company and the permission before it writes",
  actionBody.indexOf("getCurrentUser()") > -1 &&
    actionBody.indexOf("getActiveCompanyContext()") > -1 &&
    actionBody.indexOf("assertCompanySettingsAccess(context)") > -1 &&
    actionBody.indexOf("assertCompanySettingsAccess(context)") < actionBody.indexOf("createBetaFeedbackReport(") &&
    actionBody.indexOf("assertCompanySettingsAccess(context)") < actionBody.indexOf("listCompanyIntegrationRequests("),
);
check("the company comes from the signed-in context, never from the form", /const companyId = context\.company\.id;/.test(actionBody) && !/input\.companyId|companyId: input|companyId = expectedCompanyId/.test(actionBody));
check(
  "a page loaded for another company is refused before anything is read or written",
  /if \(expectedCompanyId !== companyId\) \{\s*return \{/.test(actionBody) &&
    actionBody.indexOf("expectedCompanyId !== companyId") < actionBody.indexOf("listCompanyIntegrationRequests(") &&
    /requestIntegrationsAction\(\s*\{ keys: \[\.\.\.pendingKeys\], note \},\s*companyId,\s*\)/.test(read(FILES.form)),
);
check("a refused repeat re-reads the page, so the ticked boxes turn into 'You asked for this'", /if \(request\.keys\.length > 0\) \{[\s\S]{0,260}?revalidatePath\("\/settings\/integrations"\);\s*return \{\s*error:/.test(actionBody));
check("what the browser sent goes through normalizeIntegrationRequest first", actionBody.indexOf("normalizeIntegrationRequest(") < actionBody.indexOf("buildIntegrationRequestMessage("));
check("a key already on record is not stored again", /request\.keys\.filter\(\(key\) => !existing\.requestedAt\[key\]\)/.test(actionBody));
check("the daily limit is checked before the write", actionBody.indexOf("INTEGRATION_REQUEST_DAILY_LIMIT") > -1 && actionBody.indexOf("INTEGRATION_REQUEST_DAILY_LIMIT") < actionBody.indexOf("createBetaFeedbackReport("));
check("the row is marked as a request by its page_url", /pageUrl: INTEGRATION_REQUEST_PAGE_URL/.test(actionBody) && INTEGRATION_REQUEST_PAGE_URL === "/settings/integrations#request");
check("the only email is the founder's feedback alert (nothing goes to a customer)", /sendFeedbackAlertEmail\(/.test(action) && !/sendViaResend|billing-send|sendTeamInvite|\bsendSms|lib\/sms/i.test(action.replace(/sendFeedbackAlertEmail/g, "")));
check("the alert goes to the support inbox, and a request has its own subject line", /to: getFeedbackAlertRecipient\(\)/.test(read("lib/email/feedback-alert.ts")) && /input\.kind === "integration_request"\s*\? `Altair integration request from \$\{company\}`/.test(read("lib/email/feedback-alert.ts")) && /kind: "integration_request"/.test(actionBody));
check("the reply promises nothing", !/\b(coming|soon|will be|we will build|on the way)\b/i.test(actionBody.replace(/\/\/.*$/gm, "")));

check('the read-back is server-only and pinned to one company and to request rows', /^import "server-only";/.test(query) && /\.eq\("company_id", companyId\)\s*\.eq\("page_url", INTEGRATION_REQUEST_PAGE_URL\)/.test(query));
const queryCode = query.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
check("the read-back selects the message, its date and its author's id, and never an email or device", /\.select\("message, created_at, user_id"\)/.test(queryCode) && !/user_email|user_agent|user_role/.test(queryCode));
check(
  "a row counts only when its author is an active owner or admin of this company today",
  /\.from\("company_memberships"\)\s*\.select\("user_id"\)\s*\.eq\("company_id", companyId\)\s*\.eq\("status", "active"\)\s*\.in\("role", \["owner", "admin"\]\)/.test(queryCode) &&
    /\.filter\(\(row\) => row\.user_id !== null && mayRequest\.has\(row\.user_id\)\)/.test(queryCode),
);
check("the author's id never leaves the read-back", /\.map\(\(row\) => \(\{\s*message: row\.message,\s*createdAt: row\.created_at,\s*\}\)\)/.test(queryCode));
check("the read-back is bounded", /\.limit\(REQUEST_ROW_LIMIT\)/.test(query));
check("a failed read-back shows nothing asked for, never an error or another company's rows", /if \(reports\.error \|\| roster\.error\) \{[\s\S]{0,400}?return NO_INTEGRATION_REQUESTS;/.test(queryCode) && /catch \(error\) \{[\s\S]{0,300}?return NO_INTEGRATION_REQUESTS;/.test(queryCode));
{
  // Every migration, not just the one that made the table: a later one could add a read policy.
  const offenders = readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .filter((file) => {
      const sql = read(`supabase/migrations/${file}`).toLowerCase();
      return (
        /on\s+(public\.)?beta_feedback_reports\s+for\s+(select|all)\b[\s\S]{0,80}?to\s+authenticated/.test(sql) ||
        /grant\s+(select|all)[^;]*on\s+(table\s+)?(public\.)?beta_feedback_reports\s+to\s+(authenticated|anon)/.test(sql)
      );
    });
  check("no migration lets a signed-in person read the feedback table (the service role is the only reader)", offenders.length === 0, offenders);
}

check("the page checks settings access itself before the service-role read", page.indexOf("canAccessCompanySettings(companyContext)") > -1 && page.indexOf("canAccessCompanySettings(companyContext)") < page.indexOf("listCompanyIntegrationRequests(company.id"));
check("the marketing channels are loaded for platform admins only", /companyContext\.isPlatformAdmin\s*\?\s*searchParams\.then\(\(params\) =>\s*loadMarketingChannels\(companyContext, params\),?\s*\)\s*:\s*Promise\.resolve\(null\)/.test(page) && (page.match(/loadMarketingChannels\(/g) ?? []).length === 2);
check("payment status is read only for someone who may see billing", /canSeePayments\s*\?\s*getCompanyPaymentAccount\(company\.id, "stripe"\)\s*:\s*Promise\.resolve\(null\)/.test(page) && /: "hidden",/.test(page));
check("the settings area is still owner and admin only", /canAccessCompanySettings\(companyContext\)/.test(read(FILES.layout)));

/* ------------------------------------------------------------------ */
console.log("\nThe page keeps its word");
const view = read(FILES.view);
const form = read(FILES.form);
const customerUi = `${view}\n${form}`.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
check("nothing a customer sees is a Connect button", !/>\s*(Connect|Reconnect|Enable|Sync now)\s*</.test(customerUi) && !/connectPath|authorize/.test(customerUi));
check('the planned list sits under "Not available yet"', /title="Not available yet"/.test(view) && /Altair does not connect to any of these today\./.test(view));
check("the page says a listed name is not a partnership", /does not mean\s+Altair works with that company or is endorsed by it/.test(view));
check("sending is described as asking, not switching on", /It does not turn anything on\./.test(form));
{
  // Every sentence a customer can read: the page, the form, and the status
  // and catalog text in the types module.
  const typesSource = read(FILES.types).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const strings = [...`${customerUi}\n${typesSource}`.matchAll(/"([^"\n]{12,})"|>\s*([A-Z][^<>{}\n]{12,})\s*</g)].map((match) => match[1] ?? match[2]);
  const promising = strings.filter((text) => /\b(coming soon|coming|soon|until altair|we will|we'll|will be (added|available|built)|gets built|on the way|planned for|roadmap)\b/i.test(text));
  check("no sentence on the page says or implies that something is on its way", strings.length > 40 && promising.length === 0, promising);
  check("an already-sent request reads as a request, not as a feature Altair has", /We have your request\./.test(form) && !/We have it\./.test(`${form}\n${action}`));
}
check("the tax summary line states the periods that really exist and points at Reports, where the period is picked", /for the last 7, 30 or 90 days or the year to date/.test(view) && /href: "\/reports" \}/.test(view) && ["7d", "30d", "90d", "ytd"].every((value) => read("shared/types/reports-page.ts").includes(`value: "${value}"`)));
check("a connect result for a platform admin is shown at the top, and the channels can be jumped to", /platformAdminNotice \? \(/.test(view) && /href="#marketing-channels"/.test(view) && /id="marketing-channels"/.test(view) && view.indexOf("integrations-platform-admin-top") < view.indexOf("page-settings-integrations-customer"));
check("icons are generic glyphs from lucide, no image or logo file", !/<img|next\/image|\.svg|\.png/.test(customerUi));
check('never "Altair OS" and never "free" on the customer page', !/Altair OS\b/.test(customerUi) && !/\bfree\b/i.test(customerUi));
check("the platform-admin block is passed in by the page, not decided here", /platformAdminSlot \? \(/.test(view) && !/isPlatformAdmin/.test(customerUi));
check("the Integrations tab is in the settings menu for every company", /href: "\/settings\/integrations"/.test(read(FILES.nav)) && !/showIntegrations/.test(read(FILES.nav)) && !/showIntegrations/.test(read(FILES.layout)));
check("the phone menu has a shape for five tabs and for six, and no other", /items\.length >= 6 \? "grid-cols-3" : "grid-cols-5"/.test(read(FILES.nav)));
check("the marketing block still shows env-var NAMES only to whoever the page lets in", /Needs: \{row\.missingEnvVars\.join/.test(read(FILES.marketing)) && !/MarketingChannelIntegrations/.test(view));

console.log("\nThe public site says the same thing");
const notYet = read(FILES.notYet);
check('the public "not yet" list still lists the accounting sync that does not exist', /title: "QuickBooks Desktop, Xero or other accounting sync"/.test(notYet));
{
  const claims = readdirSync("shared/lib/site")
    .filter((file) => file.endsWith(".ts"))
    .filter((file) =>
      /\bAltair (now )?(syncs|connects|integrates|links|works) (directly )?(with|to) (QuickBooks(?! Online)|Zapier|Xero|Google Calendar|Gusto|ADP)/i.test(
        read(`shared/lib/site/${file}`),
      ),
    );
  check("no file under shared/lib/site says Altair connects to QuickBooks Desktop, Zapier, Xero, a calendar or payroll", claims.length === 0, claims);
  {
    const faq = read("shared/lib/site/faq.ts");
    check('the public FAQ says "Yes, with QuickBooks Online" and that Desktop is not supported', /question: "Does it work with QuickBooks\?",\s*answer:\s*"Yes, with QuickBooks Online/.test(faq) && /QuickBooks Desktop is not supported yet/.test(faq));
  }
}

console.log(`\n${passed}/${passed + failed} checks passed`);
process.exit(failed === 0 ? 0 : 1);
