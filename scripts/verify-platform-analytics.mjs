/**
 * Platform analytics verification (migration 202).
 *
 * Executes the SHIPPED pure rules (via the alias loader: typescript: true in
 * verify-all) and statically checks the privacy and safety guarantees the
 * feature promises:
 *
 *   - tokens never leave the browser in a beacon (path sanitising);
 *   - a "social" visit is social, a search visit is search (classification);
 *   - unknown is never shown as zero, a 0-denominator rate is null;
 *   - MRR normalises intervals and quantities and skips unpriced items;
 *   - the ingest route refuses cross-site, bots, non-production and platform
 *     admins, and cannot be used to forge signup_completed;
 *   - the tracker honours Global Privacy Control / Do Not Track;
 *   - the middleware exempts exactly one path;
 *   - the analytics table is service-role only.
 *
 * Offline and side-effect free.
 */
import { readFileSync } from "node:fs";

const attribution = await import("@/shared/lib/analytics/attribution");
const metrics = await import("@/shared/lib/analytics/platform-metrics");

let checks = 0;
let failures = 0;
function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}
const read = (path) => readFileSync(path, "utf8");

// ------------------------------------------------------------------ paths
console.log("\nPaths are sanitised before they are stored");
const { sanitizePath } = attribution;
check("query and fragment dropped", sanitizePath("/pricing?utm_source=x#top") === "/pricing");
check("estimate approval token removed", sanitizePath("/estimate-approval/abc123secret") === "/estimate-approval");
check("invoice payment token removed", sanitizePath("/invoice-payment/tok_live_secret/pay") === "/invoice-payment");
check("auth callback code removed", sanitizePath("/auth/callback?code=xyz") === "/auth/callback");
check("record uuid collapsed", sanitizePath("/jobs/3f2b9c1e-1111-4222-8333-444455556666") === "/jobs/[id]");
check("garbage becomes /", sanitizePath("javascript:alert(1)") === "/" && sanitizePath(null) === "/");
check("length capped at 512", sanitizePath(`/${"a".repeat(900)}`).length <= 512);

// ------------------------------------------------------------------ channels
console.log("\nChannels are classified from UTM first, then the referrer");
const ch = (referrerHost, utmSource = null, utmMedium = null) =>
  attribution.classifyChannel({ referrerHost, utmSource, utmMedium });
check("YouTube referrer → social", ch("www.youtube.com") === "social");
check("youtu.be → social", ch("youtu.be") === "social");
check("Facebook link shim → social", ch("l.facebook.com") === "social");
check("Instagram → social", ch("l.instagram.com") === "social");
check("TikTok → social", ch("www.tiktok.com") === "social");
check("Google → search", ch("www.google.com") === "search");
check("Google ccTLD → search", ch("www.google.co.uk") === "search");
check("Bing → search", ch("www.bing.com") === "search");
check("no referrer, no utm → direct", ch(null) === "direct");
check("own host → internal", ch("app.altair-op.com") === "internal");
check("other site → referral", ch("hvac-talk.com") === "referral");
check("utm_source=youtube with no referrer → social", ch(null, "youtube", "video") === "social");
check("utm_medium=cpc wins → paid", ch("www.google.com", "google", "cpc") === "paid");
check("utm_medium=email → email", ch(null, "newsletter", "email") === "email");
check("look-alike google.evil.io is not search", ch("google.evil.io") === "referral");
check("notgoogle.com is not search", ch("notgoogle.com") === "referral");
check("google.com.au is search", ch("www.google.com.au") === "search");

// ------------------------------------------------------------------ devices + bots
console.log("\nDevices and bots");
check("iPhone → mobile", attribution.deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148") === "mobile");
check("Android phone → mobile", attribution.deviceFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari") === "mobile");
check("iPad → tablet", attribution.deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)") === "tablet");
check("Windows → desktop", attribution.deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130") === "desktop");
check("Googlebot is a bot", attribution.isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)"));
check("facebookexternalhit is a bot", attribution.isBotUserAgent("facebookexternalhit/1.1"));
check("HeadlessChrome is a bot", attribution.isBotUserAgent("Mozilla/5.0 HeadlessChrome/130"));
check("missing user agent is treated as a bot", attribution.isBotUserAgent(null));
check("real Chrome is not a bot", !attribution.isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"));

// ------------------------------------------------------------------ attribution
console.log("\nAttribution from the browser is validated");
const a = attribution.sanitizeAttribution({
  source: " YouTube ",
  medium: "Video",
  campaign: "hvac-capacitor",
  referrerHost: "https://m.youtube.com/watch?v=x",
  landingPath: "/estimate-approval/secret",
  firstSeenAt: "2026-10-18T10:00:00Z",
  injected: "<script>",
});
check("source lower-cased and trimmed", a?.source === "youtube" && a?.medium === "video");
check("referrer reduced to a host", a?.referrerHost === "m.youtube.com");
check("landing path sanitised", a?.landingPath === "/estimate-approval");
check("unknown keys dropped", a && !("injected" in a));
check("empty object → null", attribution.sanitizeAttribution({}) === null);
check("oversized JSON refused", attribution.parseAttributionJson(`{"source":"${"x".repeat(3000)}"}`) === null);
check("client ids must look random", attribution.isValidClientId("abcDEF123_-abcdef12") && !attribution.isValidClientId("short") && !attribution.isValidClientId("has space in it 12345"));

// ------------------------------------------------------------------ metrics
console.log("\nUnknown is not zero");
check("rate with zero denominator is null", metrics.rate(5, 0) === null);
check("rate with unknown numerator is null", metrics.rate(null, 10) === null);
check("rate computes", metrics.rate(1, 4) === 0.25);
check("percentChange with no previous is null", metrics.percentChange(5, 0) === null);

console.log("\nFunnel");
const funnel = metrics.buildFunnel([
  { key: "visit", label: "Visit", count: null, source: "tracking" },
  { key: "signup", label: "Signup", count: 20, source: "accounts" },
  { key: "trial", label: "Trial", count: 10, source: "companies" },
  { key: "active", label: "Active", count: 2, source: "records" },
  { key: "paid", label: "Paid", count: 1, source: "subscriptions" },
]);
check("unmeasured step stays null", funnel.steps[0].count === null && funnel.steps[0].fromPrevious === null);
check("first measured step has no previous rate", funnel.steps[1].fromPrevious === null);
check("step conversion computed from the previous measured step", funnel.steps[2].fromPrevious === 0.5);
check("bottleneck is the biggest drop (trial → active, 20%)", funnel.bottleneck?.key === "active");
const tiny = metrics.buildFunnel([
  { key: "a", label: "A", count: 2, source: "x" },
  { key: "b", label: "B", count: 0, source: "x" },
]);
check("no bottleneck from a step of fewer than 3 people", tiny.bottleneck === null);

console.log("\nMRR normalisation");
const monthly = metrics.monthlyAmountFromStripeItems({
  data: [{ quantity: 1, price: { unit_amount: 3900, recurring: { interval: "month", interval_count: 1 } } }],
});
check("monthly $39 → 3900", monthly.cents === 3900 && monthly.unpriced === 0);
const annual = metrics.monthlyAmountFromStripeItems([
  { quantity: 1, price: { unit_amount: 39000, recurring: { interval: "year", interval_count: 1 } } },
]);
check("annual $390 → 3250 a month", annual.cents === 3250);
const seats = metrics.monthlyAmountFromStripeItems([
  { quantity: 3, price: { unit_amount: 1000, recurring: { interval: "month" } } },
]);
check("quantity multiplies", seats.cents === 3000);
const legacy = metrics.monthlyAmountFromStripeItems([{ plan: { amount: 7900, interval: "month" } }]);
check("legacy plan object understood", legacy.cents === 7900);
const unpriced = metrics.monthlyAmountFromStripeItems([{ quantity: 1, price: { unit_amount: null } }]);
check("unpriced item reported, not guessed", unpriced.cents === 0 && unpriced.unpriced === 1);
check("churn rate null with nobody paying", metrics.churnRate(0, 0) === null);

console.log("\nRanges and days");
const range = metrics.resolveAnalyticsRange("7d", Date.parse("2026-10-19T12:00:00Z"));
check("7d range spans 7 days", Date.parse(range.toIso) - Date.parse(range.fromIso) === 7 * 86400000);
check("unknown range key falls back to 30d", metrics.resolveAnalyticsRange("bogus", Date.now()).key === "30d");
const days = metrics.utcDayKeys("2026-10-10T15:00:00Z", "2026-10-12T01:00:00Z");
check("utc day keys inclusive", JSON.stringify(days) === JSON.stringify(["2026-10-10", "2026-10-11", "2026-10-12"]));
check(
  "countByUtcDay fills missing days with 0",
  JSON.stringify(metrics.countByUtcDay(["2026-10-11T09:00:00Z", "2026-10-11T23:00:00Z", null], days).map((d) => d.value)) === "[0,2,0]",
);

// ------------------------------------------------------------------ static guarantees
console.log("\nIngest route");
const route = read("app/api/analytics/collect/route.ts");
check("only pageview and signup_started accepted from browsers", /CLIENT_EVENTS = new Set\(\["pageview", "signup_started"\]\)/.test(route));
check("signup_completed cannot be posted by a browser", !/CLIENT_EVENTS[^\n]*signup_completed/.test(route));
check("cross-site origins refused", /if \(!isSameOriginBeacon\(request\)\) return NO_CONTENT\(\)/.test(route));
check("origin check fails closed (exact host:port, no Host means refuse)", /originHost === hostHeader/.test(route) && /Boolean\(hostHeader\)/.test(route) && /catch \{\s*return false;/.test(route));
check("bots refused", /isBotUserAgent\(userAgent\)/.test(route));
check("recording gated to production (or an explicit test flag)", /isAnalyticsRecordingEnabled\(\)/.test(route));
check("platform admins never recorded", /canAccessPlatformAdmin\(user\)\) return NO_CONTENT/.test(route));
check("rate limited per address", /enforcePublicRateLimit\("public\.analytics_collect"/.test(route));
check("body size capped", /text\.length > MAX_BODY/.test(route));
const events = read("lib/analytics/server-events.ts");
check("visitor ids are hashed before storage", /visitor_hash: hashAuditSubject\("analytics_visitor"/.test(events));
check("paths sanitised server-side too", /path: sanitizePath\(input\.path\)/.test(events));
check("retries cannot double-count (dedupe key upsert)", /onConflict: "dedupe_key", ignoreDuplicates: true/.test(events));
check("production-only by default", /VERCEL_ENV === "production"/.test(events));

console.log("\nBrowser tracker");
const client = read("shared/lib/analytics/client.ts");
check("Global Privacy Control honoured", /globalPrivacyControl === true\) return false/.test(client));
check("Do Not Track honoured", /doNotTrack === "1"/.test(client));
check("device opt-out supported", /altair_analytics/.test(client) && /OPT_OUT_KEY/.test(client));
check("no cookies are set by the tracker", !/document\.cookie/.test(client));
const layout = read("app/layout.tsx");
check("tracker mounted once in the root layout", (layout.match(/<FirstPartyAnalytics \/>/g) ?? []).length === 1);

console.log("\nPerimeter and data access");
const middleware = read("lib/supabase/middleware.ts");
check("exactly the collect path is public", /pathname === ANALYTICS_COLLECT_ROUTE/.test(middleware) && /ANALYTICS_COLLECT_ROUTE = "\/api\/analytics\/collect"/.test(middleware));
check("no /api/analytics prefix exemption", !/startsWith\(["'`]\/api\/analytics/.test(middleware));
const migration = read("supabase/migrations/202_first_party_web_analytics.sql").replace(/--[^\n]*/g, "").toLowerCase();
check("no IP or user-agent column", !/\b(ip_address|ip|user_agent)\s+(text|inet)/.test(migration));
check("anon and authenticated get nothing", /revoke all on table public\.web_analytics_events from anon/.test(migration) && /revoke all on table public\.web_analytics_events from authenticated/.test(migration));
check("summary function executable by service_role only", /grant execute on function public\.platform_web_analytics_summary\(timestamptz, timestamptz\) to service_role/.test(migration) && !/to authenticated/.test(migration.split("platform_web_analytics_summary").slice(-1)[0]));
const page = read("app/(admin)/platform/analytics/page.tsx");
check("analytics page re-checks platform admin", /await requirePlatformAdmin\(\)/.test(page));
const service = read("lib/database/services/platform-analytics.ts");
check("multi-row reads page past PostgREST's 1,000-row cap", /\.range\(from, to\)/.test(service) && /PAGE_SIZE = 1000/.test(service));
check("internal and demo companies excluded", /internalCompanyIds/.test(service) && /parseCompanyDemoDataSettings/.test(service));
check("expiring-trial list only includes trials with time left", /return left > 0 && left <= EXPIRING_WITHIN_DAYS \* DAY_MS;/.test(service));
check("past-end Stripe trials surface as a sync warning", /label: "Trial status sync"/.test(service));
check("active trials use the app's effective trial status", /resolveEffectiveSubscriptionStatus/.test(service));

console.log(`\n${checks} checks, ${failures} failures`);
process.exit(failures ? 1 : 0);
