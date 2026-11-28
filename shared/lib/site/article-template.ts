/**
 * What the Insights article template adds around each article's body, chosen
 * by hand per slug: its topic, its key takeaways, the tool built into the
 * page and the three articles it recommends next.
 *
 * ============ WHY IN CODE, NOT IN THE ROW ============
 * marketing_site_pages has no topic, takeaways or tool columns, and this
 * batch adds no migration. The body can still carry its own takeaways (a
 * "## Key takeaways" list at the top, which the template lifts into the box)
 * and its own FAQ ("## Frequently asked questions" with "###" questions);
 * when it does, the body wins over the map below.
 *
 * ============ ONLY THE ARTICLE'S OWN FACTS ============
 * Every takeaway restates something the published article says, with its own
 * numbers (checked against the calculators' functions, which the verifier
 * re-runs). Nothing here is a statistic from outside the article.
 *
 * Pure (no imports), so the verifier can load it.
 */

export type ArticleTopicId = "price" | "paid" | "numbers" | "grow";

export type ArticleTopic = {
  readonly id: ArticleTopicId;
  readonly label: string;
  /** One line under the topic heading on /insights. */
  readonly text: string;
};

/** The four jobs the articles help with, in the order /insights shows them. */
export const ARTICLE_TOPICS: readonly ArticleTopic[] = [
  { id: "price", label: "Price your work", text: "Labor rates and service call fees worked out from your own costs." },
  { id: "paid", label: "Get paid", text: "What belongs on an invoice, and how to stop finished work waiting to be billed." },
  { id: "numbers", label: "Know your numbers", text: "Break-even and job profit: what the month and each job really leave you." },
  { id: "grow", label: "Start and grow", text: "From the first truck to the first hire, without the back office falling apart." },
];

export function articleTopic(id: ArticleTopicId): ArticleTopic {
  return ARTICLE_TOPICS.find((topic) => topic.id === id) ?? ARTICLE_TOPICS[0];
}

/**
 * The tool built into the middle of an article.
 *   break-even, job-profitability, labor-rate: the batch 2 calculators in compact mode
 *   service-call: the service call fee check (labor rate and cost per billed hour, fee hours, your fee)
 *   invoice-checklist: the article's own checklist, ticked off
 *   invoice-lag: the article's five-job exercise and median days to invoice
 */
export type ArticleToolId = "break-even" | "job-profitability" | "labor-rate" | "service-call" | "invoice-checklist" | "invoice-lag";

export type ArticlePlan = {
  readonly topic: ArticleTopicId;
  readonly takeaways: readonly string[];
  readonly tool: {
    readonly id: ArticleToolId;
    /**
     * Anchors of the H2s the tool goes in front of, in order of preference;
     * the first that exists wins. When none does (a rewrite renamed them),
     * the tool goes before the middle H2, and always before the FAQ.
     */
    readonly before: readonly string[];
  } | null;
  /** Read next, in order. Only published pages are shown. */
  readonly related: readonly string[];
};

/** The template's default for an article not listed below. */
export const DEFAULT_ARTICLE_PLAN: ArticlePlan = { topic: "grow", takeaways: [], tool: null, related: [] };

export const ARTICLE_PLANS: Readonly<Record<string, ArticlePlan>> = {
  "how-to-price-an-hvac-service-call": {
    topic: "price",
    takeaways: [
      "Work the fee out from your own labor rate, not from what two competitors charge.",
      "Decide what the fee covers, for example the trip and the first hour of diagnosis, and say it on the phone, the confirmation and the invoice.",
      "In the worked example one hour costs $96.15 and bills at $121. A fee under $96.15 loses money unless a repair follows.",
      "Count drive time once: in the unbilled hours or as its own charge, not both.",
      "A cheaper service call lowers the average ticket, and a lower ticket means more jobs a month to break even.",
    ],
    tool: { id: "service-call", before: ["step-4-check-what-a-free-or-cheap-service-call-really-costs", "step-5-check-the-fee-against-your-break-even"] },
    related: ["how-to-calculate-hvac-labor-rate", "hvac-break-even-jobs-per-month", "what-to-put-on-an-hvac-invoice"],
  },
  "what-to-put-on-an-hvac-invoice": {
    topic: "paid",
    takeaways: [
      "An invoice asks for money and is the record of what was done at that house.",
      "Write the complaint, the cause and the fix in plain words, not \"service call, repair\".",
      "List the equipment: make, model, serial and location, plus any refrigerant added or recovered.",
      "Break the price into lines (labor, parts, trip or diagnostic charge, discounts) and mark which are taxable.",
      "Show the balance due clearly, and make paying it as few steps as possible, such as a payment link.",
    ],
    tool: { id: "invoice-checklist", before: ["example-one-finished-repair-written-out", "make-the-invoice-from-the-job-not-from-memory"] },
    related: ["hvac-invoice-template", "job-completion-to-invoice-gap", "how-to-price-an-hvac-service-call"],
  },
  "hvac-break-even-jobs-per-month": {
    topic: "numbers",
    takeaways: [
      "Break-even jobs = fixed monthly costs ÷ what each job leaves after its variable costs.",
      "Worked example: $18,000 fixed, a $650 average job and 35% variable costs leave $422.50 a job, so 43 jobs a month, about 9.8 a week.",
      "Raising the average job to $700, or bringing variable costs down to 30%, cuts it to 40 jobs.",
      "Run it for your slow season, so you know how much cash to set aside in the busy months.",
    ],
    tool: { id: "break-even", before: ["two-levers-that-move-the-line", "use-it-to-plan-the-slow-months"] },
    related: ["job-profitability-per-job", "how-to-price-an-hvac-service-call", "how-to-start-and-grow-an-hvac-company"],
  },
  "job-profitability-per-job": {
    topic: "numbers",
    takeaways: [
      "Gross profit is revenue minus the job's own labor (at loaded cost), materials and subcontract.",
      "Net profit also takes the job's share of overhead: 25% of revenue in the examples.",
      "A $2,500 install made $1,330 gross (53.2%) and $705 net (28.2%).",
      "Two unbilled hours on a callback turned a $650 service call from $87.50 net into a $2.50 loss.",
      "Put five finished jobs through the numbers to see which job types, estimates or callbacks take the profit.",
    ],
    tool: { id: "job-profitability", before: ["what-to-look-for-when-you-run-your-own", "try-it-with-real-jobs"] },
    related: ["hvac-break-even-jobs-per-month", "how-to-calculate-hvac-labor-rate", "job-completion-to-invoice-gap"],
  },
  "how-to-start-and-grow-an-hvac-company": {
    topic: "grow",
    takeaways: [
      "Confirm licensing, EPA Section 608, insurance and bonding with your state licensing board before the first job.",
      "Budget for a cash reserve for slow months, not just the van and the logo.",
      "Price from your true hourly cost and a target margin, not from what the shop down the street charges.",
      "Hire the first technician when you are turning down or delaying work for weeks, not during one seasonal spike.",
      "Plan cash flow around the seasons, and put scheduling, dispatch and invoicing in one system before the second truck.",
    ],
    tool: { id: "labor-rate", before: ["get-your-first-customers-without-a-reputation-yet", "know-when-to-hire-your-first-tech"] },
    related: ["how-to-calculate-hvac-labor-rate", "hvac-break-even-jobs-per-month", "how-to-price-an-hvac-service-call"],
  },
  "job-completion-to-invoice-gap": {
    topic: "paid",
    takeaways: [
      "The delay is usually in reconstructing what happened on site, not in making the invoice.",
      "Parts off the truck, extra time, second trips and verbal approvals are what go missing first.",
      "Capture the billable facts on the technician's phone as the work happens, in a form short enough to finish on site.",
      "Test five recent jobs: can your records say what was done, the parts, the time, and any added work?",
      "Track the median days from job complete to invoice sent, for a month before you change anything.",
    ],
    tool: { id: "invoice-lag", before: ["one-number-worth-tracking"] },
    related: ["what-to-put-on-an-hvac-invoice", "hvac-invoice-template", "job-profitability-per-job"],
  },
  // Code routes (PR #95): listed for their topic on /insights and the learning path.
  "how-to-calculate-hvac-labor-rate": { topic: "price", takeaways: [], tool: null, related: [] },
  "hvac-invoice-template": { topic: "paid", takeaways: [], tool: null, related: [] },
};

export function articlePlanFor(slug: string): ArticlePlan {
  return ARTICLE_PLANS[slug] ?? DEFAULT_ARTICLE_PLAN;
}

/** The name the header and the contents list give each built-in tool. */
export const ARTICLE_TOOL_NAMES: Readonly<Record<ArticleToolId, string>> = {
  "break-even": "Break-even calculator",
  "job-profitability": "Job profit calculator",
  "labor-rate": "Labor rate calculator",
  "service-call": "Service call fee check",
  "invoice-checklist": "Invoice checklist",
  "invoice-lag": "Days-to-invoice check",
};

/** The in-page anchor of the built-in tool. */
export const ARTICLE_TOOL_ANCHOR = "try-it";
