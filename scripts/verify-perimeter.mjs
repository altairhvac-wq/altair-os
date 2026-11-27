/**
 * Perimeter and production-configuration verification (Phase 3).
 *
 * Covers the launch-audit findings that harden the deployment boundary:
 *
 *   P1-2   security response headers
 *   P1-3   internal-only surfaces are not customer-visible
 *   P1-4   platform admin is configuration, not a hard-coded literal
 *   P1-6   the email override cannot silently redirect customer mail
 *   P1-7   every declared production variable is documented
 *   P1-10  the media ingest route can actually reach its handler
 *   P1-13  one constant-time bearer comparison, not several
 *
 * Offline and side-effect free: no network, no credential, no database.
 *
 * Run: node scripts/verify-perimeter.mjs
 */
import { readFileSync, existsSync } from "node:fs";

let failures = 0;
let checks = 0;

function check(name, condition) {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}`);
  }
}

/**
 * Strips comments so no check can be satisfied by prose.
 *
 * Line comments are removed FIRST, deliberately. A line comment that happens to
 * contain the two characters that open a block comment — a path alias written
 * inline, say — would otherwise let the block-comment regex swallow real code
 * up to the next close marker, silently flipping a check's result. That
 * happened while writing these verifiers, and it reported a passing config as
 * failing.
 */
function loadTs(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

// ============================================================ P1-2 headers
console.log("\nP1-2 — security response headers");

const headersModule = await import("../lib/security/response-headers.ts").catch(
  () => null,
);

const headersSource = loadTs("lib/security/response-headers.ts");
const nextConfig = loadTs("next.config.ts");

check(
  "next.config applies the header set to every path",
  /async\s+headers\s*\(\s*\)/.test(nextConfig) &&
    /source:\s*"\/:path\*"/.test(nextConfig) &&
    /buildSecurityHeaders\s*\(/.test(nextConfig),
);

check(
  "the framework version is not advertised",
  /poweredByHeader:\s*false/.test(nextConfig),
);

// Structural assertions on the policy builder. Node can import a .ts module
// directly under type-stripping; if it cannot, fall back to source assertions
// so the verifier still means something.
if (headersModule?.buildSecurityHeaders) {
  const prod = headersModule.buildSecurityHeaders({
    supabaseUrl: "https://example-project.supabase.co",
    isDevelopment: false,
  });
  const dev = headersModule.buildSecurityHeaders({
    supabaseUrl: "https://example-project.supabase.co",
    isDevelopment: true,
  });
  const byKey = (list, key) => list.find((h) => h.key === key)?.value ?? "";
  const prodCsp = byKey(prod, "Content-Security-Policy");

  check("CSP forbids framing (clickjacking)", /frame-ancestors 'none'/.test(prodCsp));
  check("CSP forbids plugin content", /object-src 'none'/.test(prodCsp));
  check("CSP pins base URI", /base-uri 'self'/.test(prodCsp));
  check("CSP restricts form submission targets", /form-action 'self'/.test(prodCsp));
  check(
    "CSP allows the Supabase origin for REST, realtime and signed storage",
    prodCsp.includes("https://example-project.supabase.co") &&
      prodCsp.includes("wss://example-project.supabase.co"),
  );
  check(
    "CSP allows the Mapbox hosts mapbox-gl actually calls",
    prodCsp.includes("https://api.mapbox.com") &&
      prodCsp.includes("https://events.mapbox.com"),
  );
  check(
    "CSP allows blob: workers, which mapbox-gl requires",
    /worker-src[^;]*blob:/.test(prodCsp),
  );
  check(
    "CSP allows the Meta Pixel script host",
    prodCsp.includes("https://connect.facebook.net"),
  );
  check(
    "production CSP contains no 'unsafe-eval'",
    !prodCsp.includes("'unsafe-eval'"),
  );
  check(
    "development CSP does contain 'unsafe-eval' (the dev server needs it)",
    byKey(dev, "Content-Security-Policy").includes("'unsafe-eval'"),
  );
  check(
    "HSTS is sent in production",
    /max-age=63072000/.test(byKey(prod, "Strict-Transport-Security")),
  );
  check(
    "HSTS is NOT sent in development (never pin HTTPS on localhost)",
    byKey(dev, "Strict-Transport-Security") === "",
  );
  check("X-Frame-Options DENY is present", byKey(prod, "X-Frame-Options") === "DENY");
  check(
    "X-Content-Type-Options nosniff is present",
    byKey(prod, "X-Content-Type-Options") === "nosniff",
  );
  check(
    "Referrer-Policy does not leak full URLs cross-site (token-bearing paths)",
    byKey(prod, "Referrer-Policy") === "strict-origin-when-cross-origin",
  );
  check(
    "Permissions-Policy denies payment, camera and microphone",
    /payment=\(\)/.test(byKey(prod, "Permissions-Policy")) &&
      /camera=\(\)/.test(byKey(prod, "Permissions-Policy")) &&
      /microphone=\(\)/.test(byKey(prod, "Permissions-Policy")),
  );
  check(
    "a malformed Supabase URL does not produce a broken CSP",
    !headersModule
      .buildContentSecurityPolicy({ supabaseUrl: "not a url", isDevelopment: false })
      .includes("not a url"),
  );

  // ---- the one framing exception: the embeddable calculators under /embed/
  const embed = headersModule.buildEmbedHeaderOverrides({
    supabaseUrl: "https://example-project.supabase.co",
    isDevelopment: false,
  });
  const embedCsp = byKey(embed, "Content-Security-Policy");
  const embedIds = ["labor-rate", "break-even", "job-profitability"];
  const embedSource = headersModule.buildEmbedHeaderSource(embedIds);
  check(
    "the framing exception names each embed page, never the /embed folder",
    embedSource === "/embed/:tool(labor-rate|break-even|job-profitability)" && !/:path|\*/.test(embedSource),
    embedSource,
  );
  const refuses = (ids) => {
    try {
      headersModule.buildEmbedHeaderSource(ids);
      return false;
    } catch {
      return true;
    }
  };
  check(
    "an embed id that could widen the exception is refused (pattern characters, slashes, capitals, none)",
    [[":path*"], ["a|.*"], ["a/b"], ["(.*)"], ["Labor"], [""], []].every(refuses),
  );
  const embedsSource = loadTs("shared/lib/resources/embeds.ts");
  check(
    "the embed pages listed in the app are the three the exception is checked against",
    embedIds.every((id) => new RegExp(`id: "${id}"`).test(embedsSource)) && (embedsSource.match(/^    id: "/gm) ?? []).length === embedIds.length,
    (embedsSource.match(/^    id: "[^"]+"/gm) ?? []).join(", "),
  );
  check(
    "the embed override replaces exactly two headers (CSP and X-Frame-Options)",
    embed.length === 2 && embed.map((h) => h.key).sort().join() === "Content-Security-Policy,X-Frame-Options",
    embed.map((h) => h.key),
  );
  check(
    "the embed CSP is the site CSP with only frame-ancestors changed",
    embedCsp === prodCsp.replace("frame-ancestors 'none'", "frame-ancestors *") && embedCsp !== prodCsp,
  );
  check(
    "the embed CSP keeps object-src, base-uri and form-action locked",
    /object-src 'none'/.test(embedCsp) && /base-uri 'self'/.test(embedCsp) && /form-action 'self'/.test(embedCsp),
  );
  check(
    "the embed override does not send X-Frame-Options DENY or SAMEORIGIN",
    !/^(DENY|SAMEORIGIN)$/i.test(byKey(embed, "X-Frame-Options")),
  );
  check(
    "asking for no frame option still forbids framing",
    /frame-ancestors 'none'/.test(headersModule.buildContentSecurityPolicy({ isDevelopment: false })),
  );
  check(
    "next.config applies the embed override once, after the full set, on the listed embed pages",
    (nextConfig.match(/buildEmbedHeaderOverrides\(/g) ?? []).length === 1 &&
      nextConfig.indexOf('source: "/:path*", headers: securityHeaders') > -1 &&
      nextConfig.indexOf('source: "/:path*", headers: securityHeaders') <
        nextConfig.indexOf("source: buildEmbedHeaderSource(EMBED_TOOLS.map((tool) => tool.id)), headers: buildEmbedHeaderOverrides("),
  );
  const embedPage = loadTs("app/embed/[tool]/page.tsx");
  const embedFrame = loadTs("shared/components/resources/embed/EmbedFrame.tsx");
  check(
    "an embed page has no server action, no database client and no form that posts",
    ![embedPage, embedFrame].some((source) => /use server|@\/app\/actions|supabase|<form[^>]*action=/.test(source)),
  );
  check("embed pages are built for the listed tools only", /dynamicParams = false/.test(embedPage));
  check("embed pages are not indexed", /robots:\s*\{\s*index:\s*false/.test(embedPage));
  check(
    "links inside an embed open a new tab instead of navigating the frame",
    /onClickCapture/.test(embedFrame) && /preventDefault\(\)/.test(embedFrame) && /window\.open\(/.test(embedFrame),
  );
  const embedLayout = loadTs("app/embed/layout.tsx");
  check(
    "links inside an embed open a new tab before the script loads too (<base target>, no href)",
    /<base target="_blank" \/>/.test(embedLayout) && !/<base[^>]*href/.test(embedLayout),
  );
  const embedError = loadTs("app/embed/error.tsx");
  check(
    "the embed error screen has no link that could walk the frame to the rest of the site",
    !/<a|<Link|next\/link|href=/.test(embedError) && /retry\(\)/.test(embedError),
  );
  const frameGuard = loadTs("shared/components/security/FrameGuard.tsx");
  check(
    "a page that is not a listed embed blanks itself inside a frame (FrameGuard, mounted in the root layout)",
    /window\.self === window\.top/.test(frameGuard) &&
      /if \(isEmbedPath\(pathname\)\) return;/.test(frameGuard) &&
      /location\.replace\("about:blank"\)/.test(frameGuard) &&
      /<FrameGuard \/>/.test(loadTs("app/layout.tsx")),
  );
  check(
    "FrameGuard does not rely on a reload being refused (no loop on an address the headers allow)",
    !/location\.reload\(|location\.replace\(window\.location\.href\)|startsWith\(/.test(frameGuard.replace(/\/\*[\s\S]*?\*\//g, "")),
  );
  check(
    "the embed-path test is an exact match against the listed pages",
    /export function isEmbedPath\(pathname: string\): boolean \{\s*return EMBED_TOOLS\.some\(\(tool\) => embedPath\(tool\.id\) === pathname\);/.test(embedsSource),
  );
  check(
    "the compact calculator's link, which carries the typed numbers, is never preloaded",
    /<Link\s+href=\{fullHref\}\s+prefetch=\{false\}/.test(loadTs("shared/components/resources/calc/CompactCalculator.tsx")),
  );
  check(
    "nothing is kept for the other calculators from inside a frame",
    /if \(window\.self !== window\.top\) return false;/.test(loadTs("shared/components/resources/calc/carry.ts")),
  );
  check(
    "the middleware opens /embed/ as a public prefix and nothing wider",
    /function isEmbedRoute\(pathname: string\) \{\s*return pathname\.startsWith\(`\$\{EMBED_ROUTE_PREFIX\}\/`\);/.test(loadTs("lib/supabase/middleware.ts")),
  );
  check(
    "the embed pages are public (no sign-in) and served on the marketing host",
    /function isPublicRoute[\s\S]*?isEmbedRoute\(pathname\)/.test(loadTs("lib/supabase/middleware.ts")) &&
      /function isMarketingRoute[\s\S]*?isEmbedRoute\(pathname\)[\s\S]*?function isPublicRoute/.test(loadTs("lib/supabase/middleware.ts")),
  );
} else {
  console.log("  (module import unavailable — falling back to source assertions)");
  check("CSP forbids framing", /frame-ancestors.*'none'/.test(headersSource));
  check("HSTS is production-only", /if\s*\(!options\.isDevelopment\)/.test(headersSource));
}

// ============================================================ P1-6 email
console.log("\nP1-6 — the email override cannot silently redirect in production");

const recipient = loadTs("lib/email/recipient.ts");
const resend = loadTs("lib/email/resend.ts");

check(
  "production is detected from both NODE_ENV and VERCEL_ENV",
  /NODE_ENV === "production"/.test(recipient) &&
    /VERCEL_ENV\?\.trim\(\) === "production"/.test(recipient),
);

check(
  "the override is ignored in production and mail goes to the real recipient",
  /if\s*\(isProductionRuntime\(\)\)\s*\{[\s\S]{0,900}?to:\s*intendedRecipient,[\s\S]{0,200}?redirected:\s*false/.test(
    recipient,
  ),
);

check(
  "the production case is flagged for the caller to report",
  /overrideIgnoredInProduction:\s*true/.test(recipient),
);

check(
  "the send path reports the misconfiguration to the error monitor",
  /overrideIgnoredInProduction/.test(resend) &&
    /email\.recipient_override_ignored_in_production/.test(resend),
);

check(
  "a redirect can no longer be reached from a production runtime",
  // The only `redirected: true` return sits after the production early-return.
  recipient.indexOf("isProductionRuntime()") <
    recipient.indexOf("redirected: true"),
);

// ============================================================ P1-13 bearer
console.log("\nP1-13 — one constant-time bearer comparison");

const bearer = loadTs("lib/operations/bearer-auth.ts");
const cronEnv = loadTs("lib/automation/env.ts");
const agentEnv = loadTs("lib/agent-bridge/env.ts");
const ingestRoute = loadTs("app/api/marketing/media/ingest/route.ts");

check(
  "the shared comparison uses timingSafeEqual over fixed-length digests",
  /timingSafeEqual\s*\(/.test(bearer) && /createHash\("sha256"\)/.test(bearer),
);

check(
  "the shared comparison does not short-circuit on length",
  !/provided\.length\s*!==\s*expected\.length/.test(bearer),
);

check(
  "cron authorization uses the shared comparison",
  /isAuthorizedBearerRequest\s*\(/.test(cronEnv) &&
    !/authorization === `Bearer \$\{secret\}`/.test(cronEnv),
);

check(
  "the agent bridge uses the shared comparison and keeps no private copy",
  /isAuthorizedBearerRequest\s*\(/.test(agentEnv) &&
    !/function secretsMatch/.test(agentEnv),
);

check(
  "media ingest uses the shared comparison and keeps no private copy",
  /isAuthorizedBearerRequest|secretsMatch/.test(ingestRoute) &&
    !/function secretMatches/.test(ingestRoute),
);

// ============================================================ P1-4 admin
console.log("\nP1-4 — platform admin is configuration");

// The allowlist itself lives in platform-admin-emails.ts (split out so modules
// that only need the list do not import next/navigation); platform-admin.ts
// re-exports it and keeps requirePlatformAdmin. Both are checked.
const platformAdmin = loadTs("lib/database/platform-admin-emails.ts");
const platformAdminGate = loadTs("lib/database/platform-admin.ts");

check(
  "platform-admin.ts re-exports the allowlist instead of redefining it",
  /from "@\/lib\/database\/platform-admin-emails"/.test(platformAdminGate) &&
    !/process\.env\[/.test(platformAdminGate),
);

check(
  "the allowlist is read from PLATFORM_ADMIN_EMAILS",
  /process\.env\[PLATFORM_ADMIN_EMAILS_ENV\]/.test(platformAdmin),
);

check(
  "no email literal remains in the allowlist module",
  !/["'][\w.+-]+@[\w.-]+\.\w+["']/.test(platformAdmin),
);

check(
  "it supports more than one administrator",
  /\.split\(","\)/.test(platformAdmin),
);

check(
  "entries are normalized and malformed ones dropped",
  /trim\(\)\.toLowerCase\(\)/.test(platformAdmin) &&
    /filter\(isPlausibleEmail\)/.test(platformAdmin),
);

check(
  "an unset or empty value fails closed (nobody is an admin)",
  /if\s*\(!raw\)\s*\{\s*return new Set\(\);/.test(platformAdmin),
);

check(
  "the module stays server-only so the allowlist never reaches a browser",
  /^import "server-only";/m.test(readFileSync("lib/database/platform-admin.ts", "utf8")) &&
    /^import "server-only";/m.test(readFileSync("lib/database/platform-admin-emails.ts", "utf8")),
);

// ============================================================ P1-3 surfaces
console.log("\nP1-3 — internal-only surfaces are gated, not merely hidden");

const accessControl = loadTs("lib/database/access-control.ts");
const companyContext = loadTs("lib/database/company-context.ts");
const alphaTrackerPage = loadTs("app/(admin)/alpha-tracker/page.tsx");
const marketingPage = loadTs("app/(admin)/marketing/page.tsx");

check(
  "the context resolves platform-admin status server-side",
  /isPlatformAdmin:\s*canAccessPlatformAdmin\(user\)/.test(companyContext),
);

check(
  "/marketing requires platform admin in the nav gate",
  /case "\/marketing":[\s\S]{0,80}?return context\.isPlatformAdmin && permissions\.dispatchJobs;/.test(
    accessControl,
  ),
);

check(
  "/alpha-tracker requires platform admin in the nav gate",
  /case "\/alpha-tracker":[\s\S]{0,80}?return context\.isPlatformAdmin && permissions\.manageCompany;/.test(
    accessControl,
  ),
);

check(
  "the redirect guard agrees with the nav gate for /marketing",
  /path\.startsWith\("\/marketing"\)\)\s*\{\s*return context\.isPlatformAdmin/.test(
    accessControl,
  ),
);

check(
  "the redirect guard agrees with the nav gate for /alpha-tracker",
  /path\.startsWith\("\/alpha-tracker"\)\)\s*\{\s*return context\.isPlatformAdmin/.test(
    accessControl,
  ),
);

check(
  "the alpha tracker page enforces the same gate as the nav",
  /canAccessAdminNavItem\(companyContext, "\/alpha-tracker"\)/.test(alphaTrackerPage),
);

check(
  "the marketing page still enforces its own server-side gate",
  /canAccessAdminNavItem\(companyContext, "\/marketing"\)/.test(marketingPage),
);

check(
  "server-side publish authorization was NOT weakened",
  /canAccessPlatformAdmin/.test(loadTs("app/actions/marketing-publish.ts")),
);

// ============================================================ P1-10 ingest
console.log("\nP1-10 — media ingest route state is intentional");

check(
  "the redundant signed-url route is gone",
  !existsSync("app/api/marketing/media/[assetId]/signed-url/route.ts"),
);

check(
  "the ingest route exists",
  existsSync("app/api/marketing/media/ingest/route.ts"),
);

const middleware = loadTs("lib/supabase/middleware.ts");

check(
  "middleware lets the ingest route reach its handler",
  /isMarketingMediaIngestRoute\(pathname\)/.test(middleware) &&
    /\/api\/marketing\/media\/ingest/.test(middleware),
);

check(
  "the ingest route binds the company from configuration, not the request",
  /companyId:\s*allowedCompanyId/.test(ingestRoute),
);

check(
  "unconfigured ingest answers 503 rather than pretending to be unauthorized",
  /Media ingest is not configured\.[\s\S]{0,80}?status:\s*503/.test(ingestRoute),
);

check(
  "the ingest route still refuses a bad credential and a wrong company",
  /status:\s*401/.test(ingestRoute) && /status:\s*403/.test(ingestRoute),
);

// ============================================================ P1-7 config
console.log("\nP1-8 — Stripe cannot be in the wrong mode without saying so");

const stripeConfig = await import(
  "../lib/system-check/production-config.ts"
).catch(() => null);

if (stripeConfig?.classifyStripeMode) {
  const classify = stripeConfig.classifyStripeMode;

  // ============================== THE FOOT-GUN ==============================
  // A live key in a development or scratch environment is a real charge
  // against a real card away from a test click. A test key in production is a
  // billing system that silently takes no money. Both are one copied .env line
  // away, and the application behaves normally in both cases.
  check(
    "a LIVE key outside production is flagged",
    classify("sk_live_example", false).ok === false &&
      /real charge/i.test(classify("sk_live_example", false).message),
  );
  check(
    "a TEST key in production is flagged",
    classify("sk_test_example", true).ok === false &&
      /takes no money/i.test(classify("sk_test_example", true).message),
  );
  check(
    "a LIVE key in production is accepted",
    classify("sk_live_example", true).ok === true,
  );
  check(
    "a TEST key outside production is accepted",
    classify("sk_test_example", false).ok === true,
  );
  check(
    "a missing key is a production failure and a development non-event",
    classify(undefined, true).ok === false && classify(undefined, false).ok === true,
  );
  check(
    "an unrecognised key is flagged rather than assumed safe",
    classify("not-a-stripe-key", false).ok === false &&
      classify("not-a-stripe-key", true).ok === false,
  );
  check(
    "the classifier never echoes the key",
    ["sk_live_SECRETVALUE", "sk_test_SECRETVALUE"].every(
      (key) =>
        !classify(key, true).message.includes("SECRETVALUE") &&
        !classify(key, false).message.includes("SECRETVALUE"),
    ),
    "a configuration report that echoed a secret would be a worse problem " +
      "than the one it diagnoses",
  );

  // Restricted keys carry the same mode marker and the same consequences.
  check(
    "restricted keys are classified by mode too",
    classify("rk_live_example", false).ok === false &&
      classify("rk_test_example", false).ok === true,
  );
}

console.log("\nP1-7 — every declared production variable is documented");

const configModule = await import(
  "../lib/system-check/production-config.ts"
).catch(() => null);

const envExample = readFileSync(".env.example", "utf8");

if (configModule?.PRODUCTION_CONFIG) {
  const declared = configModule.PRODUCTION_CONFIG;

  check("the configuration contract declares at least 25 variables", declared.length >= 25);

  const undocumented = declared
    .map((entry) => entry.name)
    .filter((name) => !envExample.includes(name));

  check(
    `every declared variable appears in .env.example${
      undocumented.length ? ` (missing: ${undocumented.join(", ")})` : ""
    }`,
    undocumented.length === 0,
  );

  const undocumentedAliases = configModule.DEPRECATED_CONFIG_ALIASES.map(
    (entry) => entry.name,
  ).filter((name) => !envExample.includes(name));
  check(
    `deprecated aliases are documented${
      undocumentedAliases.length ? ` (missing: ${undocumentedAliases.join(", ")})` : ""
    }`,
    undocumentedAliases.length === 0,
  );

  const undocumentedDevOnly = configModule.DEV_ONLY_CONFIG.filter(
    (name) => !envExample.includes(name),
  );
  check(
    `development-only variables are documented${
      undocumentedDevOnly.length ? ` (missing: ${undocumentedDevOnly.join(", ")})` : ""
    }`,
    undocumentedDevOnly.length === 0,
  );

  check(
    "every entry carries a consequence, so a report can say what breaks",
    declared.every((entry) => entry.consequence.trim().length > 20),
  );

  for (const required of [
    "SENTRY_DSN",
    "PLATFORM_ADMIN_EMAILS",
    "CRON_SECRET",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_BILLING_WEBHOOK_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    check(
      `${required} is classified REQUIRED`,
      declared.some(
        (entry) => entry.name === required && entry.classification === "required",
      ),
    );
  }

  check(
    "EMAIL_RECIPIENT_OVERRIDE and SMS_PROVIDER are classified DANGEROUS",
    ["EMAIL_RECIPIENT_OVERRIDE", "SMS_PROVIDER"].every((name) =>
      declared.some(
        (entry) => entry.name === name && entry.classification === "dangerous",
      ),
    ),
  );

  check(
    "the report never exposes a value, only a name",
    !/process\.env\[[^\]]+\]\s*\?\?/.test(loadTs("lib/system-check/production-config.ts")),
  );
} else {
  console.log("  (module import unavailable — skipping contract assertions)");
  check("production-config module exists", existsSync("lib/system-check/production-config.ts"));
}

const systemChecks = loadTs("lib/system-check/run-platform-system-checks.ts");

check(
  "the system check reads the same configuration contract",
  /buildProductionConfigReport\(\)/.test(systemChecks),
);

check(
  "the system check fails (not warns) on missing required configuration",
  /"config-required"[\s\S]{0,200}?"fail"/.test(systemChecks),
);

check(
  "the system check fails on a missing platform admin allowlist",
  /"env-platform-admin"[\s\S]{0,200}?"fail"/.test(systemChecks),
);

// ============================================================ P0-5 sms
console.log("\nP0-5 — SMS cannot enable without opt-out handling");

const smsEnv = loadTs("lib/sms/env.ts");
const smsSend = loadTs("lib/sms/send.ts");

check(
  "credentials alone do not enable sending",
  /isSmsInboundStopHandlingLive\(\)/.test(smsEnv) &&
    /inbound_stop_handling_not_live/.test(smsEnv),
);

check(
  "isSmsSendingConfigured now goes through the compliance status",
  /return getSmsComplianceStatus\(\)\.ok;/.test(smsEnv),
);

check(
  "the send path refuses and raises an alert when STOP handling is absent",
  /sms\.blocked_missing_stop_handling/.test(smsSend),
);

check(
  "the system check reports the compliance gate as a failure",
  /inbound_stop_handling_not_live[\s\S]{0,400}?"fail"/.test(systemChecks),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} perimeter checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
