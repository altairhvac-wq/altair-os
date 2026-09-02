/**
 * The Altair website as a first-party SEO publisher.
 *
 * Static and offline: the pure decision module is loaded and driven, and the
 * adapter, dispatcher, route, migration and settings wiring are read as
 * source. Nothing here opens a socket or touches a database.
 *
 * ==================== WHAT IS ASSERTED ====================
 * The rules that decide what becomes a public, indexed URL — and the ones
 * that keep this from becoming an SEO spam generator:
 *
 *   a thin page is refused before it is published
 *   a canonical pointing anywhere but this page is refused
 *   a dead internal link is refused
 *   a retry revises the SAME page rather than minting a second URL
 *   a draft is invisible to anonymous readers
 *   no database text is ever rendered as HTML
 *
 * Run: node scripts/verify-site-publishing.mjs
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

const read = (p) => readFileSync(p, "utf8");
const strip = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(new RegExp("//[^\\n]*", "g"), "");

const MIGRATION = "supabase/migrations/187_marketing_site_pages.sql";
const ADAPTER = "lib/integrations/altair-site/adapter.ts";
const QUERIES = "lib/database/queries/marketing-site-pages.ts";
const ROUTE = "app/(marketing)/insights/[slug]/page.tsx";
const ARTICLE = "shared/components/site/SitePageArticle.tsx";
const SITEMAP = "app/sitemap.ts";
const DISPATCH = "lib/publishing/dispatch.ts";
const GATE = "lib/publishing/gate.ts";

for (const path of [MIGRATION, ADAPTER, QUERIES, ROUTE, ARTICLE, SITEMAP]) {
  check(`${path} exists`, existsSync(path));
}
if (failures > 0) {
  console.error("\nMissing source; later checks would be vacuous.");
  process.exit(1);
}

// Comment-stripped, the way `verify-marketing-migrations.mjs` reads SQL.
// Matching the raw file made "has no body_html column" fail on the header
// sentence saying a body_html column must never be added — the check was
// reading the prose that forbids the thing as evidence of the thing.
const migration = read(MIGRATION)
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .toLowerCase();
const adapter = strip(read(ADAPTER));
const queries = strip(read(QUERIES));
const route = strip(read(ROUTE));
const article = read(ARTICLE);
const sitemap = strip(read(SITEMAP));
const dispatch = strip(read(DISPATCH));
const gate = strip(read(GATE));

const site = await loadPureModule("shared/types/site-page.ts", "site");

/* ===================================================== slug generation */

console.log("\nSlugs are addresses, not keyword bait");

check("a title becomes a hyphenated slug", site.slugify("Dispatch In One Place") === "dispatch-in-one-place");
check("punctuation and case are dropped", site.slugify("HVAC: What's *New*?!") === "hvac-what-s-new");
check("accents are folded rather than dropped", site.slugify("Café Résumé") === "cafe-resume");
check("leading and trailing separators are trimmed", site.slugify("  --Hello--  ") === "hello");
check("a title with nothing usable yields null", site.slugify("!!!") === null);
check("a too-short result is refused", site.slugify("a") === null);
check("a long title is clamped to the limit", (site.slugify("x".repeat(200)) ?? "").length <= site.SLUG_MAX_LENGTH);

check("valid slugs pass validation", ["abc", "a-b-c", "post-2"].every(site.isValidSlug));
for (const bad of ["", "ab", "-lead", "trail-", "Two--Hyphens", "UPPER", "has space", "has/slash", "has.dot", "../escape"]) {
  check(`refuses slug ${JSON.stringify(bad)}`, !site.isValidSlug(bad));
}

console.log("\nCollisions get their own address, never an overwrite");
check("a free slug is used as-is", site.uniqueSlug("guide", new Set()) === "guide");
check("a taken slug is suffixed", site.uniqueSlug("guide", new Set(["guide"])) === "guide-2");
check("suffixes keep climbing", site.uniqueSlug("guide", new Set(["guide", "guide-2"])) === "guide-3");
check("a suffixed slug is still valid", site.isValidSlug(site.uniqueSlug("guide", new Set(["guide"]))));
check(
  "a maximal slug stays within the limit after suffixing",
  (site.uniqueSlug("x".repeat(site.SLUG_MAX_LENGTH), new Set(["x".repeat(site.SLUG_MAX_LENGTH)])) ?? "").length <=
    site.SLUG_MAX_LENGTH,
);
check(
  "a hundred colliding pages is refused, not silently numbered forever",
  site.uniqueSlug("guide", new Set(["guide", ...Array.from({ length: 98 }, (_, i) => `guide-${i + 2}`)])) === null,
);

/* ================================================== canonical + publish */

console.log("\nCanonical URLs");
check("built from origin and slug", site.canonicalUrlFor("https://altair.test", "a-post") === "https://altair.test/insights/a-post");
check("a trailing slash on the origin is tolerated", site.canonicalUrlFor("https://altair.test/", "a-post") === "https://altair.test/insights/a-post");
check("http is refused — a canonical must be https", site.canonicalUrlFor("http://altair.test", "a-post") === null);
check("a non-origin is refused", site.canonicalUrlFor("not a url", "a-post") === null);
check("an invalid slug yields no canonical", site.canonicalUrlFor("https://altair.test", "BAD") === null);

const ORIGIN = "https://altair.test";
const goodDraft = (over = {}) => ({
  slug: "the-post",
  title: "The Post",
  metaTitle: "The Post",
  metaDescription: "A description of the post that a search engine can show.",
  canonicalUrl: "https://altair.test/insights/the-post",
  bodyMarkdown: "word ".repeat(200),
  internalLinks: [],
  keywords: ["hvac"],
  ...over,
});
const verdict = (over = {}, slugs = []) =>
  site.assertPublishableSitePage({
    draft: goodDraft(over),
    siteOrigin: ORIGIN,
    existingSlugs: new Set(slugs),
  });

console.log("\nWhat may become a public URL");
check("a complete page publishes", verdict().ok, verdict());

check("NO META TITLE is refused", !verdict({ metaTitle: null }).ok);
check("NO META DESCRIPTION is refused", !verdict({ metaDescription: null }).ok);
check(
  "an over-long meta title is refused",
  !verdict({ metaTitle: "x".repeat(site.META_TITLE_MAX + 1) }).ok,
);
check(
  "an over-long meta description is refused",
  !verdict({ metaDescription: "x".repeat(site.META_DESCRIPTION_MAX + 1) }).ok,
);

console.log("\nThin content is refused — this is the anti-spam floor");
check(
  "a body under the floor is refused",
  verdict({ bodyMarkdown: "too short" }).code === "body_too_thin",
);
check(
  "a body of exactly the floor is accepted",
  verdict({ bodyMarkdown: "x".repeat(site.BODY_MIN_LENGTH_FOR_PUBLISH) }).ok,
);
check(
  "whitespace does not pad a thin body past the floor",
  !verdict({ bodyMarkdown: " ".repeat(5000) }).ok,
);
check("the floor is a stated constant, not a literal", site.BODY_MIN_LENGTH_FOR_PUBLISH >= 600);
check(
  "the SAME floor is enforced in SQL, so no code path can go under it",
  migration.includes("char_length(body_markdown) >= 600"),
);

console.log("\nA canonical cannot point somewhere else");
check(
  "a canonical for a different page is refused",
  verdict({ canonicalUrl: "https://altair.test/insights/other" }).code === "canonical_mismatch",
);
check(
  "A CANONICAL ON ANOTHER DOMAIN IS REFUSED",
  verdict({ canonicalUrl: "https://competitor.test/insights/the-post" }).code === "canonical_mismatch",
);
check("a missing canonical is refused", !verdict({ canonicalUrl: null }).ok);
check(
  "the adapter DERIVES the canonical rather than trusting the package",
  adapter.includes("canonicalUrlFor(config.siteOrigin, slug)") &&
    !adapter.includes("input.seo.canonicalUrl"),
);

console.log("\nInternal links must point at real pages");
check("a link to a published page is accepted", verdict({ internalLinks: ["other"] }, ["other"]).ok);
check(
  "a DEAD internal link is refused",
  verdict({ internalLinks: ["ghost"] }, []).code === "dead_internal_link",
);
check(
  "a malformed internal link is refused",
  verdict({ internalLinks: ["Not A Slug"] }, []).code === "invalid_internal_link",
);
check(
  "a self-link is refused",
  verdict({ internalLinks: ["the-post"] }, ["the-post"]).code === "self_internal_link",
);

console.log("\nNo script reaches a public page");
check(
  "a body carrying a script tag is refused",
  verdict({ bodyMarkdown: `${"x".repeat(700)}<script>alert(1)</script>` }).code === "body_contains_script",
);
check(
  "the article renderer never injects database text as HTML",
  !/dangerouslySetInnerHTML=\{\{\s*__html:\s*(bodyMarkdown|title|block)/.test(article),
);
check(
  "the only raw HTML is the JSON-LD block, and it is escaped first",
  article.includes("serializeJsonLd(structuredData)") &&
    article.includes('replace(/</g, "\\\\u003c")'),
);
check(
  "the migration stores markdown and has no body_html column",
  migration.includes("body_markdown") && !migration.includes("body_html"),
);

/* ============================================== structured data */

console.log("\nStructured data claims only what the page supports");
const ld = site.buildArticleStructuredData({
  title: "The Post",
  metaDescription: "A description.",
  canonicalUrl: "https://altair.test/insights/the-post",
  publishedAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  publisherName: "Altair OS",
});
check("it is schema.org Article", ld["@type"] === "Article" && ld["@context"] === "https://schema.org");
check("it names the canonical as the entity", ld.url === "https://altair.test/insights/the-post");
check("it carries published and modified dates", Boolean(ld.datePublished && ld.dateModified));
check(
  "IT CLAIMS NO RATINGS OR REVIEWS — the fields that earn manual actions",
  !("aggregateRating" in ld) && !("review" in ld),
);

/* ================================================== idempotency + revisions */

console.log("\nA retry revises the page; it does not mint a second URL");
check(
  "the slug is unique per company in SQL",
  migration.includes("unique (company_id, slug)"),
);
check(
  "one page per content package, so a repeated publish converges",
  migration.includes("marketing_site_pages_package_key"),
);
check(
  "publishing an existing slug UPDATES rather than inserts",
  queries.includes("existing\n    ? await sitePagesTable(supabase)\n        .update(payload)") ||
    /existing[\s\S]{0,80}\.update\(payload\)/.test(queries),
);
check(
  "a slug owned by a different package is refused rather than overwritten",
  queries.includes("already belongs to a different content package"),
);
check(
  "THE PACKAGE ID IS ITS OWN INPUT, not the connection's resource id",
  // Regression. The adapter passed `post.providerResourceId` as the content
  // package id, and for a first-party connection that value is the SITE
  // ("altair-site") — a connection identifier being written into a uuid
  // column with a composite foreign key. Every publish would have failed on
  // the cast, and the one-page-per-package index would have been meaningless
  // if it had not. Found by inspection before the first canary publish.
  adapter.includes("contentPackageId: input.contentPackageId") &&
    !adapter.includes("contentPackageId: input.post.providerResourceId"),
);
check(
  "the dispatcher forwards a package id rather than inventing one",
  dispatch.includes("contentPackageId: input.contentPackageId ?? null"),
);
check("the revision counter increments on republish", queries.includes("existing.revision + 1"));
check("every publish appends a revision snapshot", queries.includes("revisionsTable(supabase).insert"));
check(
  "the revision table is append-only to operators",
  migration.includes("revoke insert, update, delete on table public.marketing_site_page_revisions from authenticated"),
);

/* ========================================================= the ledger */

console.log("\nThe existing queue and ledger are reused, not forked");
check(
  "the first-party branch claims a delivery like any other publish",
  dispatch.includes("dispatchFirstParty") && /dispatchFirstParty[\s\S]*claimDelivery\(/.test(dispatch),
);
check(
  "it settles the same ledger on success",
  /dispatchFirstParty[\s\S]*outcome: "posted"/.test(dispatch),
);
check(
  "and settles FAILED rather than stranding a claim",
  /dispatchFirstParty[\s\S]*outcome: "failed"/.test(dispatch),
);
check(
  "a duplicate is refused by the ledger, not by application logic",
  /dispatchFirstParty[\s\S]*claim\.decision !== "PROCEED"/.test(dispatch),
);
check(
  "NO SECOND QUEUE TABLE was created",
  !migration.includes("create table") ||
    (!migration.includes("publish_jobs") && !migration.includes("_queue")),
);

/* ============================================================ the gate */

console.log("\nThe gate is intact");
check(
  "the kill switch still applies to the first-party path",
  dispatch.indexOf("assertPublishPreconditions(") < dispatch.indexOf("dispatchFirstParty"),
);
check(
  "an asset source is still refused as a destination",
  gate.includes("this connection only produces creative"),
);
check(
  "a first-party publish records who published it",
  dispatch.includes("input.publishedBy") && adapter.includes("publishedBy"),
);
check(
  "the adapter exposes publishFirstParty and NOT publish",
  adapter.includes("publishFirstParty") && !/^\s*async publish\(/m.test(adapter),
);

/* ================================================= drafts stay private */

console.log("\nDrafts are not public");
check(
  "the RLS policy exposes published rows only",
  migration.includes("using (page_state = 'published')"),
);
check(
  "the public read goes through the RLS client, not the service role",
  queries.includes("createReadClient") &&
    /getPublishedSitePageBySlug[\s\S]{0,400}createReadClient\(\)/.test(queries),
);
check(
  "the public route filters on published as well",
  route.includes("getPublishedSitePageBySlug"),
);
check(
  "an invalid slug 404s before any query",
  route.indexOf("isValidSlug(slug)") < route.indexOf("getPublishedSitePageBySlug(slug)"),
);
check(
  "anon may read pages but never revisions",
  migration.includes("grant select on table public.marketing_site_pages to anon") &&
    migration.includes("revoke all on table public.marketing_site_page_revisions from anon"),
);
check(
  "anon can never write a page",
  migration.includes("revoke insert, update, delete on table public.marketing_site_pages from anon"),
);
check(
  "anon is granted SELECT and nothing else",
  !/grant\s+(all|insert|update|delete)[^;]*to[^;]*anon/.test(migration),
);

/* ====================================================== discoverability */

console.log("\nThe page is discoverable and canonical");
check("a sitemap exists", sitemap.includes("MetadataRoute.Sitemap"));
check(
  "it advertises the RECORDED canonical, not a rebuilt URL",
  sitemap.includes("page.canonicalUrl") && !sitemap.includes("canonicalUrlFor("),
);
check(
  "a page without a canonical is skipped rather than guessed at",
  sitemap.includes("filter((page) => Boolean(page.canonicalUrl))"),
);
check("the route emits the canonical as alternates", route.includes("alternates: { canonical"));

/* ============================ the middleware ============================ */

console.log("\nA published page is reachable by an anonymous visitor");

const middleware = strip(read("lib/supabase/middleware.ts"));

// Scoped to the BODY of `isPublicRoute`, not the whole file. Matching the
// file passed on the function DEFINITION — deleting the call from
// `isPublicRoute` (which is the actual regression) left the definition in
// place and the check green. Mutation-checking found that; reading it did
// not.
const publicRouteBody = (() => {
  const start = middleware.indexOf("function isPublicRoute");
  if (start === -1) return "";
  return middleware.slice(start, middleware.indexOf("}", start));
})();

check(
  "the isPublicRoute body was located, so the checks below are not vacuous",
  publicRouteBody.length > 0 && publicRouteBody.includes("isAuthRoute(pathname)"),
);
check(
  "THE ARTICLE ROUTE IS PUBLIC AT THE MIDDLEWARE LAYER",
  // Regression. The first live canary published a page that was `published`,
  // had a canonical, and 307'd every anonymous visitor to /login — a reader
  // saw a login form and a crawler would have indexed the redirect. The page
  // existed and was unreachable, which is not published.
  publicRouteBody.includes("isSitePageRoute(pathname)"),
);
check(
  "the sitemap is public too, or nothing can discover the page",
  publicRouteBody.includes("isSitemapRoute(pathname)"),
);
check(
  "the exemption covers the whole article prefix, not one hardcoded slug",
  middleware.includes('pathname.startsWith(`${SITE_PAGE_ROUTE_PREFIX}/`)'),
);
check(
  "being public at the middleware does not expose drafts — RLS still decides",
  migration.includes("using (page_state = 'published')"),
);
check("the route emits a meta description", route.includes("description: page.metaDescription"));

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
