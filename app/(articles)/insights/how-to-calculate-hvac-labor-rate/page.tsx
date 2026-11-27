import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import { LaborCostWorkspace } from "@/shared/components/resources/labor/LaborCostWorkspace";
import {
  BulletList,
  Callout,
  DataTable,
  FaqList,
  GuideLayout,
  GuideSection,
  MathTable,
  ProductBand,
  RelatedGrid,
  SourceList,
  ToolHero,
  ToolPageShell,
  ToolStage,
  type FaqItem,
  type Source,
} from "@/shared/components/resources/tools/ToolGuide";
import { LABOR_RATE_DEFAULTS, calculateLaborRate } from "@/shared/lib/resources/labor-rate";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { CODE_ROUTED_ARTICLES } from "@/shared/lib/site/code-routed-articles";
import { NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { buildPublicSocialMetadata, PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";

/**
 * /insights/how-to-calculate-hvac-labor-rate: the HVAC Labor Cost Workspace.
 *
 * ============ WHY A STATIC ROUTE BESIDE [slug] ============
 * This address ranks, so it is kept exactly. A static segment wins over the
 * dynamic `[slug]` segment beside it, so this file now answers the URL and
 * the database row of the same slug is no longer rendered here (it still
 * feeds the Insights index and the sitemap, which only need its slug and
 * title). Everything below the tool is server-rendered HTML; only the tool
 * is a client component, and it sends nothing anywhere.
 *
 * ============ NUMBERS ============
 * The worked example is computed with the simple calculator's own function
 * from its own defaults ($30, 25%, 30 + 10 hours, $6,000, 20%), and the
 * workspace's sample is the same example, so the guide, the calculator at
 * /resources/calculators/labor-rate and the workspace cannot disagree.
 * Every market figure is quoted from the source listed in "Sources" with
 * its date. Values marked "sample" in the tool are placeholders, not data.
 */

const PATH = "/insights/how-to-calculate-hvac-labor-rate";
const TITLE = "HVAC Labor Rate Calculator: Hourly Cost and Averages";
/** Shared with the Insights cards, so a card names the page it opens. */
const { title: H1, description: DESCRIPTION } = CODE_ROUTED_ARTICLES["how-to-calculate-hvac-labor-rate"];
const PUBLISHED = "2026-11-12T04:10:16.965Z";
const MODIFIED = "2026-11-20T00:00:00.000Z";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: PATH, title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const EX = LABOR_RATE_DEFAULTS;
const R = calculateLaborRate(EX)!;
/** Same week, different split of the same 40 paid hours. */
const at = (billable: number) =>
  calculateLaborRate({ ...EX, billableHoursPerWeek: billable, nonBillableHoursPerWeek: 40 - billable })!;
const R34 = at(34);
const R25 = at(25);

/** Flat-rate example from the guide: 0.75 h capacitor at the rounded rate, $18 part, 100% markup. */
const FLAT_RATE = R.billableHourlyRateRounded;
const FLAT_LABOR = 0.75 * FLAT_RATE;
const FLAT_PART = 18 * 2;
const FLAT_PRICE = FLAT_LABOR + FLAT_PART;
const FLAT_AFTER = FLAT_LABOR * 1.5 + FLAT_PART;

const FAQ: readonly FaqItem[] = [
  {
    question: "What is the average labor rate for HVAC?",
    answer:
      "Published guides put typical HVAC labor at about $75 to $150 an hour (HVAC.com), and IBISWorld's 2026 benchmark is $140 per labor hour. Technicians themselves earned a median of $29.33 an hour in May 2025 (BLS). Your own rate should come from your costs, not the average.",
  },
  {
    question: "How do you calculate an HVAC labor rate?",
    answer: `Add the wage and burden for every paid hour, add the technician's share of overhead, divide by the hours you actually bill, then divide by one minus your target margin. In the worked example on this page that is ${usd(R.weeklyTotalCost)} a week over ${EX.billableHoursPerWeek} billable hours, or ${usd(R.costPerBillableHour)} to break even and ${usd(R.billableHourlyRate)} for a 20% net margin.`,
  },
  {
    question: "What is the HVAC labor cost per hour for the business?",
    answer: `More than the wage. A $30 wage with a 25% burden costs ${usd(R.loadedHourlyCost)} for every paid hour, and once unbilled hours and overhead are spread over billable hours it costs ${usd(R.costPerBillableHour)} per billed hour in the example. That cost per billed hour is the number to compare your price against.`,
  },
  {
    question: "What is labor burden for an HVAC technician?",
    answer:
      "Everything you pay to employ a technician on top of the wage: the employer's 7.65% Social Security and Medicare, federal and state unemployment tax, workers' comp, health insurance, paid time off and often the truck. The legally fixed part is small; workers' comp, health insurance and the vehicle are what make burden large, and they vary from shop to shop.",
  },
  {
    question: "Are commercial HVAC labor rates higher than residential?",
    answer:
      "Usually, but the gap is your own. Commercial work tends to carry more expensive technicians, more equipment, more insurance and slower-paying customers, and each of those raises the rate you need. We did not find a published survey that separates commercial and residential billing rates, so build the commercial rate from commercial costs.",
  },
  {
    question: "How much more should I charge after hours?",
    answer:
      "Most shops bill nights, weekends and holidays at a multiple of the standard rate. Price the multiplier from what the call really costs you: overtime pay, on-call pay and the next morning's schedule all belong in it. The rate card in the workspace above shows the after-hours rate for any multiplier you choose.",
  },
  {
    question: "Is flat-rate pricing better than charging by the hour?",
    answer:
      "Neither is better for every shop. Flat rate gives customers a price before work starts and rewards an efficient technician, but you carry the risk when a job runs long. Time and materials suits work you cannot scope in advance. Both should start from the same labor rate.",
  },
  {
    question: "How often should I recalculate my labor rate?",
    answer:
      "At least once a year, and any time a big cost changes: a raise, a new truck, a new hire, an insurance renewal or a change in how many hours your technicians bill.",
  },
];

const SOURCES: readonly Source[] = [
  {
    label: "U.S. Bureau of Labor Statistics, Occupational Outlook Handbook",
    detail: "Heating, Air Conditioning, and Refrigeration Mechanics and Installers. Median pay $29.33 an hour, $61,010 a year; wages by industry (May 2025 data).",
    href: "https://www.bls.gov/ooh/installation-maintenance-and-repair/heating-air-conditioning-and-refrigeration-mechanics-and-installers.htm",
  },
  {
    label: "IRS Topic 751, Social Security and Medicare withholding rates",
    detail: "Employer Social Security 6.2% on wages up to $184,500 (2026) and Medicare 1.45%.",
    href: "https://www.irs.gov/taxtopics/tc751",
  },
  {
    label: "IRS Topic 759, Form 940 (FUTA)",
    detail: "6.0% on the first $7,000 of each employee's wages, 0.6% after the full state credit.",
    href: "https://www.irs.gov/taxtopics/tc759",
  },
  {
    label: "KFF 2025 Employer Health Benefits Survey",
    detail: "Single coverage: $9,325 average premium, $1,440 average worker contribution (employer share $7,885 is our subtraction).",
    href: "https://www.kff.org/health-costs/report/2025-employer-health-benefits-survey/",
  },
  {
    label: "HVAC.com, HVAC Labor Costs (November 2023)",
    detail: "Average HVAC labor of $75 to $150 an hour; higher at night, on weekends and holidays.",
    href: "https://www.hvac.com/expert-advice/hvac-labor-costs/",
  },
  {
    label: "IBISWorld, HVAC System Construction & Maintenance",
    detail: "2026 benchmark market price of $140 per labor hour. Does not say whether residential or commercial.",
    href: "https://www.ibisworld.com/united-states/procurement/hvac-system-construction-maintenance/48688484",
  },
];

const NAV = [
  { id: "how-it-works", label: "How the rate is built" },
  { id: "burden", label: "Labor burden, line by line" },
  { id: "unbillable", label: "Unbilled hours" },
  { id: "averages", label: "Average HVAC labor rates" },
  { id: "commercial", label: "Residential vs commercial" },
  { id: "other-factors", label: "What else changes the rate" },
  { id: "flat-rate", label: "Flat-rate pricing" },
  { id: "next-steps", label: "What to do with your number" },
  { id: "faq", label: "Questions owners ask" },
  { id: "sources", label: "Sources" },
];

export default function LaborCostWorkspacePage() {
  const url = `${PUBLIC_SITE_ORIGIN}${PATH}`;
  return (
    <ToolPageShell>
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: H1,
              description: DESCRIPTION,
              url,
              mainEntityOfPage: { "@type": "WebPage", "@id": url },
              datePublished: PUBLISHED,
              dateModified: MODIFIED,
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
              citation: SOURCES.map((source) => source.href),
            },
            {
              "@type": "WebApplication",
              name: "HVAC Labor Cost Workspace",
              url: `${url}#workspace`,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any (runs in the browser)",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Free tools", item: `${PUBLIC_SITE_ORIGIN}/resources` },
                { "@type": "ListItem", position: 2, name: "HVAC labor rate calculator", item: url },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ],
        }}
      />

      <ToolHero
        crumb="HVAC labor rate calculator"
        eyebrow="Free tool · Labor Cost Workspace"
        title={H1}
        question="What does a billed hour have to cover for your whole crew? Five short steps, about 10 minutes."
        needs="A pay stub for each technician and last year's Profit and Loss report."
        lead={
          <p>
            Find exactly what a billed hour has to cover: every technician&apos;s wage, the burden on top of it, the
            hours nobody pays for, the office, and the profit you keep. The workspace gives you a break-even rate, a
            recommended rate, a flat-rate price book and an after-hours rate card, then the guide below explains every
            number.
          </p>
        }
        updated={{ iso: MODIFIED, label: "November 20, 2026" }}
        facts={["No sign-up", "Works for one tech or a crew", "Print or save as PDF"]}
        jumpLinks={[
          { href: "#workspace", label: "Open the workspace" },
          { href: "#averages", label: "Average rates" },
          { href: "#flat-rate", label: "Flat rate" },
          { href: "#faq", label: "FAQ" },
        ]}
      />

      <ToolStage>
        <LaborCostWorkspace />
        <p className="mx-auto mt-3 max-w-4xl px-2 text-center text-xs leading-relaxed text-stone-500 print:mt-6 print:text-left">
          Estimates from the numbers you enter, for planning. Not tax, legal or accounting advice: confirm burden and
          tax figures with your payroll provider or accountant. Values marked &ldquo;sample&rdquo; are placeholders,
          not industry data.
        </p>
        <NextStep
          className="mx-auto mt-10 max-w-6xl print:hidden"
          placement="labor-workspace"
          steps={NEXT_STEPS.laborWorkspace}
          heading="Got your rate? Put it to work."
        />
      </ToolStage>

      <GuideLayout eyebrow="The guide" title="How to calculate an HVAC labor rate" nav={NAV}>
        <GuideSection
          id="how-it-works"
          n={1}
          title="How the rate is built"
          aside={
            <Callout title="The formula" tone="brass">
              <p className="font-mono text-[12.5px] leading-6">
                break-even = (wages + burden + overhead) ÷ billable hours
                <br />
                rate = break-even ÷ (1 − target margin)
              </p>
            </Callout>
          }
        >
          <p>
            Most shops set their labor rate by looking at what the shop down the road charges. That tells you what
            customers in your area will tolerate. It does not tell you whether your own rate covers your own costs, and
            those are two different questions.
          </p>
          <p>
            A billed hour has to pay for a lot more than the technician&apos;s wage. Here is the whole chain for one
            technician paid $30 an hour with a 25% burden, 40 paid and 30 billable hours a week, $6,000 a month of
            overhead and a 20% target margin. It is the workspace&apos;s worked example, so you can follow it there.
          </p>
          <MathTable
            caption="Worked example, one technician, one week"
            rows={[
              { label: "Loaded hourly cost", working: "$30 × (1 + 25%)", value: usd(R.loadedHourlyCost) },
              { label: "Weekly labor cost", working: `${usd(R.loadedHourlyCost)} × ${R.paidHoursPerWeek} paid hours`, value: usd(R.weeklyLaborCost) },
              { label: "Weekly share of overhead", working: "$6,000 × 12 ÷ 52", value: usd(R.weeklyOverhead) },
              { label: "Total weekly cost", working: `${usd(R.weeklyLaborCost)} + ${usd(R.weeklyOverhead)}`, value: usd(R.weeklyTotalCost) },
              { label: "Break-even rate", working: `${usd(R.weeklyTotalCost)} ÷ ${EX.billableHoursPerWeek} billable hours`, value: usd(R.costPerBillableHour), strong: true },
              { label: "Rate at 20% net margin", working: `${usd(R.costPerBillableHour)} ÷ (1 − 0.20)`, value: usd(R.billableHourlyRate), strong: true },
              { label: "Rounded up to quote", value: usd(R.billableHourlyRateRounded) },
            ]}
          />
          <p>
            Bill less than {usd(R.costPerBillableHour)} an hour and every hour this technician works loses money, no
            matter how busy the schedule looks. Margin is a share of the price, not a markup on cost, so you divide by
            one minus the margin rather than multiplying: a 20% margin is a 25% markup.
          </p>
        </GuideSection>

        <GuideSection id="burden" n={2} title="Labor burden, line by line">
          <p>
            The wage is the starting point, not the cost. On top of it sit payroll taxes, workers&apos; comp,
            insurance and any benefits. Owners usually call this labor burden and express it as a percentage of wage.
            Some of it is fixed by law and easy to look up; the rest comes from your own policies and notices.
          </p>
          <DataTable
            caption="What goes into burden"
            head={["Item", "Figure", "Where it comes from"]}
            rows={[
              ["Social Security", "6.2% of wages up to $184,500 (2026)", "IRS Topic 751. Fixed by law."],
              ["Medicare", "1.45% of all wages", "IRS Topic 751. 7.65% with Social Security."],
              ["Federal unemployment (FUTA)", "0.6% of the first $7,000: $42 a year", "IRS Topic 759, after the full state credit."],
              ["State unemployment (SUTA)", "Your state rate on your state's wage base", "Your state's annual rate notice."],
              ["Workers' comp", "A rate per $100 of wages for your class code", "Your policy and claims history."],
              ["Health insurance", "About $7,885 a year, single coverage, employer share", "KFF 2025 average ($9,325 premium less $1,440 worker share). Use your plan."],
              ["Paid time off and holidays", "Wages for days paid but not worked", "Your own policy."],
              ["Vehicle and tools", "Truck, fuel, insurance, tools, phone", "Your own books."],
            ]}
          />
          <p>
            In the workspace, the <strong>Advanced</strong> burden mode applies the federal figures automatically and
            marks the rest as samples for you to replace. It also shows the effective burden as a single percentage, so
            you can carry it into the simple calculator or a quick quote.
          </p>
        </GuideSection>

        <GuideSection id="unbillable" n={3} title="Count the hours you pay for but cannot bill">
          <p>
            This is the line most rates miss. A technician paid for 40 hours a week does not bill 40 hours. Drive time,
            shop time, parts runs, training and callbacks you do not charge for all come out of the week, and you still
            pay for every one of them.
          </p>
          <p>Billable hours change the answer more than almost anything else. The same example with different splits of the same 40 paid hours:</p>
          <DataTable
            head={["Billable / unbillable hours", "Billable efficiency", "Rate at 20% margin"]}
            rows={[
              ["34 / 6", "85%", usd(R34.billableHourlyRate)],
              ["30 / 10", "75%", usd(R.billableHourlyRate)],
              ["25 / 15", "62.5%", usd(R25.billableHourlyRate)],
            ]}
          />
          <p>
            Nothing about the wage or the overhead changed. Five fewer billable hours a week added about{" "}
            {usd0(R25.billableHourlyRate - R.billableHourlyRate)} to the rate this technician needs. That is why
            tightening routes, cutting callbacks and getting paperwork done on site often does more for profit than a
            raise in price. The sensitivity table in the workspace runs the same comparison for your own crew.
          </p>
        </GuideSection>

        <GuideSection id="averages" n={4} title="What is the average HVAC labor rate?">
          <p>
            There are two different numbers hiding behind this question: what technicians are paid, and what customers
            are charged. Keep them apart.
          </p>
          <DataTable
            caption="What HVAC technicians are paid (BLS, May 2025)"
            head={["Measure", "Annual", "Hourly"]}
            rows={[
              ["Median wage", "$61,010", "$29.33"],
              ["Lowest 10% earned less than", "$40,050", "about $19 (our conversion, 2,080 hours)"],
              ["Highest 10% earned more than", "$95,210", "about $46 (our conversion, 2,080 hours)"],
            ]}
          />
          <DataTable
            caption="What customers are charged for HVAC labor"
            head={["Source", "Figure", "Notes"]}
            rows={[
              ["HVAC.com (2023)", "$75 to $150 an hour", "Average HVAC labor; higher at night, weekends and holidays."],
              ["IBISWorld (2026)", "$140 per labor hour", "Benchmark market price; does not split residential and commercial."],
            ]}
          />
          <p>
            The $30 wage in the worked example sits right at the BLS median, and its {usd0(R.billableHourlyRateRounded)}{" "}
            rate lands inside the published range. Treat the range as a sanity check, not a target: a shop with a
            costlier technician, more overhead or fewer billable hours could need more than $150 and still be priced
            honestly. The workspace plots your own rate against this range.
          </p>
          <p>
            These are national figures. For one state broken out by area, see{" "}
            <Link href="/utah/hvac-labor-rates" className="font-medium text-[#77591B] underline-offset-4 hover:underline">
              Utah HVAC labor rates
            </Link>
            : what technicians earn in Salt Lake City, Ogden, Provo, St. George and Logan, and the rate a shop in each
            needs to break even.
          </p>
        </GuideSection>

        <GuideSection id="commercial" n={5} title="Residential vs commercial HVAC labor rates">
          <p>
            Commercial rates usually run higher, but we did not find a published survey that measures the gap in
            billing rates, so be wary of anyone who quotes one figure for it. What the data does show is that the
            inputs differ: BLS reports a median wage of $71,190 a year for these technicians in wholesale trade against
            $60,030 at plumbing, heating and air-conditioning contractors (May 2025).
          </p>
          <p>The reasons a commercial rate comes out higher are all inputs in the workspace:</p>
          <BulletList
            items={[
              <><strong>Technician pay.</strong> Rooftop units, chillers, controls and refrigeration work usually need more experienced, better-paid technicians.</>,
              <><strong>Burden.</strong> Higher workers&apos; comp and liability coverage, and the certificates of insurance commercial customers require.</>,
              <><strong>Equipment and vehicles.</strong> Lifts, larger trucks, recovery machines and specialty tools add to overhead.</>,
              <><strong>Unbilled time.</strong> Site check-in, safety orientation, waiting for access and longer walks to the equipment cut billable hours.</>,
              <><strong>Payment terms.</strong> Net 30 to net 60 terms mean you carry the cost longer, which is a real cost even if it never shows on the invoice.</>,
            ]}
          />
          <p>
            If you do both kinds of work, run the workspace twice, once with your residential numbers and once with
            your commercial ones, and save or print each, rather than averaging them into one rate that fits neither.
          </p>
        </GuideSection>

        <GuideSection id="other-factors" n={6} title="Other things that change what you charge">
          <BulletList
            items={[
              <><strong>Region.</strong> Labor costs, rent and insurance vary a lot between a big metro and a rural county, and so does what customers will pay. Your own costs are the floor either way.</>,
              <><strong>Overtime and after hours.</strong> An after-hours call costs you overtime or on-call pay and often a slower next morning. Shops usually bill a multiple of the standard rate; the rate card in the workspace shows the result for your multiplier and what overtime adds to your wage cost.</>,
              <><strong>Trip and diagnostic fees.</strong> A service call fee covers the drive and the first look, which are real hours even when no repair is sold. Some shops credit the fee toward the repair if the customer goes ahead; the flat-rate builder handles both. Build the fee from your labor rate and your average drive time.</>,
              <><strong>Time and materials vs flat rate.</strong> Time and materials bills the hours actually worked plus parts, which suits work you cannot scope in advance. Flat rate quotes one price per task, below.</>,
            ]}
          />
        </GuideSection>

        <GuideSection id="flat-rate" n={7} title="Turning a labor rate into a flat-rate price book">
          <p>
            A flat-rate price book is your labor rate applied to a standard time for each task, plus the parts priced
            the way you price every part:
          </p>
          <Callout title="Flat-rate price" tone="brass">
            <p className="font-mono text-[12.5px]">price = book hours × labor rate + part cost × (1 + markup)</p>
          </Callout>
          <p>
            Book hours are how long the task should take a competent technician, including setup and cleanup. Take them
            from your own job history where you can; that is more honest than a generic book because it reflects your
            trucks, your routes and your people.
          </p>
          <MathTable
            caption={`Example: replace a run capacitor at the ${usd0(FLAT_RATE)} rate`}
            rows={[
              { label: "Labor", working: `0.75 book hours × ${usd0(FLAT_RATE)}`, value: usd(FLAT_LABOR) },
              { label: "Part", working: "$18 cost × 2 (100% markup, a 50% margin on the part)", value: usd(FLAT_PART) },
              { label: "Flat-rate price", working: "labor + part", value: usd(FLAT_PRICE), strong: true },
              { label: "After hours at 1.5×", working: `${usd(FLAT_LABOR)} × 1.5 + ${usd(FLAT_PART)}`, value: usd(FLAT_AFTER) },
            ]}
          />
          <p>
            Two cautions. When a flat-rate job runs long, you absorb the extra time, so check book hours against real
            job times every few months. And every time your labor rate changes, every line in the book changes with it:
            keep the rate in one place and calculate the book from it, which is what the price builder in the workspace
            does.
          </p>
        </GuideSection>

        <GuideSection id="next-steps" n={8} title="What to do with your number">
          <p>
            Put your own wages, burden, hours and overhead into the workspace above. Save it in this browser, copy a
            link for your accountant or business partner, or print it as a one-page worksheet. If you only need a quick
            answer for one technician, the{" "}
            <Link href={calculatorPath("labor-rate")} className="font-medium text-[#77591B] underline-offset-4 hover:underline">
              simple HVAC labor rate calculator
            </Link>{" "}
            uses the same math with six inputs.
          </p>
          <p>
            If the rate is well above what you charge today, look at billable hours before you look at price. If it is
            below, you have room to invest in the business or pay your people more. The{" "}
            <Link href={calculatorPath("technician-pay")} className="font-medium text-[#77591B] underline-offset-4 hover:underline">
              technician pay calculator
            </Link>{" "}
            and the{" "}
            <Link href={calculatorPath("break-even")} className="font-medium text-[#77591B] underline-offset-4 hover:underline">
              break-even calculator
            </Link>{" "}
            answer the next two questions: what you can afford to pay, and how many jobs a month you need.
          </p>
          <p>
            In Altair Operating System, technician hours are tracked against each job from the technician&apos;s phone,
            so the billable and unbillable split comes from what actually happened instead of an estimate.
          </p>
        </GuideSection>

        <GuideSection id="faq" n={9} title="Frequently asked questions">
          <FaqList items={FAQ} />
        </GuideSection>

        <GuideSection id="sources" n={10} title="Sources">
          <p className="text-sm">Read on November 20, 2026. Conversions and sums marked &ldquo;our&rdquo; are ours, not the source&apos;s.</p>
          <SourceList sources={SOURCES} />
        </GuideSection>

        <RelatedGrid
          title="Keep going"
          links={[
            { href: calculatorPath("labor-rate"), title: "Simple labor rate calculator", text: "Six inputs, one technician, the same math." },
            { href: calculatorPath("technician-pay"), title: "Technician pay calculator", text: "What you can afford to pay at the rate you charge." },
            { href: calculatorPath("break-even"), title: "Break-even calculator", text: "How many jobs a month cover your costs." },
            { href: "/insights/how-to-price-an-hvac-service-call", title: "How to price an HVAC service call", text: "Turn the labor rate into a service call fee." },
            { href: "/insights/hvac-invoice-template", title: "HVAC invoice template and builder", text: "Put the rate on a professional invoice and print it." },
            { href: "/hvac-estimating-software", title: "HVAC estimating software", text: "Estimates from your price book that customers approve on their phone." },
          ]}
        />

        <ProductBand
          headline="Your rate, on every estimate and invoice."
          text="Altair Operating System keeps your prices in one price book, so estimates and invoices are built from the same numbers. Technician time is tracked against each job from the phone, so you see real billable hours instead of guessing."
          softwareHref="/hvac-estimating-software"
          softwareLabel="HVAC estimating software"
        />
      </GuideLayout>
    </ToolPageShell>
  );
}
