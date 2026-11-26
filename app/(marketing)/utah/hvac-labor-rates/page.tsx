import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
  Callout,
  DataTable,
  FaqList,
  GuideLayout,
  GuideSection,
  ProductBand,
  RelatedGrid,
  SourceList,
  ToolHero,
  ToolPageShell,
  type FaqItem,
  type Source,
} from "@/shared/components/resources/tools/ToolGuide";
import { WORKED_EXAMPLE, encodeState, SHARE_PARAM } from "@/shared/components/resources/labor/labor-state";
import { LABOR_RATE_DEFAULTS, calculateLaborRate } from "@/shared/lib/resources/labor-rate";
import { INVOICE_BUILDER_PATH, LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { DIRECTORY_PATH } from "@/shared/types/directory";
import { buildPublicSocialMetadata, PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { COMPANY_FACTS } from "@/shared/lib/site/about";
import { UTAH_LABOR_RATES_PATH } from "@/shared/lib/site/utah-pages";
import {
  UTAH_AREA_WAGES,
  UTAH_HVAC_WAGES,
  UTAH_UI,
  UTAH_WAGE_DATA_PERIOD,
  UTAH_WAGE_DATA_READ,
  US_HVAC_WAGES,
  type WageArea,
} from "@/shared/lib/site/utah-wages";

/**
 * /utah/hvac-labor-rates: what Utah HVAC technicians are paid, area by area,
 * and what a Utah shop has to charge to cover them.
 *
 * ============ WHERE EVERY NUMBER COMES FROM ============
 * Wages: BLS OEWS May 2025 (shared/lib/site/utah-wages.ts). Rates: the
 * national calculator's own function and defaults (25% burden, 30 billable
 * of 40 paid hours, $6,000 a month of overhead, 20% margin) with only the
 * wage changed, so this page, the national guide and the workspace agree.
 * No source publishes what Utah shops charge customers, and the page says so
 * instead of quoting a number nobody measured. Utah unemployment insurance:
 * Department of Workforce Services. Workers' comp: Utah Labor Commission.
 *
 * The first page of the Utah set (owner 2026-11-25): no existing page links
 * here or changed for it.
 */

const PATH = UTAH_LABOR_RATES_PATH;
const TITLE = "Utah HVAC Labor Rates, 2026";
const H1 = "Utah HVAC labor rates: what techs earn and what to charge";
const DESCRIPTION =
  "Utah HVAC technician wages for Salt Lake City, Ogden, Provo, St. George and Logan (BLS), and the hourly rate a Utah shop needs to break even.";
const PUBLISHED = "2026-11-25T00:00:00.000Z";
const UPDATED_LABEL = "November 25, 2026";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: PATH, title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const count = (value: number) => value.toLocaleString("en-US");

/** The national worked example with only the wage changed. */
function rateAt(wage: number) {
  return calculateLaborRate({ ...LABOR_RATE_DEFAULTS, hourlyWage: wage })!;
}

/** The workspace, opened with this wage and Utah's 2026 unemployment wage base. */
function workspaceHref(wage: number, label: string) {
  const state = {
    ...WORKED_EXAMPLE,
    techs: [{ id: "t1", name: `Technician (${label} median)`, wage: wage.toFixed(2), paidHours: "40" }],
    sutaBase: String(UTAH_UI.wageBase2026),
  };
  return `${LABOR_WORKSPACE_PATH}?${SHARE_PARAM}=${encodeState(state)}#workspace`;
}

const EX = LABOR_RATE_DEFAULTS;
const UT = UTAH_HVAC_WAGES;
const US = US_HVAC_WAGES;
const UT_RATE = rateAt(UT.median);
const UT_RATE_P75 = rateAt(UT.p75);
/** What one more dollar of wage, or $1,000 more monthly overhead, adds to the 20%-margin rate at the Utah median. */
const PER_WAGE_DOLLAR = rateAt(UT.median + 1).billableHourlyRate - UT_RATE.billableHourlyRate;
const PER_THOUSAND_OVERHEAD =
  calculateLaborRate({ ...LABOR_RATE_DEFAULTS, hourlyWage: UT.median, monthlyOverhead: LABOR_RATE_DEFAULTS.monthlyOverhead + 1000 })!
    .billableHourlyRate - UT_RATE.billableHourlyRate;
const SLC = UTAH_AREA_WAGES.find((area) => area.code === "0041620")!;
const PROVO = UTAH_AREA_WAGES.find((area) => area.code === "0039340")!;
const OGDEN = UTAH_AREA_WAGES.find((area) => area.code === "0036260")!;
const STG = UTAH_AREA_WAGES.find((area) => area.code === "0041100")!;
const METROS = UTAH_AREA_WAGES.filter((area) => area.kind === "metro");
const TOP_METRO = [...METROS].sort((a, b) => b.median - a.median)[0];

/** Utah unemployment tax on one technician paid the Utah median for 2,080 hours. */
const UT_ANNUAL_WAGE = UT.median * 2080;
const UI_TAXABLE = Math.min(UT_ANNUAL_WAGE, UTAH_UI.wageBase2026);
const UI_MIN = (UI_TAXABLE * UTAH_UI.minRatePct) / 100;
const UI_MAX = (UI_TAXABLE * UTAH_UI.maxRatePct) / 100;

const FAQ: readonly FaqItem[] = [
  {
    question: "What is the average HVAC labor rate in Utah?",
    answer: `No published survey measures what Utah HVAC shops charge customers per hour, so be careful with any single figure. What is measured is what technicians are paid: a median of ${usd(UT.median)} an hour in Utah (BLS, ${UTAH_WAGE_DATA_PERIOD}). At that wage, a one-technician shop with a 25% burden, 30 billable hours out of 40 and $6,000 a month of overhead needs ${usd(UT_RATE.costPerBillableHour)} an hour to break even and ${usd(UT_RATE.billableHourlyRate)} for a 20% net margin. Your own costs set your floor.`,
  },
  {
    question: "How much do HVAC technicians make in Utah?",
    answer: `The median HVAC technician in Utah earned ${usd(UT.median)} an hour in ${UTAH_WAGE_DATA_PERIOD}, about ${usd0(UT.median * 2080)} a year for 2,080 hours (our conversion). The lowest-paid 10% earned under ${usd(UT.p10)} and the highest-paid 10% over ${usd(UT.p90)}. BLS counts about ${count(UT.employment)} of these jobs in the state.`,
  },
  {
    question: "How much do HVAC techs make in Salt Lake City?",
    answer: `In the Salt Lake City-Murray metro area the median was ${usd(SLC.median)} an hour in ${UTAH_WAGE_DATA_PERIOD}, with the middle half of technicians between ${usd(SLC.p25)} and ${usd(SLC.p75)}. It is the largest HVAC job market in Utah, with about ${count(SLC.employment)} jobs.`,
  },
  {
    question: "Which part of Utah pays HVAC technicians the most?",
    answer: `Among Utah's metro areas, ${TOP_METRO.short} has the highest median at ${usd(TOP_METRO.median)} an hour, and Ogden has the highest average at ${usd(OGDEN.mean)}. Provo-Orem-Lehi's median of ${usd(PROVO.median)} is the lowest of the Wasatch Front metros, and St. George has the widest spread, from under ${usd(STG.p10)} to over ${usd(STG.p90)}.`,
  },
  {
    question: "What payroll taxes does a Utah HVAC employer pay?",
    answer: `On top of the wage: 7.65% for Social Security and Medicare, federal unemployment tax (0.6% of the first $7,000 after the state credit), and Utah unemployment insurance at a rate between ${UTAH_UI.minRatePct}% and ${UTAH_UI.maxRatePct}% on the first ${usd0(UTAH_UI.wageBase2026)} of each employee's 2026 wages (${usd0(UTAH_UI.wageBase2027)} in 2027). With a few exceptions, Utah also requires every employer to carry workers' compensation insurance for all its employees.`,
  },
  {
    question: "How often are these numbers updated?",
    answer:
      "BLS publishes new May wage estimates once a year, usually in the spring. This page uses the May 2025 estimates and will be updated when the next ones are released. Utah unemployment insurance rates and wage bases change every January.",
  },
];

const SOURCES: readonly Source[] = [
  {
    label: "U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics",
    detail: `Heating, Air Conditioning, and Refrigeration Mechanics and Installers (49-9021), ${UTAH_WAGE_DATA_PERIOD}, for the U.S., Utah and each Utah metro and nonmetro area: employment, mean and 10th to 90th percentile hourly wages. Read ${UTAH_WAGE_DATA_READ}.`,
    href: "https://data.bls.gov/oes/",
  },
  {
    label: "Utah Department of Workforce Services, Unemployment Insurance Tax Rates",
    detail: `How new-employer and earned rates are set, the ${UTAH_UI.minRatePct}% to ${UTAH_UI.maxRatePct}% range, the 7.1% rate for new out-of-state contractors and the ${usd0(UTAH_UI.wageBase2027)} wage base for 2027.`,
    href: "https://jobs.utah.gov/ui/employer/public/Questions/TaxRates.aspx",
  },
  {
    label: "Utah Department of Workforce Services, Summer 2026 Employer Advisor",
    detail: `The 2026 taxable wage base of ${usd0(UTAH_UI.wageBase2026)}.`,
    href: "https://jobs.utah.gov/ui/employer/Public/Empadv/Summer_2026.pdf",
  },
  {
    label: "Utah Labor Commission, Employers' Guide to Workers' Compensation",
    detail: "With a few exceptions, every employer must provide workers' compensation coverage for all its employees (Utah Code 34A-2-201). The Utah Insurance Department sets basic premium rates, adjusted for each occupation's risk and each employer's claims history.",
    href: "https://laborcommission.utah.gov/divisions/industrial-accidents/employers/employers-guide-to-workers-compensation/",
  },
  {
    label: "IRS Topic 751 and Topic 759",
    detail: "Employer Social Security 6.2% and Medicare 1.45%; federal unemployment tax 6.0% on the first $7,000, 0.6% after the full state credit.",
    href: "https://www.irs.gov/taxtopics/tc751",
  },
];

const NAV = [
  { id: "wages", label: "What Utah techs earn" },
  { id: "rates", label: "What a Utah shop must charge" },
  { id: "payroll", label: "Utah payroll costs" },
  { id: "reading", label: "Reading the numbers" },
  { id: "faq", label: "Questions owners ask" },
  { id: "sources", label: "Sources" },
];

/** Every area on the page, for the wage chart: the state, its areas, then the U.S. for scale. */
const CHART_ROWS: readonly WageArea[] = [UT, ...UTAH_AREA_WAGES, US];
const SCALE_MIN = 10;
const SCALE_MAX = 50;
const pos = (value: number) => `${((value - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;

function WageRangeChart() {
  return (
    <figure className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Hourly pay, {UTAH_WAGE_DATA_PERIOD}: lowest 10% to highest 10%
      </figcaption>
      <ul className="mt-4 space-y-3.5">
        {CHART_ROWS.map((area) => {
          const highlight = area.kind === "state";
          const muted = area.kind === "nation";
          return (
            <li key={area.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[13rem_minmax(0,1fr)_4.5rem]">
              <span className={`text-[13px] leading-tight ${highlight ? "font-semibold text-stone-900" : muted ? "text-stone-500" : "text-stone-700"}`}>
                <span className="sm:hidden">{area.short}</span>
                <span className="hidden sm:inline">{area.name}</span>
              </span>
              <span className="text-right text-[13px] tabular-nums text-stone-600 sm:order-last">
                <span className="sm:hidden">median </span>
                <strong className="font-semibold text-stone-900">{usd(area.median)}</strong>
              </span>
              <span
                className="relative col-span-2 block h-5 sm:col-span-1"
                role="img"
                aria-label={`${area.name}: 10th percentile ${usd(area.p10)}, median ${usd(area.median)}, 90th percentile ${usd(area.p90)}`}
              >
                <span aria-hidden="true" className="absolute inset-y-[9px] left-0 right-0 rounded-full bg-stone-100" />
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-[8px] rounded-full ${muted ? "bg-stone-300" : "bg-[#d8c08a]"}`}
                  style={{ left: pos(area.p10), width: `calc(${pos(area.p90)} - ${pos(area.p10)})` }}
                />
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-[5px] rounded-full ${muted ? "bg-stone-400" : "bg-[#a4823a]"}`}
                  style={{ left: pos(area.p25), width: `calc(${pos(area.p75)} - ${pos(area.p25)})` }}
                />
                <span
                  aria-hidden="true"
                  className={`absolute top-0 h-5 w-[3px] -translate-x-1/2 rounded-full ${muted ? "bg-stone-600" : "bg-[#0A0A0A]"}`}
                  style={{ left: pos(area.median) }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[13rem_minmax(0,1fr)_4.5rem]">
        <span className="hidden sm:block" />
        <span className="relative block h-4 text-[11px] tabular-nums text-stone-400">
          {[10, 20, 30, 40, 50].map((tick) => (
            <span key={tick} className="absolute -translate-x-1/2" style={{ left: pos(tick) }}>
              ${tick}
            </span>
          ))}
        </span>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-1.5 w-5 rounded-full bg-[#d8c08a]" /> 10th to 90th percentile
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-2.5 w-5 rounded-full bg-[#a4823a]" /> middle half
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-[3px] rounded-full bg-[#0A0A0A]" /> median
        </span>
      </p>
    </figure>
  );
}

function StatTiles() {
  const tiles = [
    { label: "Median HVAC tech wage in Utah", value: usd(UT.median), note: `per hour · U.S. ${usd(US.median)}` },
    { label: "HVAC tech jobs in Utah", value: count(UT.employment), note: `${count(SLC.employment)} in the Salt Lake City metro` },
    { label: "Break-even at the Utah median", value: usd(UT_RATE.costPerBillableHour), note: "per billed hour, one-tech example" },
    { label: "Rate for a 20% net margin", value: usd(UT_RATE.billableHourlyRate), note: `quote ${usd0(UT_RATE.billableHourlyRateRounded)} rounded up` },
  ];
  return (
    <section aria-label="Utah at a glance" className="mx-auto max-w-[90rem] px-4 sm:px-8 lg:px-12">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile, index) => (
          <li
            key={tile.label}
            className={`rounded-2xl border p-4 sm:p-5 ${index >= 2 ? "border-[#C2A05A]/50 bg-amber-50/60" : "border-stone-200 bg-white"}`}
          >
            <p className="text-[12px] font-medium leading-snug text-stone-600">{tile.label}</p>
            <p className="mt-1.5 text-[1.65rem] font-semibold tabular-nums tracking-tight text-[#0A0A0A] sm:text-[2rem]">{tile.value}</p>
            <p className="mt-0.5 text-[12px] leading-snug text-stone-500">{tile.note}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        Wages: BLS, {UTAH_WAGE_DATA_PERIOD}. Rates: our calculation at that wage with a 25% burden, {EX.billableHoursPerWeek} billable of{" "}
        {EX.billableHoursPerWeek + EX.nonBillableHoursPerWeek} paid hours a week and {usd0(EX.monthlyOverhead)} a month of overhead.{" "}
        <a href="#rates" className="font-medium text-[#77591B] underline-offset-4 hover:underline">
          How it is worked out
        </a>
      </p>
    </section>
  );
}

function RunLink({ wage, label }: { readonly wage: number; readonly label: string }) {
  return (
    <Link
      href={workspaceHref(wage, label)}
      className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-[#77591B] underline-offset-4 hover:underline"
    >
      Open in the workspace
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function UtahHvacLaborRatesPage() {
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
              dateModified: PUBLISHED,
              about: { "@type": "State", name: "Utah" },
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
              citation: SOURCES.map((source) => source.href),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Free tools", item: `${PUBLIC_SITE_ORIGIN}/resources` },
                { "@type": "ListItem", position: 2, name: "Utah HVAC labor rates", item: url },
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
        trail={[{ label: "Free tools", href: "/resources" }]}
        crumb="Utah HVAC labor rates"
        eyebrow={`Utah · BLS ${UTAH_WAGE_DATA_PERIOD} data`}
        title={H1}
        lead={
          <p>
            What HVAC technicians are paid in Salt Lake City, Ogden, Provo, St. George, Logan and rural Utah, from the
            government&apos;s own wage survey, and the hourly rate a Utah shop has to charge to cover that wage, the
            payroll costs on top of it and the overhead. Made in {COMPANY_FACTS.location}.
          </p>
        }
        updated={{ iso: PUBLISHED, label: UPDATED_LABEL }}
        facts={["Every Utah metro area", "Sourced, dated figures", "Free, no sign-up"]}
        jumpLinks={[
          { href: "#wages", label: "Wages by area" },
          { href: "#rates", label: "Rate you need" },
          { href: "#payroll", label: "Utah payroll costs" },
          { href: "#faq", label: "FAQ" },
        ]}
      />

      <StatTiles />

      <GuideLayout eyebrow="Utah, area by area" title="HVAC labor in Utah: the wage and the rate" nav={NAV}>
        <GuideSection id="wages" n={1} title="What Utah HVAC technicians earn">
          <p>
            The median HVAC technician in Utah earned <strong>{usd(UT.median)} an hour</strong> in {UTAH_WAGE_DATA_PERIOD},{" "}
            {usd(US.median - UT.median)} below the national median of {usd(US.median)}. Half of Utah&apos;s technicians
            earned between {usd(UT.p25)} and {usd(UT.p75)}. These are wages paid to employees, before payroll taxes and
            benefits, not what customers are charged.
          </p>
          <WageRangeChart />
          <DataTable
            caption={`HVAC technician hourly wages in Utah, ${UTAH_WAGE_DATA_PERIOD} (BLS)`}
            head={["Area", "Jobs", "Lowest 10%", "Middle half", "Median", "Average", "Highest 10%"]}
            rows={[UT, ...UTAH_AREA_WAGES, US].map((area) => [
              area.name,
              count(area.employment),
              `under ${usd(area.p10)}`,
              `${usd(area.p25)} to ${usd(area.p75)}`,
              <strong key="m" className="font-semibold text-stone-900">
                {usd(area.median)}
              </strong>,
              usd(area.mean),
              `over ${usd(area.p90)}`,
            ])}
          />
          <p className="text-sm text-stone-500">
            &ldquo;Jobs&rdquo; is BLS&apos;s rounded count of people employed in the occupation in each area. The two
            rural areas are BLS&apos;s own groupings of Utah&apos;s nonmetropolitan counties.
          </p>
        </GuideSection>

        <GuideSection
          id="rates"
          n={2}
          title="What a Utah shop has to charge per hour"
          aside={
            <Callout title="How the rate is worked out" tone="brass">
              <p className="font-mono text-[12.5px] leading-6">
                break-even = (wage × 1.25 × 40 + overhead) ÷ 30
                <br />
                rate = break-even ÷ (1 − 0.20)
              </p>
              <p className="mt-2">
                Overhead is {usd0(EX.monthlyOverhead)} a month, spread over 52 weeks. Only the wage changes from row to
                row.
              </p>
            </Callout>
          }
        >
          <p>
            Nobody publishes what Utah HVAC shops charge customers per hour, so this page does not quote a figure. What
            can be worked out is the rate a shop needs to <em>cover</em> a Utah wage. The rows below use the same
            one-technician example as our national{" "}
            <Link href={LABOR_WORKSPACE_PATH} className="font-medium text-[#77591B] underline-offset-4 hover:underline">
              HVAC labor rate calculator
            </Link>
            : a 25% labor burden, {EX.billableHoursPerWeek} billable out of{" "}
            {EX.billableHoursPerWeek + EX.nonBillableHoursPerWeek} paid hours a week, {usd0(EX.monthlyOverhead)} a month
            of overhead and a 20% net margin. Only the wage changes.
          </p>
          <DataTable
            caption="Hourly rate needed at each area's median wage (our calculation)"
            head={["Area", "Median wage", "Break-even rate", "Rate at 20% margin", "Your own numbers"]}
            rows={[UT, ...METROS].map((area) => {
              const result = rateAt(area.median);
              return [
                area.name,
                usd(area.median),
                usd(result.costPerBillableHour),
                <strong key="r" className="font-semibold text-stone-900">
                  {usd(result.billableHourlyRate)}
                </strong>,
                <RunLink key="l" wage={area.median} label={area.short} />,
              ];
            })}
          />
          <p>
            An experienced technician costs more. At Utah&apos;s 75th percentile wage of {usd(UT.p75)}, the same shop
            needs {usd(UT_RATE_P75.costPerBillableHour)} to break even and {usd(UT_RATE_P75.billableHourlyRate)} for a
            20% margin, {usd(UT_RATE_P75.billableHourlyRate - UT_RATE.billableHourlyRate)} more per billed hour than at
            the median.
          </p>
          <p>
            In this example every extra dollar of hourly wage adds {usd(PER_WAGE_DOLLAR)} to the rate, and every extra
            $1,000 a month of overhead adds {usd(PER_THOUSAND_OVERHEAD)}, so your overhead matters as much as where you
            hire. Each &ldquo;Open in the workspace&rdquo; link loads that area&apos;s median wage into the free Labor Cost Workspace, already set to
            Utah&apos;s 2026 unemployment wage base, so you can replace the sample overhead and hours with your own and
            add the rest of your crew.
          </p>
        </GuideSection>

        <GuideSection id="payroll" n={3} title="Utah payroll costs on top of the wage">
          <p>
            Every hour a Utah technician is paid carries costs the paycheck does not show. Some are set by federal law,
            one is set by the state for each employer, and the rest depend on your insurance and your policies.
          </p>
          <DataTable
            caption="What a Utah HVAC employer pays on top of wages"
            head={["Item", "Figure", "Where it comes from"]}
            rows={[
              ["Social Security and Medicare", "7.65% of wages (6.2% + 1.45%)", "IRS Topic 751. The same in every state."],
              ["Federal unemployment (FUTA)", "0.6% of the first $7,000: $42 a year", "IRS Topic 759, after the full state credit."],
              [
                "Utah unemployment insurance",
                `${UTAH_UI.minRatePct}% to ${UTAH_UI.maxRatePct}% of the first ${usd0(UTAH_UI.wageBase2026)} in 2026 (${usd0(UTAH_UI.wageBase2027)} in 2027)`,
                "Your rate notice from Workforce Services. New employers get a rate from their industry's average.",
              ],
              [
                "Workers' compensation",
                "A rate per $100 of payroll for your class code",
                "Required for nearly every Utah employer (Labor Commission). The state sets base rates; your trade and claims history adjust them.",
              ],
              ["Health insurance, time off, truck", "Your plan and policies", "Your own books."],
            ]}
          />
          <p>
            The Utah unemployment rate is the line that varies most. For one technician paid the Utah median for 2,080
            hours ({usd0(UT_ANNUAL_WAGE)} a year), the tax applies to the first {usd0(UI_TAXABLE)} and comes to{" "}
            <strong>{usd(UI_MIN)} a year at the lowest rate</strong> and{" "}
            <strong>{usd(UI_MAX)} a year at the highest</strong>. Workforce Services sets a new employer&apos;s rate
            from the history of its industry, and assigns the {UTAH_UI.maxRatePct}% maximum to a new out-of-state
            contractor unless it buys an existing business. Once you have paid wages for a full fiscal year (July to
            June), you can qualify for a rate based on your own claims history.
          </p>
          <p>
            In the workspace&apos;s <strong>Advanced</strong> burden mode, enter your Utah rate from your notice; the
            Utah links on this page already set the wage base.
          </p>
        </GuideSection>

        <GuideSection id="reading" n={4} title="Reading the Utah numbers">
          <ul className="list-disc space-y-2 pl-5 marker:text-stone-400">
            <li>
              <strong>Salt Lake City sets the market.</strong> The Salt Lake City-Murray metro has about{" "}
              {count(SLC.employment)} of Utah&apos;s {count(UT.employment)} HVAC technician jobs and a median of{" "}
              {usd(SLC.median)}, close to the national median.
            </li>
            <li>
              <strong>Ogden pays the highest floor.</strong> Ogden&apos;s lowest-paid 10% earned under {usd(OGDEN.p10)},
              the highest starting point of any Utah area, and its average of {usd(OGDEN.mean)} is the highest in the
              state.
            </li>
            <li>
              <strong>Provo-Orem-Lehi runs lower.</strong> Its median of {usd(PROVO.median)} is{" "}
              {usd(SLC.median - PROVO.median)} below Salt Lake City&apos;s, though the two areas sit side by side. A shop
              that hires on both sides of the county line can face very different wage expectations.
            </li>
            <li>
              <strong>St. George has the widest spread.</strong> From under {usd(STG.p10)} to over {usd(STG.p90)}, the
              range of pay there is wider than anywhere else in Utah.
            </li>
            <li>
              <strong>Utah&apos;s top end is lower than the nation&apos;s.</strong> The highest-paid 10% of Utah
              technicians earned over {usd(UT.p90)}, against over {usd(US.p90)} nationally.
            </li>
          </ul>
          <p>
            None of this tells you what to charge. Two shops paying the same wage can need very different rates because
            of their overhead and how many hours their technicians actually bill. Use the wage for your area as a
            starting point and build the rate from your own costs.
          </p>
        </GuideSection>

        <GuideSection id="faq" n={5} title="Questions Utah owners ask">
          <FaqList items={FAQ} />
        </GuideSection>

        <GuideSection id="sources" n={6} title="Sources">
          <p className="text-sm text-stone-600">
            Read on {UTAH_WAGE_DATA_READ}. Conversions and rates marked &ldquo;our calculation&rdquo; are ours, not the
            source&apos;s.
          </p>
          <SourceList sources={SOURCES} />
        </GuideSection>

        <RelatedGrid
          title="Keep going"
          links={[
            {
              href: LABOR_WORKSPACE_PATH,
              title: "HVAC Labor Cost Workspace",
              text: "Your break-even and recommended rate for the whole crew, with a flat-rate price book.",
            },
            {
              href: calculatorPath("break-even"),
              title: "Break-even calculator",
              text: "How many jobs a month cover your costs at the rate you charge.",
            },
            {
              href: calculatorPath("technician-pay"),
              title: "Technician pay calculator",
              text: "What you can afford to pay a technician at your rate.",
            },
            {
              href: INVOICE_BUILDER_PATH,
              title: "HVAC invoice template and builder",
              text: "Put the rate on a professional invoice and print it.",
            },
            {
              href: DIRECTORY_PATH,
              title: "Contractor directory",
              text: "Find Utah HVAC companies, or list yours for free.",
            },
          ]}
        />

        <ProductBand
          headline="Your rate, on every estimate and invoice."
          text="Altair Operating System keeps your prices in one price book, so estimates and invoices are built from the same numbers, and technician time is tracked against each job from the phone. Built in Utah."
          softwareHref="/hvac-estimating-software"
          softwareLabel="HVAC estimating software"
        />
      </GuideLayout>
    </ToolPageShell>
  );
}
