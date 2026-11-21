/**
 * The public contractor directory (/directory), phase 1.
 *
 * Static and offline: the listing rules are loaded and driven with real
 * inputs, and the migration, the actions and the wiring are read as source.
 * Nothing here opens a socket or touches a database.
 *
 * ==================== WHAT IS ASSERTED ====================
 *   a good listing is accepted and tidied; each kind of bad one is refused
 *     with a message on the field it belongs to
 *   phone, website, email and slug are normalised to exactly what the
 *     database constraints accept
 *   the search read from the address bar drops anything it does not recognise
 *   every trade the form offers is allowed by migration 210
 *   the tables grant nothing to anon or authenticated, and the public
 *     functions cannot return the private email or an unpublished listing
 *   only the owner's actions can publish, and each checks the session
 *   a lister's actions each check the signed link; the mail-sending ones are
 *     rate limited
 *   /directory is public in middleware, allowed in robots, in the sitemap,
 *     and the manage page is noindex
 *   inside the signed-in Community tab, public listings come from the same
 *     public function, are marked as not being Altair members, cannot be
 *     sent a referral, and the invitation never receives the lister's email
 *   "claim your listing" (migration 211): only an owner or admin whose
 *     confirmed sign-in email is the listing's email can link it; the public
 *     functions return a yes/no and never the workspace; "active" is the
 *     billing resolver's answer, re-asked daily; the mark is explained
 *     wherever it is shown
 *
 * Run: node scripts/verify-directory.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadPureModule } from "./lib/load-pure-module.mjs";

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail === undefined ? "" : detail);
  }
}
const read = (p) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Every .ts/.tsx file under a folder, as forward-slash paths. */
function listFiles(root) {
  const out = [];
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) out.push(...listFiles(path));
    else if (/\.tsx?$/.test(name)) out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

const FILES = {
  rules: "shared/types/directory.ts",
  trades: "shared/types/network.ts",
  migration: "supabase/migrations/210_public_contractor_directory.sql",
  listings: "lib/directory/listings.ts",
  links: "lib/directory/links.ts",
  emails: "lib/directory/emails.ts",
  actions: "app/actions/directory.ts",
  ownerActions: "app/actions/platform-directory.ts",
  searchPage: "app/(marketing)/directory/page.tsx",
  listingPage: "app/(marketing)/directory/[slug]/page.tsx",
  listPage: "app/(marketing)/directory/list/page.tsx",
  managePage: "app/(marketing)/directory/manage/page.tsx",
  reviewPage: "app/(admin)/platform/directory/page.tsx",
  form: "shared/components/directory/ListingForm.tsx",
  middleware: "lib/supabase/middleware.ts",
  robots: "app/robots.ts",
  sitemap: "app/sitemap.ts",
  stylesheet: "app/public.css",
  footer: "shared/components/marketing/MarketingFooter.tsx",
  communityPage: "app/(admin)/community/page.tsx",
  communityView: "shared/components/network/north-star-m11/NetworkNorthStarView.tsx",
  communityListing: "shared/components/network/CommunityPublicListing.tsx",
  claimMigration: "supabase/migrations/211_directory_listing_claims.sql",
  claims: "lib/directory/claims.ts",
  claimActions: "app/actions/directory-claim.ts",
  memberBadge: "shared/components/directory/DirectoryMemberBadge.tsx",
  billingCron: "app/api/cron/billing-maintenance/route.ts",
  inviteForm: "shared/components/network/NetworkInviteForm.tsx",
};
for (const path of Object.values(FILES)) check(`${path} exists`, existsSync(path));
if (failures > 0) {
  console.error("\nMissing source; later checks would be vacuous.");
  process.exit(1);
}

const rules = await loadPureModule(FILES.rules, "dir-rules");
const sql = read(FILES.migration);

// ---------------------------------------------------------------- the form's rules
console.log("\nA listing: what is accepted");
const GOOD = {
  businessName: "  Wasatch   Heating & Air ",
  tradeType: "HVAC",
  city: "Salt Lake City",
  state: "ut",
  postalCode: "84101",
  serviceArea: "Salt Lake and Utah counties",
  phone: "(801) 555-0142",
  website: "wasatchheating.example",
  description: "Residential and light commercial HVAC.\n\n\n\nInstalls, service and maintenance agreements.",
  acceptsSubWork: "on",
};
{
  const r = rules.validateListingInput(GOOD);
  check("a complete listing is accepted", r.ok === true, r.errors);
  const f = r.fields ?? {};
  check("the name is trimmed and single-spaced", f.businessName === "Wasatch Heating & Air", f.businessName);
  check("the state is upper-cased", f.state === "UT");
  check("the phone is stored as ten digits", f.phone === "8015550142", f.phone);
  check("a bare domain becomes an https address", f.website === "https://wasatchheating.example", f.website);
  check("the description keeps a paragraph break but not a pile of blank lines", f.description === "Residential and light commercial HVAC.\n\nInstalls, service and maintenance agreements.", JSON.stringify(f.description));
  check("the checkbox becomes true", f.acceptsSubWork === true);
  const bare = rules.validateListingInput({ ...GOOD, postalCode: "", serviceArea: "", website: "", acceptsSubWork: undefined });
  check("ZIP, service area and website are optional", bare.ok === true && bare.fields.postalCode === null && bare.fields.website === null && bare.fields.acceptsSubWork === false, bare.errors);
}

console.log("\nA listing: what is refused, and where the message goes");
{
  const bad = (change, field) => {
    const r = rules.validateListingInput({ ...GOOD, ...change });
    return r.ok === false && typeof r.errors[field] === "string" && r.errors[field].length > 0;
  };
  check("no business name", bad({ businessName: " " }, "businessName"));
  check("a name longer than 80 characters", bad({ businessName: "A".repeat(81) }, "businessName"));
  check("a web address in the name", bad({ businessName: "Best HVAC www.spam.example" }, "businessName"));
  check("a trade that is not on the list", bad({ tradeType: "Wizardry" }, "tradeType"));
  check("no city", bad({ city: "" }, "city"));
  check("a ZIP code typed into the city", bad({ city: "Salt Lake 84101" }, "city"));
  check("a state that is not a state", bad({ state: "ZZ" }, "state"));
  check("a four-digit ZIP", bad({ postalCode: "8410" }, "postalCode"));
  check("a seven-digit phone number", bad({ phone: "555-0142" }, "phone"));
  check("a phone number with letters", bad({ phone: "801-555-HVAC" }, "phone"));
  check("a website that is not a web address", bad({ website: "javascript:alert(1)" }, "website"));
  check("a description shorter than 20 characters", bad({ description: "We do HVAC." }, "description"));
  check("a description longer than 400 characters", bad({ description: "x".repeat(401) }, "description"));
  check("a link in the description", bad({ description: "Great work, see https://spam.example for deals today" }, "description"));
  check("a service area longer than 120 characters", bad({ serviceArea: "y".repeat(121) }, "serviceArea"));
  const all = rules.validateListingInput({});
  check("an empty form reports every required field at once", all.ok === false && ["businessName", "tradeType", "city", "state", "phone"].every((k) => k in all.errors), Object.keys(all.errors ?? {}));
  check("the description is optional since 214: blank is accepted", rules.validateListingInput({ ...GOOD, description: "" }).ok === true);
  check("before 214 the description is still required (the old table demands it)", rules.validateListingInput({ ...GOOD, description: "" }, { requireDescription: true }).ok === false);
  const junk = rules.validateListingInput({ ...GOOD, businessName: 42, description: null, phone: {} });
  check("values that are not text are refused, not crashed on", junk.ok === false);
  const control = rules.validateListingInput({ ...GOOD, businessName: "Acme\u0000\u0007 HVAC" });
  check("control characters are removed from the name", control.ok === true && control.fields.businessName === "Acme HVAC", control.fields?.businessName);
}

console.log("\nPhone, website, email, slug");
{
  check("1-801-555-0142 loses the leading 1", rules.normalizePhone("1-801-555-0142") === "8015550142");
  check("801.555.0142 is accepted", rules.normalizePhone("801.555.0142") === "8015550142");
  check("an area code starting with 0 is refused", rules.normalizePhone("011 555 0142") === null);
  check("eleven digits not starting with 1 are refused", rules.normalizePhone("28015550142") === null);
  check("the phone is shown as (801) 555-0142", rules.formatPhone("8015550142") === "(801) 555-0142");

  check("http is upgraded to https", rules.normalizeWebsite("http://Example.com/") === "https://example.com");
  check("a path is kept", rules.normalizeWebsite("https://example.com/hvac") === "https://example.com/hvac");
  for (const bad of ["ftp://example.com", "javascript:alert(1)", "data:text/html,x", "https://user:pw@example.com", "https://example.com:8080", "localhost", "https://exa mple.com", "http://10.0.0.1"]) {
    check(`website ${JSON.stringify(bad)} is refused`, rules.normalizeWebsite(bad) === null, rules.normalizeWebsite(bad));
  }
  const websiteShape = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/;
  check("an accepted website satisfies the database constraint", ["wasatchheating.example", "http://Example.com/a?b=1", "https://www.example.co.uk/x"].every((w) => websiteShape.test(rules.normalizeWebsite(w))));
  check("the website button shows the host without www", rules.websiteLabel("https://www.example.com/x") === "example.com");

  check("an email is lower-cased and trimmed", rules.normalizeDirectoryEmail("  Owner@Example.COM ") === "owner@example.com");
  for (const bad of ["", "a@b", "two@@example.com", "a b@example.com", "x@example.com, y@example.com", "<x@example.com>", 7, null]) {
    check(`email ${JSON.stringify(bad)} is refused`, rules.normalizeDirectoryEmail(bad) === null);
  }

  const slug = rules.buildListingSlug("Wasatch Heating & Air", "Salt Lake City", "UT");
  check("the slug reads as the business and the place", slug === "wasatch-heating-and-air-salt-lake-city-ut", slug);
  check("accents and punctuation do not break the slug", rules.isValidListingSlug(rules.buildListingSlug("Café Niño's A/C, LLC.", "Coeur d'Alene", "ID")));
  check("a very long name still makes a valid slug", rules.isValidListingSlug(rules.buildListingSlug("A".repeat(80), "B".repeat(60), "UT")));
  check("a name with no letters still makes a valid slug", rules.isValidListingSlug(rules.buildListingSlug("!!!", "??", "UT")));
  check("a slug cannot be one of the directory's own pages", !rules.DIRECTORY_RESERVED_SLUGS.includes(rules.buildListingSlug("list", "", "")) && rules.DIRECTORY_RESERVED_SLUGS.includes("list") && rules.DIRECTORY_RESERVED_SLUGS.includes("manage"));
  for (const bad of ["", "ab", "Has-Capitals", "trailing-", "-leading", "two--hyphens", "../etc/passwd", "a".repeat(97), 12]) {
    check(`slug ${JSON.stringify(typeof bad === "string" ? bad.slice(0, 20) : bad)} is refused`, rules.isValidListingSlug(bad) === false);
  }
}

console.log("\nThe search read from the address bar");
{
  const s = rules.parseDirectorySearch({ trade: "HVAC", state: "ut", place: "  Salt   Lake ", sub: "1", page: "3" });
  check("a full search is read", s.trade === "HVAC" && s.state === "UT" && s.place === "Salt Lake" && s.subOnly === true && s.page === 3, s);
  const junk = rules.parseDirectorySearch({ trade: "'; drop table", state: "Utah", place: "x", sub: "yes", page: "-4" });
  check("anything unrecognised is dropped", junk.trade === null && junk.state === null && junk.place === null && junk.subOnly === false && junk.page === 1, junk);
  check("a repeated parameter uses the first value", rules.parseDirectorySearch({ trade: ["Plumbing", "HVAC"] }).trade === "Plumbing");
  check("a huge page number falls back to page 1", rules.parseDirectorySearch({ page: "999999" }).page === 1);
  check("an empty search is the plain address", rules.directorySearchHref({}) === "/directory");
  check("a search is a shareable link", rules.directorySearchHref({ trade: "HVAC", state: "UT", page: 2 }) === "/directory?trade=HVAC&state=UT&page=2");
  check("51 states and DC are offered", rules.US_STATES.length === 51 && new Set(rules.US_STATES.map((s) => s.code)).size === 51);
  const before = rules.validateListingInput(GOOD).fields;
  const after = { ...before, phone: "8015550199", description: `${before.description} Now with boilers.` };
  check("an edit reports exactly the fields that changed", JSON.stringify(rules.changedListingFields(before, after)) === JSON.stringify(["phone", "description"]));
}

// ---------------------------------------------------------------- the database
console.log("\nMigration 210");
{
  const trades = (await loadPureModule(FILES.trades, "dir-trades")).NETWORK_TRADE_CATEGORIES;
  check("every trade the form offers is allowed by the table", trades.every((t) => sql.includes(`'${t}'`)), trades.filter((t) => !sql.includes(`'${t}'`)));
  check("the form offers the same trades as the in-app directory", JSON.stringify(rules.DIRECTORY_TRADES) === JSON.stringify(trades));
  const L = rules.DIRECTORY_LIMITS;
  check("name length matches", sql.includes(`char_length(business_name) between ${L.businessName.min} and ${L.businessName.max}`));
  check("city length matches", sql.includes(`char_length(city) between ${L.city.min} and ${L.city.max}`));
  check("description length matches", sql.includes(`char_length(description) between ${L.description.min} and ${L.description.max}`));
  check("service area length matches", sql.includes(`char_length(service_area) <= ${L.serviceArea.max}`));
  check("website length matches", sql.includes(`char_length(website) <= ${L.website.max}`));
  check("slug length matches", sql.includes(`char_length(slug) between ${L.slug.min} and ${L.slug.max}`));
  check("the phone is ten digits in the table too", sql.includes("phone ~ '^[0-9]{10}$'"));
  check("only https websites can be stored", sql.includes("website ~ '^https://"));
  check("five statuses, the same five the app knows", ["pending_email", "pending_review", "published", "rejected", "removed"].every((s) => sql.includes(`'${s}'`)) && Object.keys(rules.DIRECTORY_STATUS_LABELS).length === 5);
  check("a published listing must have a confirmed email and a publish time", /status <> 'published'\s+or \(email_confirmed_at is not null and published_at is not null\)/.test(sql));
  check("report reasons match", rules.DIRECTORY_REPORT_REASONS.every((r) => sql.includes(`'${r.value}'`)));

  for (const table of ["directory_listings", "directory_listing_reports"]) {
    check(`${table}: row level security is on`, sql.includes(`alter table public.${table} enable row level security;`));
    for (const role of ["public", "anon", "authenticated"]) {
      check(`${table}: everything revoked from ${role}`, sql.includes(`revoke all on table public.${table} from ${role};`));
    }
    check(`${table}: no policy opens it to visitors`, !new RegExp(`create policy[^;]*on public\\.${table}`, "s").test(sql));
  }

  const fn = (name) => {
    const start = sql.indexOf(`create or replace function public.${name}(`);
    return start < 0 ? "" : sql.slice(start, sql.indexOf("$$;", start));
  };
  for (const name of ["directory_search_listings", "directory_public_listing", "directory_published_paths"]) {
    const body = fn(name);
    check(`${name}: exists`, body.length > 0);
    check(`${name}: returns published listings only`, /status = 'published'/.test(body));
    check(`${name}: never mentions the private email`, !/contact_email/.test(body));
    check(`${name}: never returns a waiting edit or a review note`, !/pending_changes|review_note|reviewed_by/.test(body));
    check(`${name}: not security definer`, !/security definer/i.test(body));
  }
  const grants = sql.slice(sql.indexOf("revoke all on function public.directory_search_listings"));
  for (const role of ["public", "anon", "authenticated"]) {
    check(`the functions are revoked from ${role}`, (grants.match(new RegExp(`from ${role};`, "g")) ?? []).length === 3);
  }
  check("only the service role may call them", (grants.match(/to service_role;/g) ?? []).length === 3 && !/to (anon|authenticated)/.test(sql));
  check("a visitor's search text cannot be used as a pattern", /replace\(replace\(replace\(p\.place, '\\', '\\\\'\), '%', '\\%'\), '_', '\\_'\)/.test(fn("directory_search_listings")));
  check("the page size is capped in the database", /least\(greatest\(coalesce\(p_limit, 20\), 1\), 50\)/.test(sql));
}

// ---------------------------------------------------------------- who may do what
console.log("\nThe lister's actions");
{
  const actions = read(FILES.actions);
  const body = (name) => {
    const start = actions.search(new RegExp(`export async function ${name}\\b`));
    return start < 0 ? "" : actions.slice(start, actions.indexOf("\n}", start));
  };
  check("actions file is a server module", actions.startsWith('"use server";'));
  check("submitting validates the form before anything else is done", /validateListingInput\(values[,)]/.test(body("submitListingAction")) && body("submitListingAction").indexOf("validateListingInput") < body("submitListingAction").indexOf("createListing("));
  check("submitting is limited per sender and per inbox", /enforcePublicRateLimit\("public\.directory_submit"/.test(body("submitListingAction")) && /\bip:/.test(body("submitListingAction")) && /email: contactEmail/.test(body("submitListingAction")));
  check("submitting refuses when the limiter is unavailable", /limit\.degraded/.test(body("submitListingAction")));
  check("submitting requires the consent box", /formData\.get\("consent"\) !== "on"/.test(body("submitListingAction")));
  check("submitting never publishes", !/approveListing|status: "published"|published_at/.test(body("submitListingAction")));
  for (const name of ["confirmListingAction", "saveListingEditAction", "removeListingAction"]) {
    check(`${name}: checks the signed link`, /readManageLink\(formData\)/.test(body(name)));
    check(`${name}: cannot publish`, !/approveListing|status: "published"/.test(body(name)));
  }
  check("the signed link is verified, not just read", /verifyManageLink\(id, token\)/.test(actions));
  check("asking for the manage link answers the same either way", /If there is a listing for that address/.test(body("requestManageLinkAction")) && /enforcePublicRateLimit\("public\.directory_manage_link"/.test(body("requestManageLinkAction")));
  check("reporting is rate limited and only for a published listing", /enforcePublicRateLimit\("public\.directory_report"/.test(body("reportListingAction")) && /getPublicListing\(slug\)/.test(body("reportListingAction")));
  check("every public form has the hidden trap field", (actions.match(/isTrapped\(formData\)/g) ?? []).length >= 3);

  const links = read(FILES.links);
  check("links are compared in constant time", /timingSafeEqual/.test(links));
  check("links are signed with the server secret, by purpose", /hashAuditSubject\("directory-listing\.manage", id\)/.test(links));
  check("email links are never built from the request's Host", !/headers\(\)|request\.url|x-forwarded-host/.test(links) && /resolveResourceLinkOrigin\(\)/.test(links));

  const listings = read(FILES.listings);
  check("the data layer is server-only", listings.startsWith('import "server-only";'));
  check("public reads go through the database functions", /rpc\("directory_search_listings"/.test(listings) && /rpc\("directory_public_listing"/.test(listings));
  const publicReads = listings.slice(listings.indexOf("// ---") , listings.indexOf("// ------------------------------------------------------------------ the lister"));
  check("the public read code never selects from the table directly", !/\.from\("directory_listings"\)/.test(publicReads));
  check("an edit to a live listing waits instead of changing it", /update\(\{ pending_changes: next \}\)/.test(listings));
  check("approval requires a confirmed email", /\.not\("email_confirmed_at", "is", null\)/.test(listings));
  check("failures are logged by code only", !/console\.(error|log|info)\([^)]*(contact_email|contactEmail|businessName|business_name)/.test(listings));
}

console.log("\nThe owner's actions");
{
  const owner = read(FILES.ownerActions);
  const names = [...owner.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
  check("seven owner actions: six review decisions and adding a business with permission", names.length === 7 && names.includes("addListingWithPermissionAction"), names);
  for (const name of names) {
    const start = owner.indexOf(`export async function ${name}`);
    const body = owner.slice(start, owner.indexOf("\n}", start));
    check(`${name}: checks for a platform admin first`, /const reviewer = await requireReviewer\(\);\s+if \(!reviewer\) return \{ error:/.test(body));
  }
  check("the reviewer check is the platform-admin allowlist", /canAccessPlatformAdmin\(user\)/.test(owner));
  check("a decision stands even if the email fails", /MAIL_WARNING/.test(owner));
  const review = read(FILES.reviewPage);
  check("the review page checks for a platform admin itself", /await requirePlatformAdmin\(\);/.test(review));
}

// ---------------------------------------------------------------- pages and wiring
console.log("\nPages and wiring");
{
  const mw = read(FILES.middleware);
  check("middleware declares the /directory prefix", /DIRECTORY_ROUTE_PREFIX = "\/directory"/.test(mw));
  check("middleware matches children, not lookalikes", mw.includes("pathname.startsWith(`${DIRECTORY_ROUTE_PREFIX}/`)"));
  check("middleware isPublicRoute includes the directory", /function isPublicRoute[\s\S]*?isDirectoryRoute\(pathname\)/.test(mw));
  check("the review screen is not public", !/platform\/directory/.test(mw));
  check("robots allows /directory", /"\/directory"/.test(read(FILES.robots)));
  const sm = read(FILES.sitemap);
  check("sitemap lists the directory, the form and each published listing", sm.includes("DIRECTORY_PATH") && sm.includes("DIRECTORY_LIST_PATH") && sm.includes("listPublishedListingPaths()"));
  check("the public stylesheet covers the directory components", read(FILES.stylesheet).includes('@source "../shared/components/directory";'));
  check("the footer links the directory", /href: "\/directory"/.test(read(FILES.footer)));

  const manage = read(FILES.managePage);
  check("the manage page is noindex", /index: false/.test(manage));
  check("the manage page shows nothing about a listing without a valid link", /verifyManageLink\(id, token\)/.test(manage) && /if \(!validId \|\| !record \|\| !token\)/.test(manage));
  check("the manage page changes nothing when opened", !/await (confirmListingEmail|removeListing|saveListingEdit)\(/.test(manage));
  const search = read(FILES.searchPage);
  check("a filtered search is not indexed as its own page", /robots: \{ index: false, follow: true \}/.test(search));
  check("the search page never claims a size", !/\b(hundreds|thousands|\d+\+?) (of )?(contractors|businesses)\b/i.test(search));
  const listing = read(FILES.listingPage);
  check("an unpublished address is a 404", /if \(!found\) notFound\(\);/.test(listing));
  // Every public listing was read by a person before it showed, so its
  // website link is vouched for: followed (no nofollow, no ugc), and the
  // referrer is kept so the business sees the visit came from the directory.
  check("a reviewed listing's website link is followed", /href=\{listing\.website\}\s+target="_blank"\s+rel="noopener"/.test(listing) && !/nofollow ugc/.test(listing));
  check("the business page says licences are not verified", /do not verify licenses or insurance/.test(listing.replace(/\s+/g, " ")));
  for (const file of [FILES.searchPage, FILES.listingPage, FILES.listPage, FILES.managePage, FILES.form]) {
    const source = read(file);
    check(`${file}: no raw HTML`, !source.includes("dangerouslySetInnerHTML"));
    check(`${file}: says "Altair Operating System", never the short name`, !/Altair OS(?![A-Za-z])/.test(source));
  }
  const emails = read(FILES.emails);
  check("emails escape the business name in HTML", /const esc = escapeBillingEmailHtml;/.test(emails) && !/\$\{input\.businessName\}<|>\$\{input\.businessName\}/.test(emails));
  check("emails never say the short product name", !/Altair OS(?![A-Za-z])/.test(emails));
  check("the consent sentence says the details will be public", /shown publicly/.test(rules.DIRECTORY_CONSENT_TEXT) && /except my email address/.test(rules.DIRECTORY_CONSENT_TEXT));
}

// ---------------------------------------------------------------- inside the app
console.log("\nPublic listings inside Community");
{
  const listings = read(FILES.listings);
  const start = listings.indexOf("export async function listListingsForCommunity");
  const fn = listings.slice(start, listings.indexOf("\n}", start));
  check("Community reads public listings through the public database function", /rpc\("directory_search_listings"/.test(fn) && !/\.from\("directory_listings"\)/.test(fn));
  check("Community asks for one page, and reports the total", /p_limit: 50/.test(fn) && /total:/.test(fn));

  const page = read(FILES.communityPage);
  check("the Community page passes the listings and their total to the view", /listListingsForCommunity\(\)/.test(page) && /initialPublicListings=\{publicListings\}/.test(page) && /publicListingTotal=\{/.test(page) && /publicDirectory\.total/.test(page));

  const card = read(FILES.communityListing);
  check("a public listing is tagged, and the panel says it is not on Altair", /Public listing/.test(card) && /Not on Altair yet/.test(card));
  check("the panel explains why a referral cannot be sent", /referral\s+cannot be sent or tracked here yet/.test(card.replace(/\s+/g, " ")));
  check("the panel never offers 'Send referral' for a public listing", !/Send Referral|onSendReferral|SendReferral/.test(card));
  check("the lister's email is not part of what the component can show", !/contactEmail|contact_email|mailto:/.test(card));
  check("inviting needs the same permission as every other invitation", /canInvite/.test(card) && /canInvite=\{canManageNetwork\}/.test(read(FILES.communityView)));
  check("the panel repeats that licences are not verified", /does not verify licenses or insurance/.test(card));
  check("the short product name is not used", !/Altair OS(?![A-Za-z])/.test(card));

  const view = read(FILES.communityView);
  const draft = view.slice(view.indexOf("function handleInviteListing"), view.indexOf("function handleInviteListing") + 500);
  check("an invitation started from a listing carries its name, phone and trade", /invitedCompanyName: listing\.businessName/.test(draft) && /invitedPhone: listing\.phone/.test(draft) && /tradeCategory: listing\.tradeType/.test(draft));
  check("and never an email address: the member has to get that from the contractor", !/invitedEmail/.test(draft));
  check("'Accepting referrals only' hides businesses that cannot accept one", /if \(acceptingReferralsOnly\) return NO_PUBLIC_LISTINGS;/.test(view));
  check("the public group is labelled as coming from the public site", /From the public directory/.test(view) && /Listed on altair-op\.com/.test(view));
  check("a member's own listing is found on the server, by their confirmed sign-in email or their workspace", /findOwnListings\(viewerEmail, companyId\)/.test(page) && /email_confirmed_at \? normalizeDirectoryEmail/.test(page));
  check("their own listing is labelled as theirs, with no invitation to themselves", /Your listing/.test(card) && /This is your own listing/.test(card) && /\{own \? \(/.test(card));
  check("members and public listings are counted separately", /on Altair/.test(view) && /public\`/.test(view));
  check("when there are more listings than shown, the screen says so and links the full search", /publicListingTotal > initialPublicListings\.length/.test(view) && /DIRECTORY_PATH/.test(view));
  check("the invitation form accepts starting values without changing its default", /initialValues\?: Partial<NetworkInviteFormData>/.test(read(FILES.inviteForm)) && /\{ \.\.\.DEFAULT_FORM, \.\.\.initialValues \}/.test(read(FILES.inviteForm)));
}

// ---------------------------------------------------------------- claim your listing
console.log("\nClaim your listing (migration 211)");
{
  const claimSql = read(FILES.claimMigration);
  const claimCode = claimSql.replace(/--[^\n]*/g, "");
  const claims = read(FILES.claims);
  const actions = read(FILES.claimActions);
  const card = read(FILES.communityListing);
  const page = read(FILES.communityPage);
  const flat = (text) => text.replace(/\s+/g, " ");

  check("the label and the limit are what the screens say", rules.DIRECTORY_MEMBER_LABEL === "Altair member" && rules.DIRECTORY_CLAIM_LIMIT === 3);
  check("the meaning names the product in full and says it is not an endorsement", /Altair Operating System/.test(rules.DIRECTORY_MEMBER_MEANING) && /not a review or an endorsement/.test(rules.DIRECTORY_MEMBER_MEANING) && !/Altair OS(?![A-Za-z])/.test(rules.DIRECTORY_MEMBER_MEANING));

  check("211 only adds: three columns, an index and two replaced functions", (claimCode.match(/add column if not exists/g) ?? []).length === 3 && !/drop\s+(table|column|function)|delete\s+from|truncate|create\s+policy|alter\s+policy/i.test(claimCode));
  check("the link points at a workspace and clears itself if the workspace is deleted", /claimed_company_id uuid references public\.companies \(id\) on delete set null/.test(claimCode));
  check("a listing starts as not a member", /member_active boolean not null default false/.test(claimCode));
  check("211 grants nothing to the public roles", !/grant[^;]*to\s+(anon|authenticated|public)\b/i.test(claimCode) && (claimCode.match(/to service_role;/g) ?? []).length === 2);
  check("211's functions run with the caller's rights", !/security\s+definer/i.test(claimCode) && (claimCode.match(/language sql\s+stable/g) ?? []).length === 2);
  check("the public functions return a yes/no, never the workspace or the email", !/'claimed_company_id'|'contact_email'|'member_active'|'claimed_at'/.test(claimCode) && (claimCode.match(/'is_member'/g) ?? []).length === 2);
  check("a member is a linked listing whose workspace is active, and both must hold", (claimCode.match(/claimed_company_id is not null and l\.member_active/g) ?? []).length === 2);
  check("the search still returns published listings only", /where l\.status = 'published'/.test(claimCode) && (claimCode.match(/l\.status = 'published'/g) ?? []).length === 2);
  check("members are listed first, then by name, in the page and inside it", (claimCode.match(/is_member desc, lower\((page|m)\.business_name\), (page|m)\.slug/g) ?? []).length === 2);
  check("the search limit is still capped at 50", /least\(greatest\(coalesce\(p_limit, 20\), 1\), 50\)/.test(claimCode));

  check("the claim actions are Server Actions", /^"use server";/.test(actions));
  check("each action resolves the caller itself", (actions.match(/await resolveCaller\(\)/g) ?? []).length === 2);
  check("only an owner or admin of the active workspace may link or unlink", /getActiveCompanyContext\(\)/.test(actions) && /if \(!context\.permissions\.manageCompany\)/.test(actions));
  check("the email comes from the session, and only a confirmed one counts", /getCurrentUser\(\)/.test(actions) && /user\.id === context\.user\.id && user\.email_confirmed_at \? normalizeDirectoryEmail\(user\.email\)/.test(flat(actions)));
  check("the browser says which listing and nothing else", /export async function linkListingToWorkspaceAction\(slug: string\)/.test(actions) && /export async function unlinkListingFromWorkspaceAction\(slug: string\)/.test(actions) && !/formData|FormData/.test(actions));
  check("linking uses the session's email and workspace", /linkListingToCompany\(slug, caller\.email, caller\.companyId\)/.test(actions));
  check("unlinking is limited to the caller's own workspace", /unlinkListingFromCompany\(slug, caller\.companyId\)/.test(actions));
  check("a listing that is not the caller's gives one answer whether it exists or not", (actions.match(/NOT_YOURS/g) ?? []).length >= 3);

  const link = claims.slice(claims.indexOf("export async function linkListingToCompany"), claims.indexOf("export type UnlinkOutcome"));
  check("the link is one conditional UPDATE: published, this email, not linked yet", /\.eq\("slug", slug\)\s*\.eq\("status", "published"\)\s*\.eq\("contact_email", contactEmail\)\s*\.is\("claimed_company_id", null\)/.test(link));
  check("a workspace cannot link more than the limit", /\(held\.count \?\? 0\) < DIRECTORY_CLAIM_LIMIT/.test(link));
  check("the explanation after a failed link is also bound to the caller's email", /\.eq\("status", "published"\)\s*\.eq\("contact_email", contactEmail\)\s*\.maybeSingle\(\)/.test(link));
  const unlink = claims.slice(claims.indexOf("export async function unlinkListingFromCompany"), claims.indexOf("export type MemberFlagRefreshResult"));
  check("unlinking touches only a listing linked to that workspace, and turns the mark off", /\.eq\("claimed_company_id", companyId\)/.test(unlink) && /claimed_company_id: null, claimed_at: null, member_active: false/.test(unlink));
  check("'active' is the billing resolver's answer, by the app shell's rule", /resolveCompanyBillingAccess\(companyId\)/.test(claims) && /billingPolicyAllowsAppShell\(access\)/.test(claims));
  const refresh = claims.slice(claims.indexOf("export async function refreshDirectoryMemberFlags"));
  check("the daily re-check asks that same question", /await workspaceIsActive\(companyId\)/.test(refresh));
  check("a workspace that could not be checked keeps yesterday's answer", /activeByCompany\.get\(row\.claimed_company_id\) === wanted && row\.member_active !== wanted/.test(refresh) && /could not be checked/.test(refresh));
  check("before migration 211 the re-check is quiet, not a failure", /if \(isNotInstalled\(error\)\) \{\s*result\.installed = false;\s*return result;/.test(refresh));
  check("the claim code never logs an email, a name or a workspace id", !/console\.(log|error|warn)\([^)]*(email|Email|companyId|businessName|slug)/.test(claims));
  const cron = read(FILES.billingCron);
  check("the daily billing run re-checks the marks, and cannot be failed by them throwing", /try \{\s*memberFlags = await refreshDirectoryMemberFlags\(\);\s*\} catch \{/.test(cron) && /memberFlags\.errors\.length/.test(cron));

  const rulesSource = read(FILES.rules);
  const ownType = rulesSource.slice(rulesSource.indexOf("export type DirectoryOwnListing"), rulesSource.indexOf("/** The fields a lister fills in"));
  check("what Community is told about a member's own listing has no email and no workspace id", /linked: "none" \| "this" \| "other"/.test(ownType) && !/email: |Email: string|companyId|company_id/.test(ownType));
  check("the public listing type carries only the yes/no", /isMember: boolean;/.test(rulesSource) && /isMember: row\.is_member === true/.test(read(FILES.listings)));
  check("the Community component cannot name a workspace or an email", !/claimed_company_id|claimedCompanyId|companyId|contactEmail|contact_email|mailto:/.test(card));
  check("the Link button needs an owner or admin AND a matching email", /canManage && own\.emailMatches \? \(/.test(card) && /linkListingToWorkspaceAction/.test(card));
  check("a member's listing is not offered an invitation it does not need", /\) : listing\.isMember \? \(/.test(card) && /has not made its Community profile visible/.test(flat(card)));
  check("a business with a visible profile is not shown twice", /listSlugsLinkedToCompanies\(profiles\.map\(\(profile\) => profile\.companyId\)\)/.test(page) && /!duplicateSlugs\.has\(listing\.slug\)/.test(page));
  check("the member's own listings lead the public group", /\.\.\.ownPublicListings\.map\(\(own\) => own\.listing\),/.test(page));

  const search = read(FILES.searchPage);
  const listing = read(FILES.listingPage);
  const badge = read(FILES.memberBadge);
  check("the mark is one component with one label", /DIRECTORY_MEMBER_LABEL/.test(badge) && !/Altair OS(?![A-Za-z])/.test(badge));
  check("the search page shows the mark only on a member's row", /ListingResultCard/.test(search) && /\{listing\.isMember \? <DirectoryMemberBadge \/> : null\}/.test(read("shared/components/directory/DirectoryUi.tsx")));
  check("the search page says members are listed first whenever one is on the page", /showsMembers = result\.listings\.some\(\(listing\) => listing\.isMember\)/.test(search) && /\{DIRECTORY_MEMBER_LABEL\}s are listed first\./.test(search));
  check("both public pages say what the mark means", /DIRECTORY_MEMBER_MEANING/.test(search) && /DIRECTORY_MEMBER_MEANING/.test(listing));
  check("the business page shows the mark only for a member", /\{listing\.isMember \? <DirectoryMemberBadge \/> : null\}/.test(listing));
  const manage = read(FILES.managePage);
  check("the manage page explains linking only for a live listing, and counts the trial link", /record\.status === "published" \? await getListingLinkState\(record\.id\) : null/.test(manage.replace(/\s+/g, " ")) && /href="\/signup" data-cta="directory-manage-member"/.test(manage.replace(/\s+/g, " ")));
  const emails = read(FILES.emails);
  check("the 'listing is live' email mentions linking once, and not on a change", /input\.changesOnly\s*\? ""\s*: `If you run your business on Altair Operating System, you can link this listing/.test(emails));
}

// ---------------------------------------------------------------- the revamp (migration 214)
console.log("\nRicher listings, images, numbers and place pages (migration 214)");
{
  const P = {
    migration: "supabase/migrations/214_directory_rich_listings_and_stats.sql",
    media: "lib/directory/media.ts",
    places: "lib/directory/places.ts",
    stats: "lib/directory/stats.ts",
    monthly: "lib/directory/monthly-stats.ts",
    mediaRoute: "app/api/directory/media/route.ts",
    eventRoute: "app/api/directory/listing-event/route.ts",
    cronRoute: "app/api/cron/directory-stats/route.ts",
    stopPage: "app/(marketing)/directory/manage/monthly-email/page.tsx",
    hub: "shared/components/directory/DirectoryHub.tsx",
    cityPage: "app/(marketing)/directory/[slug]/[city]/page.tsx",
    tradePage: "app/(marketing)/directory/[slug]/[city]/[trade]/page.tsx",
    badgeSvg: "public/badges/listed-on-altair.svg",
    beacon: "shared/components/directory/ListingStatsBeacon.tsx",
    engagement: "shared/lib/analytics/engagement.ts",
    vercel: "vercel.json",
    cronMonitor: "lib/operations/cron-monitor.ts",
    nextConfig: "next.config.ts",
  };
  for (const path of Object.values(P)) check(`${path} exists`, existsSync(path));
  const m = read(P.migration);
  const code = m.replace(/--[^\n]*/g, "");
  const flat = (text) => text.replace(/\s+/g, " ");
  const D = rules.DIRECTORY_DETAIL_LIMITS;

  // The migration: additive, private, and in step with the rules.
  check("214 only adds or replaces: nothing dropped but old constraints", !/drop\s+(table|column|function|policy|index)|delete\s+from|truncate|alter\s+column/i.test(code));
  check("214 creates no policy (storage or table)", !/create\s+policy/i.test(code));
  for (const table of ["directory_listing_daily_stats", "directory_stats_emails"]) {
    check(`${table}: row level security is on`, code.includes(`alter table public.${table} enable row level security;`));
    for (const role of ["public", "anon", "authenticated"]) check(`${table}: everything revoked from ${role}`, code.includes(`revoke all on table public.${table} from ${role};`));
    check(`${table}: service role only`, code.includes(`grant all on table public.${table} to service_role;`));
  }
  const statsTable = code.slice(code.indexOf("create table if not exists public.directory_listing_daily_stats"), code.indexOf("comment on table public.directory_listing_daily_stats"));
  check("the numbers table stores counts only: no address, visitor, device or user", !/\b(ip|address|visitor|device|user_id|session|agent|referrer)\b/i.test(statsTable) && /views integer/.test(statsTable));
  check("approved images live in a public bucket", /values \('directory-public', 'directory-public', true,/.test(code));
  check("uploads waiting for review live in a private bucket", /values \('directory-pending', 'directory-pending', false,/.test(code));
  check("the description may be blank, otherwise the old limits", code.includes(`check (char_length(description) = 0 or char_length(description) between ${rules.DIRECTORY_LIMITS.description.min} and ${rules.DIRECTORY_LIMITS.description.max})`));
  check("services limit matches", code.includes(`coalesce(array_length(services, 1), 0) <= ${D.services.max}`));
  check("languages limit matches", code.includes(`coalesce(array_length(languages, 1), 0) <= ${D.languages.max}`));
  check("photos limit matches", code.includes(`coalesce(array_length(photo_paths, 1), 0) <= ${D.photos.max}`));
  check("license length matches", code.includes(`char_length(license_number) <= ${D.licenseNumber.max}`));
  check("radius range matches", code.includes(`service_radius_miles between ${D.serviceRadiusMiles.min} and ${D.serviceRadiusMiles.max}`));
  check("year founded lower bound matches", code.includes(`year_founded between ${D.yearFounded.min} and`));
  check("an image path can only name a file in a listing's own folder", /logo_path ~ '\^\[0-9a-f-\]\{36\}\/\[0-9a-f-\]\{36\}\\\.\(png\|jpg\|webp\)\$'/.test(code));

  const fn214 = (name) => {
    const start = code.indexOf(`create or replace function public.${name}(`);
    return start < 0 ? "" : code.slice(start, code.indexOf("$$;", start));
  };
  for (const name of ["directory_search_listings", "directory_public_listing", "directory_facets", "directory_record_listing_event"]) {
    const body = fn214(name);
    check(`${name} (214): exists`, body.length > 0);
    check(`${name} (214): published listings only`, /status = 'published'/.test(body));
    check(`${name} (214): never the email, a waiting change, waiting images, the email preference or a workspace`, !/contact_email|pending_changes|pending_media|stats_email_opt_out|'claimed_company_id'/.test(body));
    check(`${name} (214): not security definer`, !/security definer/i.test(body));
    for (const role of ["public", "anon", "authenticated"]) check(`${name} (214): revoked from ${role}`, new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from ${role};`).test(code));
    check(`${name} (214): service role only`, new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to service_role;`).test(code));
  }
  check("the public listing returns approved image paths only, never the waiting set", /'logo_path', l\.logo_path/.test(fn214("directory_public_listing")) && !/pending/.test(fn214("directory_public_listing")));
  check("the counter accepts exactly the four events the app sends", JSON.stringify(rules.DIRECTORY_LISTING_EVENTS) === JSON.stringify(["view", "call", "website", "directions"]) && /p_event not in \('view', 'call', 'website', 'directions'\)/.test(fn214("directory_record_listing_event")));
  check("the counter picks today's date itself; a caller cannot", /create or replace function public\.directory_record_listing_event\(p_slug text, p_event text\)/.test(code));

  // The rules for the optional details.
  const GOOD_DETAILS = {
    ...GOOD,
    services: "furnaces,air-conditioning,residential",
    hours: "mon=08:00-17:00;tue=08:00-17:00;wed=closed",
    licenseNumber: "S350-123456",
    licenseState: "",
    insured: "yes",
    emergencyService: "no",
    yearFounded: "2009",
    serviceRadiusMiles: "40",
    languages: "es,en",
  };
  const ok = rules.validateListingInput(GOOD_DETAILS);
  check("a listing with every detail is accepted", ok.ok === true, ok.errors);
  if (ok.ok) {
    const f = ok.fields;
    check("services keep the catalogue's order", JSON.stringify(f.services) === JSON.stringify(["furnaces", "air-conditioning", "residential"]), f.services);
    check("the license state defaults to the business's state", f.licenseState === "UT");
    check("yes / no become true / false", f.insured === true && f.emergencyService === false);
    check("hours are read day by day, missing days are closed", f.hours?.mon?.open === "08:00" && f.hours?.wed === null && f.hours?.sun === null);
    check("languages keep the list's order", JSON.stringify(f.languages) === JSON.stringify(["en", "es"]));
    check("hours survive the form's encoding both ways", JSON.stringify(rules.parseHoursInput(rules.encodeHours(f.hours))) === JSON.stringify(f.hours));
  }
  const badDetail = (change, field) => {
    const r = rules.validateListingInput({ ...GOOD_DETAILS, ...change });
    return r.ok === false && typeof r.errors[field] === "string";
  };
  check("a service another trade offers is refused", badDetail({ services: "panel-upgrades" }, "services"));
  check("a made-up service is refused", badDetail({ services: "best-in-town" }, "services"));
  check("a closing time before the opening time is refused", badDetail({ hours: "mon=17:00-08:00" }, "hours"));
  check("a malformed time is refused", badDetail({ hours: "mon=8am-5pm" }, "hours"));
  check("a year in the future is refused", badDetail({ yearFounded: String(new Date().getUTCFullYear() + 1) }, "yearFounded"));
  check("a radius of zero is refused", badDetail({ serviceRadiusMiles: "0" }, "serviceRadiusMiles"));
  check("a license number with markup is refused", badDetail({ licenseNumber: "<b>123</b>" }, "licenseNumber"));
  check("a yes/no that is neither is refused", badDetail({ insured: "maybe" }, "insured"));
  check("a language not on the list is refused", badDetail({ languages: "klingon" }, "languages"));
  const none = rules.validateListingInput(GOOD);
  check("every detail is optional", none.ok === true && none.fields.services.length === 0 && none.fields.hours === null && none.fields.insured === null);
  check("seven closed days is the same as no hours", rules.parseHoursInput("mon=closed") === null);
  const lines = rules.summarizeHours({ mon: { open: "08:00", close: "17:00" }, tue: { open: "08:00", close: "17:00" }, wed: { open: "08:00", close: "17:00" }, thu: { open: "08:00", close: "17:00" }, fri: { open: "08:00", close: "17:00" }, sat: null, sun: null });
  check("hours read as runs of days", JSON.stringify(lines) === JSON.stringify([{ days: "Mon–Fri", time: "8 AM – 5 PM" }, { days: "Sat–Sun", time: "Closed" }]), lines);

  // Place pages: addresses that cannot collide with a business.
  check("the indexing threshold is one constant, set to 3", rules.DIRECTORY_HUB_INDEX_MIN === 3);
  check("a state segment is exactly two lower-case letters", rules.stateFromSegment("ut") === "UT" && rules.stateFromSegment("UT") === null && rules.stateFromSegment("utah") === null && rules.stateFromSegment("zz") === null);
  check("no business slug can be a state segment (slugs are 3+ characters)", rules.DIRECTORY_LIMITS.slug.min >= 3 && rules.buildListingSlug("A", "", "").length >= 3 && /char_length\(slug\) between 3 and/.test(sql));
  check("every trade has an address of its own and back", rules.DIRECTORY_TRADES.every((t) => rules.tradeFromSlug(rules.tradeSlug(t)) === t) && new Set(rules.DIRECTORY_TRADES.map(rules.tradeSlug)).size === rules.DIRECTORY_TRADES.length);
  check("a city reads as an address", rules.placeSlug("St. George") === "st-george" && rules.directoryCityTradePath("UT", "Salt Lake City", "HVAC") === "/directory/ut/salt-lake-city/hvac");
  const hub = read(P.hub);
  check("a thin place page is noindex", /hub\.indexable \? \{\} : \{ robots: \{ index: false, follow: true \} \}/.test(hub));
  check("a city with no business based there is a 404, not an empty page", /if \(!city\) return null;/.test(hub) && /notFound\(\)/.test(read(P.cityPage)) && /notFound\(\)/.test(read(P.tradePage)));
  const places = read(P.places);
  check("indexable means the one rule, everywhere", /count >= DIRECTORY_HUB_INDEX_MIN/.test(places) && (places.match(/isIndexableHub\(/g) ?? []).length >= 4);
  check("the sitemap lists only indexable place pages", /listIndexableHubPaths\(\)/.test(read(FILES.sitemap)));
  check("place counts come from the public function, published only", /rpc\("directory_facets"\)/.test(places) && !/\.from\("directory_listings"\)/.test(places));
  const listingPage = read(FILES.listingPage);
  check("the business page breadcrumb names only indexable place pages", (listingPage.match(/if \(isIndexableHub\(/g) ?? []).length === 3 && !/directorySearchHref/.test(listingPage));
  check("the business page structured data uses only given fields and no rating", !/aggregateRating|ratingValue|review/i.test(listingPage));
  check("'insured' is labelled as the business's own statement", /The business&apos;s own statement/.test(listingPage));
  const search = read(FILES.searchPage);
  check("the search page carries ItemList and BreadcrumbList data", /itemListJsonLd\(/.test(search) && /breadcrumbJsonLd\(/.test(search));
  check("the empty search invites the business to be first", /Be the first \$\{what\} listed in \$\{where\}\./.test(search));

  // Images: private until approved.
  const media = read(P.media);
  check("media code is server-only", media.startsWith('import "server-only";'));
  check("uploads go to the private bucket only", /from\(DIRECTORY_PENDING_BUCKET\)\.upload\(path/.test(media) && !/from\(DIRECTORY_PUBLIC_BUCKET\)\.upload\(path, bytes, \{\s*contentType: type\.contentType,\s*upsert: false/.test(media));
  check("the file type is read from its bytes; SVG is never accepted", /sniffImageType\(bytes\)/.test(media) && !/svg/i.test(media.replace(/No SVG \(it can carry script\)/, "")));
  check("a public address is only ever built for the public bucket", /object\/public\/\$\{DIRECTORY_PUBLIC_BUCKET\}/.test(media) && !/object\/public\/\$\{DIRECTORY_PENDING_BUCKET\}/.test(media));
  check("a proposal can only name the listing's own files", /path\.startsWith\(`\$\{listingId\}\/`\)/.test(media));
  const listingsSrc = read(FILES.listings);
  const repoUses = (needle) => ["lib", "app", "shared"].flatMap((root) => listFiles(root)).filter((file) => read(file).includes(needle));
  check("only an approval copies images into the public bucket", JSON.stringify(repoUses("publishMediaSet(").sort()) === JSON.stringify([P.media, FILES.listings].sort()) && (listingsSrc.match(/await publishPendingMedia\(/g) ?? []).length === 2);
  const mediaRoute = read(P.mediaRoute);
  check("an upload needs the signed manage link, checked first", mediaRoute.indexOf("verifyManageLink(id, token)") > 0 && mediaRoute.indexOf("verifyManageLink(id, token)") < mediaRoute.indexOf("uploadPendingImage("));
  check("uploads are rate limited", /enforcePublicRateLimit\("public\.token_view"/.test(mediaRoute));
  check("a removed listing's images are deleted", (listingsSrc.match(/await deleteAllListingMedia\(id\)/g) ?? []).length === 2);

  // Numbers: counts only, honest exclusions.
  const eventRoute = read(P.eventRoute);
  check("the counter route refuses bots, other sites and non-production", /isBotUserAgent\(/.test(eventRoute) && /isSameOrigin\(request\)/.test(eventRoute) && /isAnalyticsRecordingEnabled\(\)/.test(eventRoute));
  check("the counter route is rate limited and takes only a slug and an event", /enforcePublicRateLimit\("public\.analytics_collect"/.test(eventRoute) && /recordListingEvent\(body\.slug, body\.event\)/.test(eventRoute));
  check("the page beacon respects the site's opt-out and sends no visitor data", /isAnalyticsAllowed\(\)/.test(read(P.beacon)) && /JSON\.stringify\(\{ slug, event \}\)/.test(read(P.beacon)) && /credentials: "omit"/.test(read(P.beacon)));
  const mw = read(FILES.middleware);
  check("the two directory endpoints are public by exact path", /DIRECTORY_EVENT_ROUTE = "\/api\/directory\/listing-event"/.test(mw) && /DIRECTORY_MEDIA_ROUTE = "\/api\/directory\/media"/.test(mw) && /pathname === DIRECTORY_EVENT_ROUTE/.test(mw));

  // The monthly email.
  const cron = read(P.cronRoute);
  check("the monthly run refuses without CRON_SECRET, and without the bearer token", /if \(!getCronSecret\(\)\)[\s\S]*?status: 503/.test(cron) && /if \(!isAuthorizedCronRequest\(request\)\)[\s\S]*?status: 401/.test(cron));
  const vercel = JSON.parse(read(P.vercel));
  const schedule = vercel.crons.find((c) => c.path === "/api/cron/directory-stats")?.schedule;
  check("vercel.json schedules it, matching the monitor", schedule === "0 15 2 * *" && read(P.cronMonitor).includes(`"directory-stats": "${schedule}"`) && vercel.functions["app/api/cron/directory-stats/route.ts"]?.maxDuration === 60);
  const monthly = read(P.monthly);
  check("a month is claimed before its email is sent, so it is never sent twice", monthly.indexOf('.from("directory_stats_emails")') < monthly.indexOf("sendMonthlyStatsEmail(") && /claim\.error\.code === "23505"/.test(monthly));
  check("a business that stopped the email is not sent it", /\.eq\("stats_email_opt_out", false\)/.test(monthly));
  check("a month with nothing to report is skipped, not sent", /if \(empty\) \{\s*result\.skipped \+= 1;/.test(monthly));
  const emails = read(FILES.emails);
  check("the monthly email has a stop link and a List-Unsubscribe header", /buildStatsStopUrl\(listing\.id\)/.test(emails) && /"List-Unsubscribe": `<\$\{stopUrl\}>`/.test(emails) && /stop these emails/.test(emails));
  const links = read(FILES.links);
  check("the stop link is signed for that purpose only", /hashAuditSubject\("directory-listing\.stats-stop", id\)/.test(links) && /timingSafeEqual/.test(links));
  check("opening the stop link changes nothing; the button does", !/setStatsEmailOptOut\(/.test(read(P.stopPage)) && /stopStatsEmailAction/.test(read(P.stopPage)));

  // The badge and the counted steps.
  const svg = read(P.badgeSvg);
  check("the badge is a plain picture: no script, no outside references", !/<script|on\w+=|href=|xlink/i.test(svg) && /Listed on Altair Operating System/.test(svg));
  check("the badge snippet links to the listing and the static picture", rules.directoryBadgeSnippet("https://www.altair-op.com", "acme-hvac-provo-ut") === '<a href="https://www.altair-op.com/directory/acme-hvac-provo-ut" title="Listed on Altair Operating System"><img src="https://www.altair-op.com/badges/listed-on-altair.svg" alt="Listed on Altair Operating System" width="200" height="56" style="border:0"></a>');
  const engagement = await loadPureModule(P.engagement, "dir-engagement");
  const tracked = ["app", "shared"].flatMap((root) => listFiles(root)).flatMap((file) => [...read(file).matchAll(/(?:data-track(?:-submit)?=|track=|trackEngagement\("cta_click", )"(dir-[a-z0-9-]+)"/g)].map((match) => match[1]));
  check("every counted directory step has a name in the analytics table", tracked.length >= 10 && tracked.every((label) => engagement.isDirectoryStepLabel(label) && engagement.isValidEngagementLabel(label)), tracked.filter((label) => !engagement.isDirectoryStepLabel(label)));
  check("the broken /ZGlyZWN0b3 address sends visitors to the directory", /ZGlyZWN0b3\[A-Za-z0-9_=-\]\*/.test(read(P.nextConfig)));
  for (const file of Object.values(P).filter((path) => /\.(tsx?|sql|svg)$/.test(path))) {
    check(`${file}: never the short product name`, !/Altair OS(?![A-Za-z])/.test(read(file)));
  }
}

// ---------------------------------------------------------------- added with permission (owner, 2026-11-20)
console.log("\nAdding a business with permission (migration 214)");
{
  const m = read("supabase/migrations/214_directory_rich_listings_and_stats.sql").replace(/--[^\n]*/g, "");
  const owner = read(FILES.ownerActions);
  const listingsSrc = read(FILES.listings);
  const emails = read(FILES.emails);
  const form = read("shared/components/platform-admin/directory/AddWithPermissionForm.tsx");
  const review = read("shared/components/platform-admin/directory/DirectoryReviewView.tsx");
  const listingPage = read(FILES.listingPage);
  const flat = (text) => text.replace(/\s+/g, " ");

  check("the source is one of two words, self-listed by default", /source text not null default 'self_listed'/.test(m) && /check \(source in \('self_listed', 'added_with_permission'\)\)/.test(m));
  check("an added listing must name who said yes and when; a self-listed one cannot", /source = 'self_listed' and permission_given_by is null and permission_given_at is null/.test(m) && /source = 'added_with_permission'\s+and char_length\(btrim\(permission_given_by\)\) between 2 and 120\s+and permission_given_at is not null/.test(m));
  check("only an added listing may be live before its business confirms", /email_confirmed_at is not null or source = 'added_with_permission'/.test(m));
  const publicFns = ["directory_search_listings", "directory_public_listing"].map((name) => {
    const start = m.indexOf(`create or replace function public.${name}(`);
    return m.slice(start, m.indexOf("$$;", start));
  });
  check("the public functions say only whether the business has confirmed", publicFns.every((body) => /'awaiting_owner', \((l|page)\.source = 'added_with_permission' and (l|page)\.email_confirmed_at is null\)/.test(body) && !/permission_given|permission_note|added_by|'source'/.test(body)));

  const P = rules.validatePermissionInput;
  const ok = P({ permissionGivenBy: "Dana Ruiz, owner", permissionGivenAt: "2026-11-18", permissionNote: "" }, "2026-11-20");
  check("a named person and a recent date are accepted; waiting is the default", ok.ok === true && ok.permission.publish === "wait" && ok.permission.note === null, ok);
  check("publishing now is only on an explicit choice", P({ permissionGivenBy: "Dana", permissionGivenAt: "2026-11-18", publish: "now" }, "2026-11-20").permission?.publish === "now");
  check("no name is refused", P({ permissionGivenBy: " ", permissionGivenAt: "2026-11-18" }, "2026-11-20").ok === false);
  check("a date in the future is refused", P({ permissionGivenBy: "Dana", permissionGivenAt: "2026-11-21" }, "2026-11-20").ok === false);
  check("a date more than a year back is refused", P({ permissionGivenBy: "Dana", permissionGivenAt: "2025-10-01" }, "2026-11-20").ok === false);
  check("an impossible date is refused", P({ permissionGivenBy: "Dana", permissionGivenAt: "2026-02-30" }, "2026-11-20").ok === false);
  check("an email address is not a name", P({ permissionGivenBy: "dana@example.com", permissionGivenAt: "2026-11-18" }, "2026-11-20").ok === false);

  const start = owner.indexOf("export async function addListingWithPermissionAction");
  const body = owner.slice(start, owner.indexOf("\n}", start));
  check("adding is for platform admins only, checked first in the action", /const reviewer = await requireReviewer\(\);\s+if \(!reviewer\) return \{ error:/.test(body) && body.indexOf("requireReviewer") < body.indexOf("createListingWithPermission("));
  check("the action validates the listing, the permission and the email", /validateListingInput\(values\)/.test(body) && /validatePermissionInput\(values\)/.test(body) && /normalizeDirectoryEmail\(values\.contactEmail\)/.test(body));
  check("the business is emailed on save", /sendPermissionAddedEmail\(/.test(body));
  const callers = ["lib", "app", "shared"].flatMap((root) => listFiles(root)).filter((file) => read(file).includes("createListingWithPermission("));
  check("only the admin action can add a listing with permission", JSON.stringify(callers.sort()) === JSON.stringify([FILES.ownerActions, FILES.listings].sort()));
  const create = listingsSrc.slice(listingsSrc.indexOf("export async function createListingWithPermission"), listingsSrc.indexOf("export async function getListingRecord"));
  check("an added listing stores its source, who, when, the note and the admin", /source: "added_with_permission"/.test(create) && /permission_given_by: permission\.givenBy/.test(create) && /permission_given_at: permission\.givenAt/.test(create) && /added_by: adminId/.test(create));
  check("it goes in waiting for the business unless 'publish now' was chosen", /\.\.\.\(publishNow \? \{ status: "published" as const/.test(create) && /const publishNow = permission\.publish === "now";/.test(create));
  check("the email says who agreed and when, in the owner's words", flat(emails).includes("We spoke with ${input.givenBy} on ${formatPermissionDate(input.givenAt)} and added your listing with the information you agreed to. Please check it, add your own description and photos, or remove it."));
  check("the email explains one-step removal", /press Remove\. It comes down straight away/.test(emails));
  const confirm = listingsSrc.slice(listingsSrc.indexOf("export async function confirmListingEmail"), listingsSrc.indexOf("export type SaveEditOutcome"));
  check("a business confirming a live added listing only records the confirmation", /\.eq\("status", "published"\)\s*\.eq\("source", "added_with_permission"\)\s*\.is\("email_confirmed_at", null\)/.test(confirm));
  check("the form waits for the business by default", /useState<"wait" \| "now">\("wait"\)/.test(form) && /Wait for the business to confirm/.test(form));
  check("the review screen offers the form and shows who gave permission", /<AddWithPermissionForm available=\{canAddWithPermission\} \/>/.test(review) && /Added with permission: \{item\.permission\.givenBy\}/.test(review));
  check("the public page shows nothing about the source but the confirm prompt", /Is this your business\? Confirm or edit your listing/.test(listingPage) && !/permission\b|givenBy|added_with_permission|bsourceb/.test(listingPage.replace(/with its permission|with their permission|added with permission/gi, "")));
  check("removal is still one step for an added listing", !/source/.test(listingsSrc.slice(listingsSrc.indexOf("export async function removeListing("), listingsSrc.indexOf("export async function findListingsForEmail"))));
}

// ---------------------------------------------------------------- before migration 214 runs
// The code ships first and the owner runs 214 afterwards, so every phase-2
// path must ask isDirectory214Installed() and fall back to phase 1.
console.log("\nWorks before migration 214 is applied");
{
  const schema = read("lib/directory/schema.ts");
  const listingsSrc = read(FILES.listings);
  check("one probe answers 'is 214 applied', remembered briefly, outages read as no", /export async function isDirectory214Installed/.test(schema) && /TTL_MS = 60_000/.test(schema) && /select\("source, services, pending_media"\)/.test(schema));
  check("listing rows are read with only the columns that exist", /function rowColumns\(v214: boolean\)/.test(listingsSrc) && !/ROW_COLUMNS/.test(listingsSrc) && (listingsSrc.match(/select\(rowColumns\(v214\)\)/g) ?? []).length === 3);
  check("listing rows are written with only the columns that exist", /if \(!v214\) return base;/.test(listingsSrc) && !/fieldColumns\(fields\)/.test(listingsSrc) && !/fieldColumns\(record\.pendingFields\)\b/.test(listingsSrc));
  check("removal touches image columns and buckets only after 214", (listingsSrc.match(/\.\.\.mediaReset\(v214\)/g) ?? []).length === 2 && (listingsSrc.match(/if \(v214\) await deleteAllListingMedia\(id\);/g) ?? []).length === 2);
  check("confirming does not ask about the source before 214", /if \(!\(await isDirectory214Installed\(\)\)\) \{\s*const current/.test(listingsSrc.slice(listingsSrc.indexOf("export async function confirmListingEmail"))));
  check("images, the email preference and permission listings need 214", /async function saveListingMedia[\s\S]*?if \(!\(await isDirectory214Installed\(\)\)\) return "unavailable";/.test(listingsSrc) && /async function setStatsEmailOptOut[\s\S]*?if \(!\(await isDirectory214Installed\(\)\)\) return "unavailable";/.test(listingsSrc) && /if \(!\(await isDirectory214Installed\(\)\)\) return \{ status: "unavailable" \};/.test(listingsSrc));
  check("before 214 the description is still required by the lister's actions", (read(FILES.actions).match(/validateListingInput\(values, \{ requireDescription: !\(await isDirectory214Installed\(\)\) \}\)/g) ?? []).length === 2);
  check("the list page shows the plain form before 214", /basic=\{!v214\}/.test(read(FILES.listPage)) && /listingValue\(v214\)/.test(read(FILES.listPage)));
  const manage = read(FILES.managePage);
  check("the manage page hides numbers, images and the email setting before 214", /editable && record\.v214/.test(manage) && /record\.v214 \? \(/.test(manage) && /basic=\{!record\.v214\}/.test(manage) && /live && record\.v214 \? await getListingStats/.test(manage));
  check("the counting route is a quiet no-op before 214", /if \(!\(await isDirectory214Installed\(\)\)\) return NO_CONTENT\(\);/.test(read("app/api/directory/listing-event/route.ts")));
  check("uploads explain they need the update before 214", /if \(!\(await isDirectory214Installed\(\)\)\) return refuse\(/.test(read("app/api/directory/media/route.ts")));
  check("the monthly run no-ops cleanly before 214", /if \(!\(await isDirectory214Installed\(\)\)\) \{\s*result\.installed = false;\s*return result;/.test(read("lib/directory/monthly-stats.ts")) && /!result\.installed \? "succeeded"/.test(read("app/api/cron/directory-stats/route.ts")));
  check("adding with permission explains it needs 214, in the form and the action", /Needs the directory update \(migration 214\)/.test(read("shared/components/platform-admin/directory/AddWithPermissionForm.tsx")) && /isDirectory214Installed\(\)\)\) return \{ error: "This needs the directory update/.test(read(FILES.ownerActions)));
  check("place counts fall back to the public search when directory_facets is missing", /if \(isMissingFunction\(error\)\) return facetsFromSearch\(\);/.test(read("lib/directory/places.ts")));
  check("public listings read without 214 keys show no details and no prompt", /row\.services === undefined && row\.hours === undefined \? \{ \.\.\.EMPTY_DIRECTORY_DETAILS \}/.test(listingsSrc) && /awaitingOwnerConfirmation: row\.awaiting_owner === true/.test(listingsSrc));
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
