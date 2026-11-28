/**
 * The Insights article template (site upgrade batch 4).
 *
 * Static and offline: the pure parser, layout and per-slug plan modules are
 * loaded and driven, and the rendering components are read as source.
 * Nothing here opens a socket or touches a database.
 *
 * ==================== WHAT IS ASSERTED ====================
 *   the bodies published before this renderer parse exactly as they did
 *   no markdown reaches the page as HTML, and no unsafe URL reaches an href
 *   bold, numbered lists, tables and links parse as written
 *   key takeaways and FAQ are lifted only from the shapes the template documents
 *   the built-in tool lands before its chosen heading, never inside the FAQ
 *   every number a takeaway quotes is what the calculators compute
 *
 * Run: node scripts/verify-article-markdown.mjs
 */
import { readFileSync } from "node:fs";
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

const md = await loadPureModule("shared/lib/site/article-markdown.ts", "md");
const tpl = await loadPureModule("shared/lib/site/article-template.ts", "tpl");
const view = await loadPureModule("shared/lib/site/article-view.ts", "view");
const breakEven = await loadPureModule("shared/lib/resources/break-even.ts", "be");
const jobProfit = await loadPureModule("shared/lib/resources/job-profitability.ts", "jp");
const laborRate = await loadPureModule("shared/lib/resources/labor-rate.ts", "lr");

const text = (runs) => md.inlineText(runs);
const kinds = (runs) => runs.map((run) => run.kind).join(",");

/* ================================================ the old shapes, unchanged */

console.log("\nBodies written for the old renderer render the same");
{
  // The shapes the six published bodies use, including the bracketed
  // placeholders and arithmetic the invoice and break-even articles carry.
  const legacy = [
    "An HVAC invoice has two jobs. It asks for money,",
    "and it is the record of what was done.",
    "",
    "## Example: one finished repair, written out",
    "",
    "- Diagnostic and service call: 1 x $119.00 = $119.00",
    "- Run capacitor, installed: 1 x [your price]",
    "- Pay at [your payment link] or by check to [your company name]. Due in 15 days.",
    "* Contribution per job: $650 x (1 - 0.35) = $422.50",
    "",
    "### A smaller heading",
    "Step 4: Check what a \"free\" or cheap service call really costs (in this example).",
  ].join("\n");
  const blocks = md.parseArticleMarkdown(legacy);
  check("five blocks, as before", blocks.length === 5, blocks.map((b) => b.kind));
  check("consecutive lines join into one paragraph with a space", blocks[0].kind === "paragraph" && text(blocks[0].inline) === "An HVAC invoice has two jobs. It asks for money, and it is the record of what was done.");
  check("an H2 keeps its long-standing anchor", blocks[1].kind === "heading" && blocks[1].id === "example-one-finished-repair-written-out");
  check("- and * items stay one bullet list", blocks[2].kind === "list" && !blocks[2].ordered && blocks[2].items.length === 4);
  check("[bracketed placeholders] stay literal text", blocks[2].items.every((item) => kinds(item) === "text") && text(blocks[2].items[1]).endsWith("[your price]"));
  check("arithmetic with x and parentheses is untouched", text(blocks[2].items[3]) === "Contribution per job: $650 x (1 - 0.35) = $422.50");
  check("an H3 stays an H3", blocks[3].kind === "heading" && blocks[3].level === 3);
  check("quotes and parentheses in a paragraph are plain text", kinds(blocks[4].inline) === "text");
}

/* ===================================================== no HTML, safe hrefs */

console.log("\nNothing from the body becomes markup or an unsafe link");
{
  const [p] = md.parseArticleMarkdown("<script>alert(1)</script> and <b>bold</b>");
  check("an HTML tag is one text run, rendered escaped", p.kind === "paragraph" && kinds(p.inline) === "text" && text(p.inline).includes("<script>"));

  const href = (target) => md.resolveArticleLink(target);
  check("a same-site path is allowed", href("/resources/calculators/break-even")?.href === "/resources/calculators/break-even");
  check("a same-site path with a query and anchor is allowed", href("/pricing?plan=a#plan-finder")?.external === false);
  check("an in-page anchor is allowed", href("#try-it")?.href === "#try-it");
  check("a protocol-relative URL is refused", href("//evil.example/x") === null);
  check("javascript: is refused", href("javascript:alert(1)") === null);
  check("data: is refused", href("data:text/html,hi") === null);
  check("http is refused", href("http://www.bls.gov/ooh/") === null);
  check("a host that is not a cited source is refused", href("https://example.com/page") === null);
  check("a look-alike host is refused", href("https://www.bls.gov.evil.example/x") === null);
  check("credentials in a URL are refused", href("https://user:pw@www.bls.gov/x") === null);
  check("a backslash path is refused", href("/\\evil.example") === null);
  check("spaces and quotes are refused", href('/a" onmouseover="x') === null);
  check("a cited source is allowed and marked external", href("https://www.bls.gov/ooh/x.htm")?.external === true);
  check("an absolute link to this site becomes a path", href("https://www.altair-op.com/pricing")?.href === "/pricing");

  const [bad] = md.parseArticleMarkdown("See [this page](https://example.com/x) now.");
  check("a refused link keeps its words and loses its URL", kinds(bad.inline) === "text" && text(bad.inline) === "See this page now.");
  const [good] = md.parseArticleMarkdown("Use the [break-even calculator](/resources/calculators/break-even).");
  check("an allowed link parses as a link", good.inline[1]?.kind === "link" && good.inline[1].href === "/resources/calculators/break-even");

  // Comment-stripped: the files' own comments name the thing they forbid.
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const article = strip(readFileSync("shared/components/site/SitePageArticle.tsx", "utf8"));
  const body = strip(readFileSync("shared/components/site/article/ArticleBody.tsx", "utf8"));
  check("the article template has no dangerouslySetInnerHTML", !article.includes("dangerouslySetInnerHTML"));
  check("the body renderer has no dangerouslySetInnerHTML", !body.includes("dangerouslySetInnerHTML"));
  check("external links open with rel=noopener", /rel="noopener"/.test(body));
  check("an /insights link is checked against the published list", article.includes("live.has(match[1])"));
}

/* ======================================================== the new features */

console.log("\nBold, numbered lists, tables");
{
  const [p] = md.parseArticleMarkdown("The **balance due**, in bold, and **[a link](/pricing)**.");
  check("**bold** parses", p.inline[1]?.kind === "strong" && text(p.inline[1].children) === "balance due");
  check("a link inside bold parses", p.inline[3]?.kind === "strong" && p.inline[3].children[0]?.kind === "link");
  const [lone] = md.parseArticleMarkdown("A ** b and 2 ** 3");
  check("stray asterisks stay text", kinds(lone.inline) === "text");
  const [esc] = md.parseArticleMarkdown("Not \\*\\*bold\\*\\* and not \\[a](/link)");
  check("escapes keep markers literal", kinds(esc.inline) === "text" && text(esc.inline) === "Not **bold** and not [a](/link)");

  const [ol] = md.parseArticleMarkdown("3. Third\n4. Fourth");
  check("a numbered list keeps its start", ol.kind === "list" && ol.ordered && ol.start === 3 && ol.items.length === 2);
  const mixed = md.parseArticleMarkdown("- a\n1. b");
  check("a bullet list and a numbered list do not merge", mixed.length === 2 && !mixed[0].ordered && mixed[1].ordered);

  const table = md.parseArticleMarkdown(["| Line | Working | Result |", "|---|:---:|---:|", "| Each job | $650 \\| net | **$422.50** |", "| Short |"].join("\n"));
  const t = table[0];
  check("a pipe table parses", t.kind === "table" && t.head.length === 3 && t.rows.length === 2);
  check("alignment is read from the rule row", t.align.join(",") === "left,center,right");
  check("an escaped pipe stays inside its cell", text(t.rows[0][1]) === "$650 | net");
  check("bold works in a cell", t.rows[0][2][0]?.kind === "strong");
  check("a short row is padded to the header", t.rows[1].length === 3);
  const notTable = md.parseArticleMarkdown("| just a line |\nand text");
  check("a pipe line without a rule row is a paragraph", notTable[0].kind === "paragraph");
}

/* ==================================================== lifted sections */

console.log("\nKey takeaways and FAQ are lifted only from their documented shapes");
{
  const body = [
    "Intro.",
    "",
    "## Key takeaways",
    "",
    "- One",
    "- Two",
    "",
    "## Step one",
    "",
    "Text.",
    "",
    "## Frequently asked questions",
    "",
    "### What is it?",
    "",
    "An answer.",
    "",
    "### Why?",
    "",
    "- A list answer",
  ].join("\n");
  const blocks = md.parseArticleMarkdown(body);
  const own = md.extractTakeaways(blocks);
  check("a Key takeaways list is lifted", own && own.items.length === 2);
  check("and removed from the body", own && !own.rest.some((b) => b.kind === "heading" && b.text === "Key takeaways"));
  const faq = md.extractFaq(own.rest);
  check("an FAQ with two answered questions is found", faq && faq.entries.length === 2);
  check("FAQ answers become plain text", md.blocksText(faq.entries[1].answer) === "A list answer");

  const oneQuestion = md.extractFaq(md.parseArticleMarkdown("## FAQ\n\n### Only one?\n\nYes."));
  check("one question is not an FAQ (no FAQPage for it)", oneQuestion === null);
  const unanswered = md.extractFaq(md.parseArticleMarkdown("## FAQ\n\n### One?\n\n### Two?\n\nYes."));
  check("a question without an answer is not an FAQ", unanswered === null);
  const takeawaysWithProse = md.extractTakeaways(md.parseArticleMarkdown("## Key takeaways\n\n- One\n\nProse after.\n\n## Next"));
  check("a takeaways section with prose after it is left in the body", takeawaysWithProse === null);
}

/* ================================================== the article layout */

console.log("\nThe built-in tool lands where it was put");
{
  const body = ["Intro.", "## Step 1: add up your fixed monthly costs", "A.", "## Two levers that move the line", "B.", "## Use it to plan the slow months", "C."].join("\n\n");
  const v = view.buildArticleView("hvac-break-even-jobs-per-month", body);
  const order = v.segments.map((s) => (s.kind === "blocks" ? `blocks(${s.blocks.length})` : s.kind)).join(" ");
  check("before its preferred heading", order === "blocks(3) tool blocks(4)", order);
  check("the contents list names the tool in place", v.toc.map((t) => t.id).join(",") === "step-1-add-up-your-fixed-monthly-costs,try-it,two-levers-that-move-the-line,use-it-to-plan-the-slow-months");
  check("the code-map takeaways are used when the body has none", v.takeaways.length === tpl.ARTICLE_PLANS["hvac-break-even-jobs-per-month"].takeaways.length && !v.takeawaysFromBody);

  const renamed = ["Intro.", "## A", "x", "## B", "y", "## C", "z", "## D", "w", "## FAQ", "### Q1?", "a", "### Q2?", "b"].join("\n\n");
  const r = view.buildArticleView("hvac-break-even-jobs-per-month", renamed);
  const kindsOrder = r.segments.map((s) => s.kind).join(",");
  check("renamed headings: the tool goes before the middle H2", r.segments[0].kind === "blocks" && r.segments[1].kind === "tool" && r.segments[2].blocks[0].id === "c", kindsOrder);
  check("and the FAQ stays last, after the tool", kindsOrder === "blocks,tool,blocks,faq");
  check("the FAQ feeds the structured data", r.faq.length === 2 && r.faq[0].question === "Q1?");

  const none = view.buildArticleView("a-newer-article", "Intro.\n\n## A\n\nx");
  check("an article without a plan gets no tool and no takeaways", none.tool === null && none.takeaways.length === 0);
}

/* ================================================ the per-slug plans */

console.log("\nEvery plan is consistent, and its numbers are the calculators'");
{
  for (const [slug, plan] of Object.entries(tpl.ARTICLE_PLANS)) {
    check(`${slug}: related picks are other articles, no repeats`, !plan.related.includes(slug) && new Set(plan.related).size === plan.related.length);
    check(`${slug}: tool anchors are heading anchors`, !plan.tool || plan.tool.before.every((id) => id === md.headingAnchor(id)));
    check(`${slug}: never "Altair OS", "#1" or "best"`, !plan.takeaways.some((t) => /Altair OS|#1|\bbest\b/i.test(t)));
  }

  const be = breakEven.calculateBreakEven(breakEven.BREAK_EVEN_DEFAULTS);
  const be700 = breakEven.calculateBreakEven({ ...breakEven.BREAK_EVEN_DEFAULTS, averageJobRevenue: 700 });
  const be30 = breakEven.calculateBreakEven({ ...breakEven.BREAK_EVEN_DEFAULTS, variableCostRate: 0.3 });
  const beTake = tpl.ARTICLE_PLANS["hvac-break-even-jobs-per-month"].takeaways.join(" ");
  check("break-even: $422.50 a job, 43 jobs, 9.8 a week", be.contributionPerJob === 422.5 && be.breakEvenJobs === 43 && be.breakEvenJobsPerWeek.toFixed(1) === "9.8" && beTake.includes("$422.50") && beTake.includes("43 jobs"));
  check("break-even: $700 or 30% both give 40 jobs", be700.breakEvenJobs === 40 && be30.breakEvenJobs === 40 && beTake.includes("40 jobs"));

  const install = jobProfit.calculateJobProfitability(jobProfit.JOB_PROFITABILITY_DEFAULTS);
  const small = jobProfit.calculateJobProfitability({ ...jobProfit.JOB_PROFITABILITY_DEFAULTS, revenue: 650, laborHours: 4, materialsCost: 220 });
  const callback = jobProfit.calculateJobProfitability({ ...jobProfit.JOB_PROFITABILITY_DEFAULTS, revenue: 650, laborHours: 6, materialsCost: 220 });
  const jpTake = tpl.ARTICLE_PLANS["job-profitability-per-job"].takeaways.join(" ");
  check("job profit: $1,330 gross (53.2%) and $705 net (28.2%)", install.grossProfit === 1330 && install.netProfit === 705 && (install.grossMargin * 100).toFixed(1) === "53.2" && (install.netMargin * 100).toFixed(1) === "28.2" && jpTake.includes("$1,330") && jpTake.includes("$705"));
  check("job profit: the callback turns $87.50 into −$2.50", small.netProfit === 87.5 && callback.netProfit === -2.5 && jpTake.includes("$87.50") && jpTake.includes("$2.50"));

  const lr = laborRate.calculateLaborRate(laborRate.LABOR_RATE_DEFAULTS);
  const scTake = tpl.ARTICLE_PLANS["how-to-price-an-hvac-service-call"].takeaways.join(" ");
  check("service call: $96.15 an hour, billed at $121", lr.costPerBillableHour.toFixed(2) === "96.15" && lr.billableHourlyRateRounded === 121 && scTake.includes("$96.15") && scTake.includes("$121"));
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exit(1);
