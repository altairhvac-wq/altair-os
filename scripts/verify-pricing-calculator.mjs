/**
 * The pricing page's plan finder and the software pages' search metadata
 * (site upgrade batch 3, 2026-11-20).
 *
 * Executes the SHIPPED modules through the alias loader (typescript: true in
 * verify-all) and checks:
 *   - the calculator reads its prices and limits from the plan catalog and
 *     reproduces hand-worked quotes to the cent (monthly, yearly, extra users,
 *     a plan too small for the team, hiring);
 *   - no pricing or software-page source types a plan price by hand;
 *   - every FAQ the pages render (pricing + four software pages) is the list
 *     their FAQPage JSON-LD is built from, with unique ids;
 *   - titles fit in about 60 characters with the product suffix and
 *     descriptions in 155, for /pricing and every software page;
 *   - no public copy on these pages says "Altair OS", "#1" or "best", or
 *     names another software company;
 *   - every software page path is still allowed in robots.txt and listed in
 *     the sitemap (both read LANDING_PAGE_PATHS).
 *
 * Offline and side-effect free.
 */
import { readFileSync } from "node:fs";

const catalog = await import("@/lib/saas-billing/catalog");
const calc = await import("@/shared/lib/pricing/plan-calculator");
const pricingPage = await import("@/shared/lib/pricing/pricing-page");
const landing = await import("@/shared/lib/site/landing-pages");
const software = await import("@/shared/lib/site/software-pages");

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

console.log("pricing calculator");

// ---------------------------------------------------------------- the catalog is the source
const C = catalog.SAAS_SUBSCRIPTION_CATALOG;
const plans = calc.pricedPlans();
check("three public plans, in display order", plans.map((p) => p.planKey).join(",") === "starter,growth,pro", JSON.stringify(plans.map((p) => p.planKey)));
for (const plan of plans) {
  const source = C[plan.planKey];
  check(
    `${plan.label}: prices and users equal the catalog`,
    plan.monthlyPriceUsd === source.monthlyPriceUsd &&
      plan.annualPriceUsd === source.annualPriceUsd &&
      plan.includedUsers === source.includedAccounts &&
      plan.extraUserMonthlyUsd === source.additionalAccountPriceUsd,
    JSON.stringify({ plan, source }),
  );
}

// Hand-worked quotes, written from the catalog's own numbers so a price
// change re-derives them (the arithmetic is what is under test).
const starter = C.starter;
const growth = C.growth;
const pro = C.pro;
const byKey = Object.fromEntries(plans.map((p) => [p.planKey, p]));

let q = calc.quotePlan(byKey.growth, 4, "monthly");
check("4 users on Growth, monthly", q.fits && q.billedUsd === growth.monthlyPriceUsd && q.yearlyUsd === growth.monthlyPriceUsd * 12, JSON.stringify(q));
check(
  "4 users on Growth, per user per month in cents",
  q.perUserMonthCents === Math.round((growth.monthlyPriceUsd * 100) / 4),
  String(q.perUserMonthCents),
);

q = calc.quotePlan(byKey.growth, 4, "annual");
check(
  "4 users on Growth, yearly: annual price, saving vs monthly",
  q.billedUsd === growth.annualPriceUsd && q.annualSavingsUsd === growth.monthlyPriceUsd * 12 - growth.annualPriceUsd,
  JSON.stringify(q),
);

q = calc.quotePlan(byKey.pro, 12, "monthly");
check(
  "12 users on Pro, monthly: 2 extra users at the extra-user price",
  q.extraUsers === 2 && q.billedUsd === pro.monthlyPriceUsd + 2 * pro.additionalAccountPriceUsd,
  JSON.stringify(q),
);
check("12 users on Pro, monthly = $179 with today's catalog", q.billedUsd === 179 || pro.monthlyPriceUsd !== 149, String(q.billedUsd));

q = calc.quotePlan(byKey.pro, 12, "annual");
const proYear = pro.annualPriceUsd + 2 * pro.additionalAccountPriceUsd * 12;
check("12 users on Pro, yearly: annual price + 12 months of extra users", q.billedUsd === proYear && q.yearlyUsd === proYear, JSON.stringify(q));
check("12 users on Pro, yearly: per month rounded to the cent", q.perMonthCents === Math.round((proYear * 100) / 12), String(q.perMonthCents));
check(
  "12 users on Pro, yearly: saving = 12 monthly bills - the yearly bill",
  q.annualSavingsUsd === (pro.monthlyPriceUsd + 2 * pro.additionalAccountPriceUsd) * 12 - proYear,
  String(q.annualSavingsUsd),
);

q = calc.quotePlan(byKey.starter, 2, "monthly");
check("2 users do not fit Starter (hard cap)", q.fits === false && q.extraUsers === 0, JSON.stringify(q));
q = calc.quotePlan(byKey.growth, growth.includedAccounts + 1, "monthly");
check("one past Growth's cap does not fit Growth", q.fits === false, JSON.stringify(q));

// ---------------------------------------------------------------- recommendations
const rec = (users, interval = "monthly", hires = 0) => calc.recommendPlan(users, interval, hires);
check("1 user -> Starter", rec(1).recommended.plan.planKey === "starter");
check("2 users -> Growth", rec(2).recommended.plan.planKey === "growth");
check(`${growth.includedAccounts} users -> Growth, room 0`, rec(growth.includedAccounts).recommended.plan.planKey === "growth" && rec(growth.includedAccounts).roomLeft === 0);
check("3 users -> Growth, room 2", rec(3).recommended.plan.planKey === "growth" && rec(3).roomLeft === 2);
check(`${growth.includedAccounts + 1} users -> Pro`, rec(growth.includedAccounts + 1).recommended.plan.planKey === "pro");
check("30 users -> Pro with 20 extra", rec(30).recommended.plan.planKey === "pro" && rec(30).recommended.extraUsers === 20);
check("4 users + 2 hires -> Growth now, Pro after", rec(4, "monthly", 2).recommended.plan.planKey === "growth" && rec(4, "monthly", 2).afterHiring?.plan.planKey === "pro");
check("2 users + 1 hire -> still Growth", rec(2, "monthly", 1).afterHiring?.plan.planKey === "growth");
check("users are clamped to 1..50", calc.clampUsers(0) === 1 && calc.clampUsers(999) === calc.MAX_USERS && calc.clampUsers(Number.NaN) === 1);
check("the recommendation is never a plan that does not fit", [1, 2, 5, 6, 10, 11, 50].every((n) => rec(n).recommended.fits));
check("ties and order: Starter only for 1", [2, 3, 4, 5].every((n) => rec(n).recommended.plan.planKey !== "starter"));
check(
  "trial facts from the catalog",
  calc.PRICING_FACTS.trialDays === catalog.SAAS_TRIAL_CONFIG.durationDays && calc.PRICING_FACTS.trialUsers === pro.includedAccounts && calc.PRICING_FACTS.trialNeedsCard === false,
);
check("money formatting", calc.formatUsd(39) === "$39" && calc.formatUsdCents(15417) === "$154.17" && calc.formatUsd(1490) === "$1,490");
check(
  "starter/growth/pro sanity vs catalog",
  starter.monthlyPriceUsd < growth.monthlyPriceUsd && growth.monthlyPriceUsd < pro.monthlyPriceUsd,
);

// ---------------------------------------------------------------- no hand-typed prices
console.log("no hand-typed prices");
const SOURCES = [
  "shared/components/pricing/PricingPageView.tsx",
  "shared/components/pricing/PlanFinder.tsx",
  "shared/lib/pricing/pricing-page.ts",
  "shared/lib/pricing/plan-calculator.ts",
  "shared/lib/site/software-pages.ts",
  "shared/components/marketing/software/SoftwareLandingPage.tsx",
];
const priceList = [starter, growth, pro].flatMap((p) => [p.monthlyPriceUsd, p.annualPriceUsd]).concat([pro.additionalAccountPriceUsd]);
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
for (const file of SOURCES) {
  const src = stripComments(read(file));
  const typed = priceList.filter((price) => new RegExp(`\\$${price}(?![0-9])`).test(src) || new RegExp(`\\$${price.toLocaleString("en-US")}(?![0-9])`).test(src));
  check(`${file} types no plan price`, typed.length === 0, typed.join(", "));
}

// ---------------------------------------------------------------- FAQ = JSON-LD
console.log("FAQ and structured data");
const pricingRoute = read("app/(marketing)/pricing/page.tsx");
check("pricing FAQPage is built from PRICING_FAQ", /buildFaqPageStructuredData\(PRICING_FAQ\)/.test(pricingRoute));
check("pricing page renders PRICING_FAQ", /items=\{PRICING_FAQ\}/.test(read("shared/components/pricing/PricingPageView.tsx")));
check("pricing FAQ ids unique", new Set(pricingPage.PRICING_FAQ.map((f) => f.id)).size === pricingPage.PRICING_FAQ.length);
const routes = {
  "/hvac-software": "app/(marketing)/hvac-software/page.tsx",
  "/hvac-dispatch-software": "app/(marketing)/hvac-dispatch-software/page.tsx",
  "/hvac-estimating-software": "app/(marketing)/hvac-estimating-software/page.tsx",
  "/hvac-invoicing-software": "app/(marketing)/hvac-invoicing-software/page.tsx",
};
const template = read("shared/components/marketing/software/SoftwareLandingPage.tsx");
check("software template renders content.faq", /items=\{content\.faq\}/.test(template));
for (const [path, file] of Object.entries(routes)) {
  const src = read(file);
  const content = software.SOFTWARE_PAGE_CONTENT[path];
  check(`${path}: FAQPage from CONTENT.faq, one FAQPage`, /buildFaqPageStructuredData\(CONTENT\.faq\)/.test(src) && (src.match(/buildFaq/g) ?? []).length === 2 && !/buildFaqStructuredData\(\)/.test(src));
  check(`${path}: content path matches`, content?.path === path);
  check(`${path}: FAQ ids unique, at least 5`, content && new Set(content.faq.map((f) => f.id)).size === content.faq.length && content.faq.length >= 5);
  check(`${path}: has steps, features and tools`, content && content.steps.length >= 4 && content.features.length >= 6 && content.tools.length >= 4);
}

// ---------------------------------------------------------------- titles and descriptions
console.log("titles and descriptions");
const SUFFIX = " · Altair Operating System";
const metas = [
  { path: "/pricing", title: pricingPage.PRICING_META.title, description: pricingPage.PRICING_META.description },
  ...landing.LANDING_PAGES.map((p) => ({ path: p.path, title: p.title, description: p.description })),
];
for (const meta of metas) {
  const full = meta.title + SUFFIX;
  check(`${meta.path}: title ${full.length} <= 60`, full.length <= 60, full);
  check(`${meta.path}: description ${meta.description.length} <= 155`, meta.description.length <= 155, meta.description);
}
check("invoicing title targets the search", /^HVAC Invoicing Software/.test(landing.findLandingPage("/hvac-invoicing-software")?.title ?? ""));

// ---------------------------------------------------------------- copy rules
console.log("copy rules");
const COPY_FILES = [
  ...SOURCES,
  "shared/components/marketing/demos/InvoiceDemo.tsx",
  "shared/components/marketing/demos/EstimateDemo.tsx",
  "shared/components/marketing/demos/DispatchDemo.tsx",
  "shared/components/marketing/demos/JobJourney.tsx",
  "shared/components/marketing/demos/DemoFrame.tsx",
  "shared/lib/site/landing-pages.ts",
];
const BANNED = [/Altair OS\b/, /#1\b/, /\bbest\b/i, /ServiceTitan|Housecall|Jobber|FieldEdge|Workiz|Service Fusion/];
for (const file of COPY_FILES) {
  const src = read(file)
    // comments are not public copy
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // the product's own name for estimate options is not a claim
    .replace(/good[,-] better(,| and|-) best/gi, "");
  const hits = BANNED.filter((re) => re.test(src)).map(String);
  check(`${file}: no banned claims or competitor names`, hits.length === 0, hits.join(", "));
}

// ---------------------------------------------------------------- crawlable
console.log("robots and sitemap");
check("robots allows LANDING_PAGE_PATHS", /\.\.\.LANDING_PAGE_PATHS/.test(read("app/robots.ts")) && /"\/pricing"/.test(read("app/robots.ts")));
check("sitemap lists LANDING_PAGE_PATHS and /pricing", /LANDING_PAGE_PATHS\.map/.test(read("app/sitemap.ts")) && /\/pricing`/.test(read("app/sitemap.ts")));
check(
  "the four software paths are unchanged",
  ["/hvac-software", "/hvac-dispatch-software", "/hvac-estimating-software", "/hvac-invoicing-software"].every((p) => landing.LANDING_PAGE_PATHS.includes(p)) &&
    landing.LANDING_PAGE_PATHS.length === 4,
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
