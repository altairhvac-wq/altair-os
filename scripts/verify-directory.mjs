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
import { readFileSync, existsSync } from "node:fs";
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
  check("an empty form reports every required field at once", all.ok === false && ["businessName", "tradeType", "city", "state", "phone", "description"].every((k) => k in all.errors), Object.keys(all.errors ?? {}));
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
  check("submitting validates the form before anything else is done", /validateListingInput\(values\)/.test(body("submitListingAction")) && body("submitListingAction").indexOf("validateListingInput") < body("submitListingAction").indexOf("createListing("));
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
  check("six review actions", names.length === 6, names);
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
  check("a lister's website link passes no ranking and is marked as theirs", /rel="noopener noreferrer nofollow ugc"/.test(listing));
  check("the business page says licences are not verified", /do not verify licenses or insurance/.test(listing));
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
  check("the search page shows the mark only on a member's row", /\{listing\.isMember \? <DirectoryMemberBadge \/> : null\}/.test(search));
  check("the search page says members are listed first whenever one is on the page", /showsMembers = result\.listings\.some\(\(listing\) => listing\.isMember\)/.test(search) && /\{DIRECTORY_MEMBER_LABEL\}s are listed first\./.test(search));
  check("both public pages say what the mark means", /DIRECTORY_MEMBER_MEANING/.test(search) && /DIRECTORY_MEMBER_MEANING/.test(listing));
  check("the business page shows the mark only for a member", /\{listing\.isMember \? <DirectoryMemberBadge \/> : null\}/.test(listing));
  const manage = read(FILES.managePage);
  check("the manage page explains linking only for a live listing, and counts the trial link", /record\.status === "published" \? await getListingLinkState\(record\.id\) : null/.test(manage) && /href="\/signup" data-cta="directory-manage-member"/.test(manage));
  const emails = read(FILES.emails);
  check("the 'listing is live' email mentions linking once, and not on a change", /input\.changesOnly\s*\? ""\s*: `If you run your business on Altair Operating System, you can link this listing/.test(emails));
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
