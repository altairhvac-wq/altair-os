/**
 * The Contractor Business Resource Center (/resources), phase 1.
 *
 * Static and offline: the pure math, template and feed-parser modules are
 * loaded and driven with worked examples, and the route, perimeter and nav
 * wiring are read as source. Nothing here opens a socket or touches a
 * database.
 *
 * ==================== WHAT IS ASSERTED ====================
 *   each calculator reproduces a hand-worked example to the cent
 *   impossible inputs return "fix your inputs", not Infinity or NaN
 *   the pricing worksheet's example adds up (direct + overhead + margin = price)
 *   every template has a safe id, a matching filename and a content type
 *   CSV cells with commas or quotes are escaped (RFC 4180)
 *   the feed parser keeps valid entries, decodes entities, and drops
 *     entries whose video id could smuggle a path or scheme
 *   every "In Altair OS" note names a module marked Production in ALTair_BRAIN.md
 *   /resources is public in middleware, allowed in robots, listed in the sitemap,
 *     and linked from the public nav and footer
 *   every calculator shows the shared disclaimer, and no resource file
 *     renders raw HTML
 *
 * Run: node scripts/verify-resource-center.mjs
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
const near = (a, b, eps = 0.005) => typeof a === "number" && Math.abs(a - b) < eps;
const read = (p) => readFileSync(p, "utf8");

const LIB = "shared/lib/resources";
const FILES = {
  labor: `${LIB}/labor-rate.ts`,
  job: `${LIB}/job-profitability.ts`,
  breakEven: `${LIB}/break-even.ts`,
  templates: `${LIB}/templates.ts`,
  feed: `${LIB}/youtube-feed.ts`,
  features: `${LIB}/feature-links.ts`,
  catalog: `${LIB}/catalog.ts`,
  route: "app/(marketing)/resources/templates/[id]/route.ts",
  hub: "app/(marketing)/resources/page.tsx",
  frame: "shared/components/resources/CalculatorFrame.tsx",
  middleware: "lib/supabase/middleware.ts",
  robots: "app/robots.ts",
  sitemap: "app/sitemap.ts",
  nav: "shared/components/homepage/HomepageNav.tsx",
  footer: "shared/components/marketing/MarketingFooter.tsx",
  brain: "docs/product/ALTair_BRAIN.md",
};

for (const path of Object.values(FILES)) check(`${path} exists`, existsSync(path));
if (failures > 0) {
  console.error("\nMissing source; later checks would be vacuous.");
  process.exit(1);
}

// ------------------------------------------------------------ calculators
console.log("\nLabor rate");
const labor = await loadPureModule(FILES.labor, "res-labor");
{
  // $30 wage, 25% burden, 30 billable + 10 non-billable h/wk,
  // $6,000/mo overhead, 20% target margin.
  //   loaded      = 30 x 1.25                  = 37.50
  //   labor/wk    = 37.50 x 40                 = 1,500.00
  //   overhead/wk = 6,000 x 12 / 52            = 1,384.62
  //   cost/bill h = (1,500 + 1,384.62) / 30    = 96.15
  //   rate        = 96.15 / (1 - 0.20)         = 120.19  -> $121 rounded up
  const r = labor.calculateLaborRate(labor.LABOR_RATE_DEFAULTS);
  check("defaults are the worked example", JSON.stringify(labor.LABOR_RATE_DEFAULTS) ===
    JSON.stringify({ hourlyWage: 30, burdenRate: 0.25, nonBillableHoursPerWeek: 10, billableHoursPerWeek: 30, monthlyOverhead: 6000, targetNetMargin: 0.2 }));
  check("loaded hourly cost 37.50", near(r.loadedHourlyCost, 37.5), r?.loadedHourlyCost);
  check("weekly labor cost 1500.00", near(r.weeklyLaborCost, 1500), r?.weeklyLaborCost);
  check("weekly overhead 1384.62", near(r.weeklyOverhead, 1384.615), r?.weeklyOverhead);
  check("cost per billable hour 96.15", near(r.costPerBillableHour, 96.154), r?.costPerBillableHour);
  check("billable rate 120.19", near(r.billableHourlyRate, 120.192), r?.billableHourlyRate);
  check("rounded rate 121", r.billableHourlyRateRounded === 121, r?.billableHourlyRateRounded);
  check("0 billable hours -> null", labor.calculateLaborRate({ ...labor.LABOR_RATE_DEFAULTS, billableHoursPerWeek: 0 }) === null);
  check("100% margin -> null", labor.calculateLaborRate({ ...labor.LABOR_RATE_DEFAULTS, targetNetMargin: 1 }) === null);
  check("NaN input does not produce NaN", Number.isFinite(labor.calculateLaborRate({ ...labor.LABOR_RATE_DEFAULTS, hourlyWage: Number.NaN }).billableHourlyRate));
}

console.log("\nJob profitability");
const job = await loadPureModule(FILES.job, "res-job");
{
  // $2,500 revenue; 6 h x $45 loaded; $900 materials; $0 sub; 25% overhead.
  //   labor 270; direct 1,170; gross 1,330 (53.2%); overhead 625; net 705 (28.2%)
  const r = job.calculateJobProfitability(job.JOB_PROFITABILITY_DEFAULTS);
  check("labor cost 270", near(r.laborCost, 270));
  check("direct cost 1170", near(r.directCost, 1170));
  check("gross profit 1330", near(r.grossProfit, 1330));
  check("gross margin 53.2%", near(r.grossMargin, 0.532, 1e-6));
  check("overhead 625", near(r.overheadAllocated, 625));
  check("net profit 705", near(r.netProfit, 705));
  check("net margin 28.2%", near(r.netMargin, 0.282, 1e-6));
  const zero = job.calculateJobProfitability({ ...job.JOB_PROFITABILITY_DEFAULTS, revenue: 0 });
  check("zero revenue -> margins null, not NaN", zero.grossMargin === null && zero.netMargin === null);
  const loss = job.calculateJobProfitability({ ...job.JOB_PROFITABILITY_DEFAULTS, materialsCost: 2400 });
  check("losing job reports a negative net profit", loss.netProfit < 0);
}

console.log("\nBreak-even");
const be = await loadPureModule(FILES.breakEven, "res-be");
{
  // $18,000 fixed; $650 average job; 35% variable.
  //   contribution 422.50; jobs 42.60 -> 43; revenue 27,692.31; ~9.83 jobs/wk
  const r = be.calculateBreakEven(be.BREAK_EVEN_DEFAULTS);
  check("contribution per job 422.50", near(r.contributionPerJob, 422.5));
  check("break-even jobs exact 42.60", near(r.breakEvenJobsExact, 42.6036, 1e-3));
  check("break-even jobs rounded up 43", r.breakEvenJobs === 43);
  check("break-even revenue 27692.31", near(r.breakEvenRevenue, 27692.3077));
  check("jobs per week 9.83", near(r.breakEvenJobsPerWeek, 9.8316, 1e-3), r.breakEvenJobsPerWeek);
  check("100% variable -> null", be.calculateBreakEven({ ...be.BREAK_EVEN_DEFAULTS, variableCostRate: 1 }) === null);
  check("$0 job -> null", be.calculateBreakEven({ ...be.BREAK_EVEN_DEFAULTS, averageJobRevenue: 0 }) === null);
}

// -------------------------------------------------------------- templates
console.log("\nTemplates");
const tpl = await loadPureModule(FILES.templates, "res-tpl");
{
  const ids = tpl.RESOURCE_TEMPLATES.map((t) => t.id);
  check("four templates", ids.length === 4, ids);
  check("ids are unique", new Set(ids).size === ids.length);
  for (const t of tpl.RESOURCE_TEMPLATES) {
    check(`${t.id}: id is a safe slug`, /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.id));
    check(`${t.id}: filename matches format`, new RegExp(`^[a-z0-9-]+\\.${t.format}$`).test(t.filename), t.filename);
    check(`${t.id}: has a content type`, typeof tpl.TEMPLATE_CONTENT_TYPES[t.format] === "string");
    const body = t.render();
    check(`${t.id}: renders substantial content`, typeof body === "string" && body.length > 500, body.length);
    check(`${t.id}: no raw HTML in content`, !/<\s*(script|iframe|html|a\s)/i.test(body));
    check(`${t.id}: lookup by id`, tpl.findResourceTemplate(t.id) === t);
  }
  check("unknown id -> null", tpl.findResourceTemplate("../../etc/passwd") === null);
  check("csv: comma cell is quoted", tpl.csvCell("a,b") === '"a,b"');
  check('csv: quote is doubled', tpl.csvCell('say "hi"') === '"say ""hi"""');
  check("csv: plain cell untouched", tpl.csvCell(12.5) === "12.5");
  const agreement = tpl.findResourceTemplate("maintenance-agreement-outline").render();
  check("agreement says it is not legal advice", /not\*\* legal advice|not legal advice/i.test(agreement));
  check("agreement tells the reader to have an attorney review it", /attorney/i.test(agreement) && /review/i.test(agreement));

  const ex = tpl.pricingWorksheetExample();
  check("worksheet: loaded hourly 37.50", near(ex.loadedHourly, 37.5));
  check("worksheet: direct cost 325.50", near(ex.directCost, 325.5));
  check("worksheet: price 542.50", near(ex.price, 542.5));
  check("worksheet: direct + overhead + margin = price", near(ex.directCost + ex.overheadDollars + ex.marginDollars, ex.price, 1e-9));
  check("worksheet: gross margin 40%", near(ex.grossMargin, 0.4, 1e-9));
  check("worksheet: effective labor rate 109.83", near(ex.effectiveRate, 109.833));
  const sheet = tpl.findResourceTemplate("pricing-worksheet").render();
  check("worksheet CSV shows the computed price", sheet.includes("542.50"));
}

// ------------------------------------------------------------ feed parser
console.log("\nYouTube feed parser");
const feed = await loadPureModule(FILES.feed, "res-feed");
{
  check("two channels", feed.YOUTUBE_CHANNELS.length === 2);
  check("channel ids as specified",
    feed.YOUTUBE_CHANNELS.some((c) => c.channelId === "UCdSTEVXGmwaFg2lm8wHmBtg" && c.label === "Altair HVAC Exploration") &&
    feed.YOUTUBE_CHANNELS.some((c) => c.channelId === "UCXdZpFi6MNVU1w4kSs1Tcww" && c.label === "Altair Operating System"));
  check("feed URL", feed.youtubeFeedUrl("UCdSTEVXGmwaFg2lm8wHmBtg") === "https://www.youtube.com/feeds/videos.xml?channel_id=UCdSTEVXGmwaFg2lm8wHmBtg");
  const sample = `<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
    <title>Channel</title>
    <entry><id>yt:video:abcDEF12345</id><yt:videoId>abcDEF12345</yt:videoId>
      <title>Capacitor &amp; Contactor: What&#39;s the &quot;Difference&quot;?</title>
      <published>2026-10-01T12:00:00+00:00</published></entry>
    <entry><yt:videoId>javascript:x</yt:videoId><title>Bad id</title></entry>
    <entry><yt:videoId>ZZZ_-yyy987</yt:videoId><title><![CDATA[Pricing <b>basics</b>]]></title>
      <published>not a date</published></entry>
    <entry><yt:videoId>noTitle1234</yt:videoId></entry>
  </feed>`;
  const channel = feed.YOUTUBE_CHANNELS[0];
  const videos = feed.parseYouTubeFeed(sample, channel);
  check("keeps the two valid entries", videos.length === 2, videos.map((v) => v.videoId));
  check("decodes entities", videos[0]?.title === `Capacitor & Contactor: What's the "Difference"?`, videos[0]?.title);
  check("labels each item with its channel", videos.every((v) => v.channelLabel === "Altair HVAC Exploration"));
  check("builds a watch URL from the id only", videos[0]?.url === "https://www.youtube.com/watch?v=abcDEF12345");
  check("feed-level <title> is not an item", !videos.some((v) => v.title === "Channel"));
  check("CDATA title kept as text", videos[1]?.title === "Pricing <b>basics</b>");
  check("unparseable date becomes empty", videos[1]?.publishedAt === "");
  check("garbage feed -> empty list, no throw", feed.parseYouTubeFeed("<html>oops", channel).length === 0);
  check("item cap honoured", feed.parseYouTubeFeed(sample, channel, 1).length === 1);
}

// ----------------------------------------------------- feature honesty
console.log("\nIn Altair OS notes");
const features = await loadPureModule(FILES.features, "res-feat");
{
  const brain = read(FILES.brain);
  const heading = { "price-book": "Price Book", estimates: "Estimates", invoices: "Invoices", dispatch: "Dispatch", reports: "Reports", "time-clock": "Time Clock / Labor" };
  for (const [key, link] of Object.entries(features.ALTAIR_FEATURE_LINKS)) {
    const h = heading[key];
    const at = h ? brain.indexOf(`### ${h}\n`) >= 0 ? brain.indexOf(`### ${h}\n`) : brain.indexOf(`### ${h}\r\n`) : -1;
    const status = at >= 0 ? brain.slice(at, at + 300) : "";
    check(`${key}: ALTair_BRAIN.md marks "${h}" Production`, /\*\*Status:\*\* Production/.test(status));
    check(`${key}: note makes no outcome claim`, !/\b(increase|boost|guarantee|save|grow|double|\d+%)\b/i.test(link.note), link.note);
    check(`${key}: links to a public page`, link.href.startsWith("/") && !link.href.startsWith("//"));
  }
  const tplKeys = tpl.RESOURCE_TEMPLATES.map((t) => t.featureKey);
  check("every template feature key has a note", tplKeys.every((k) => k in features.ALTAIR_FEATURE_LINKS));
}

// ------------------------------------------------------- perimeter + nav
console.log("\nPerimeter, crawl and nav wiring");
const catalog = await loadPureModule(FILES.catalog, "res-cat");
{
  const mw = read(FILES.middleware);
  check("middleware declares the /resources prefix", /RESOURCES_ROUTE_PREFIX = "\/resources"/.test(mw));
  check("middleware isPublicRoute includes isResourcesRoute", /function isPublicRoute[\s\S]*?isResourcesRoute\(pathname\)/.test(mw));
  check("middleware matches children, not lookalikes", mw.includes("pathname.startsWith(`${RESOURCES_ROUTE_PREFIX}/`)"));
  check("robots allows /resources", /"\/resources"/.test(read(FILES.robots)));
  const sm = read(FILES.sitemap);
  check("sitemap lists the Resource Center paths", sm.includes("RESOURCE_STATIC_PATHS"));
  check("catalog lists hub, index, 3 calculators, templates, guides, library", catalog.RESOURCE_STATIC_PATHS.length === 8, catalog.RESOURCE_STATIC_PATHS);
  for (const path of catalog.RESOURCE_STATIC_PATHS) {
    const file = `app/(marketing)${path}/page.tsx`;
    check(`${path} has a page`, existsSync(file), file);
  }
  check("public nav links Resources", /href: "\/resources", label: "Resources"/.test(read(FILES.nav)));
  check("footer links Resources", /href: "\/resources", label: "Resources"/.test(read(FILES.footer)));

  const route = read(FILES.route);
  check("download route rejects unknown ids (dynamicParams = false)", /export const dynamicParams = false/.test(route));
  check("download route sets Content-Disposition from the constant", /filename="\$\{template\.filename\}"/.test(route));
  check("download route sets nosniff", /X-Content-Type-Options/.test(route));

  const frame = read(FILES.frame);
  check("calculator frame renders the shared disclaimer", frame.includes("CALCULATOR_DISCLAIMER"));
  check("disclaimer names accountant and not-advice", /not financial, tax or legal advice/.test(read(FILES.catalog)) && /accountant/.test(read(FILES.catalog)));
  for (const slug of ["labor-rate", "job-profitability", "break-even"]) {
    const page = read(`app/(marketing)/resources/calculators/${slug}/page.tsx`);
    check(`${slug} page uses CalculatorFrame with assumptions and how-to`, /<CalculatorFrame/.test(page) && /assumptions=/.test(page) && /howToUse=/.test(page) && /formula=/.test(page));
  }

  // No raw HTML anywhere in the Resource Center beyond the shared JSON-LD serializer.
  const roots = ["app/(marketing)/resources", "shared/components/resources", "shared/lib/resources", "lib/resources"];
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const sources = roots.flatMap(walk).filter((p) => /\.(ts|tsx)$/.test(p));
  const offenders = sources.filter((p) => read(p).includes("dangerouslySetInnerHTML"));
  check("no dangerouslySetInnerHTML in Resource Center sources", offenders.length === 0, offenders);
  const iframes = sources.filter((p) => /<iframe/i.test(read(p)));
  check("no iframes (videos are links to YouTube)", iframes.length === 0, iframes);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
