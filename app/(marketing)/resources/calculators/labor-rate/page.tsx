import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { LaborRateTool } from "@/shared/components/resources/calc/LaborRateTool";
import { DataTable } from "@/shared/components/resources/tools/ToolGuide";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { LABOR_RATE_DEFAULTS, calculateLaborRate } from "@/shared/lib/resources/labor-rate";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

/**
 * /resources/calculators/labor-rate: the quick, six-input version.
 *
 * The Labor Cost Workspace (/insights/how-to-calculate-hvac-labor-rate) is the
 * full version and competes for the same searches. Whether this address
 * should redirect there is the owner's decision (site audit 2026-11-20), so
 * until then it is kept as its own page with its own canonical, titled and
 * described as the quick version, with the workspace linked at the top.
 */

const TITLE = "Quick HVAC Labor Rate Calculator (6 Inputs)";
const DESCRIPTION =
  "The quick HVAC labor rate calculator: one technician's billable hourly rate from six numbers. Need the whole crew? Open the free Labor Cost Workspace.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("labor-rate"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const dollars = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

/** The calculator's own defaults through its own function, so the page cannot disagree with the tool. */
const EX = LABOR_RATE_DEFAULTS;
const R = calculateLaborRate(EX)!;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function LaborRateCalculatorPage() {
  return (
    <CalculatorFrame
      slug="labor-rate"
      guideTitle="How the quick labor rate is worked out"
      lead={
        <>
          <p>
            The two-minute answer: one technician&apos;s billable hourly rate from six numbers. Wage, burden, the paid
            hours nobody can bill, a share of the office and your margin, spread over the hours you actually bill.
          </p>
          <p className="mt-3 rounded-xl border border-[#C2A05A]/50 bg-amber-50/70 px-4 py-3 text-[15px] text-stone-700">
            <strong className="text-stone-900">Pricing a whole crew?</strong> The free{" "}
            <Link href={LABOR_WORKSPACE_PATH} className={link}>
              HVAC Labor Cost Workspace
            </Link>{" "}
            handles every technician, itemized burden, a flat-rate price book and an after-hours rate card.
          </p>
        </>
      }
      facts={["Six inputs, about two minutes", "Rate carries to the other tools", "Share link, save or print"]}
      howToUse={[
        "Start with one technician, or an average across your crew.",
        "Enter the base wage and your labor burden. Your payroll provider or accountant can give you the burden percentage.",
        "Be honest about billable hours: count only hours that end up on an invoice. Drive, shop and training time go in non-billable.",
        "For overhead, divide your monthly overhead by the number of field technicians, or use the share you already allocate.",
        "Compare the result with the rate you charge today. If it is higher, look at billable hours and overhead before raising prices.",
      ]}
      inputs={[
        { name: "Technician wage", text: "The base hourly pay on the technician's pay stub, before taxes and benefits. For a crew, use an average or run each pay level separately." },
        { name: "Labor burden", text: "What it costs to employ someone on top of the wage: the employer's payroll taxes, workers' comp, insurance and benefits, written as a percentage of the wage." },
        { name: "Billable hours per week", text: "Hours that end up on a customer's invoice. Not hours worked: hours charged. This is the input that moves the rate the most." },
        { name: "Paid non-billable hours", text: "Hours you pay for that no customer pays for: driving between calls, the shop, the supply house, training, meetings and free callbacks." },
        { name: "Overhead for this technician", text: "This technician's share of everything that is not field labor or materials: rent, office pay, trucks, insurance, software, marketing." },
        { name: "Target net margin", text: "The profit you want left after every cost, as a share of the billed rate. A margin, not a markup." },
      ]}
      workedExample={{
        setup: `One technician paid ${dollars(EX.hourlyWage)} an hour, with ${pct(EX.burdenRate)} labor burden, ${EX.billableHoursPerWeek} billable and ${EX.nonBillableHoursPerWeek} non-billable hours a week, ${dollars(EX.monthlyOverhead)} of overhead a month, and a ${pct(EX.targetNetMargin)} target margin. These are the calculator's example values, not industry averages.`,
        rows: [
          { label: "Loaded hourly cost", working: `$${EX.hourlyWage} × (1 + ${pct(EX.burdenRate)})`, value: usd(R.loadedHourlyCost) },
          { label: "Weekly labor cost", working: `${usd(R.loadedHourlyCost)} × ${R.paidHoursPerWeek} paid hours`, value: usd(R.weeklyLaborCost) },
          { label: "Weekly share of overhead", working: `${dollars(EX.monthlyOverhead)} × 12 ÷ 52`, value: usd(R.weeklyOverhead) },
          { label: "Cost per billable hour", working: `${usd(R.weeklyTotalCost)} ÷ ${EX.billableHoursPerWeek}`, value: usd(R.costPerBillableHour), strong: true },
          { label: `Rate at ${pct(EX.targetNetMargin)} margin`, working: `${usd(R.costPerBillableHour)} ÷ (1 − ${pct(EX.targetNetMargin)})`, value: usd(R.billableHourlyRate), strong: true },
          { label: "Rounded up to quote", value: usd(R.billableHourlyRateRounded) },
        ],
        conclusion: `A ${dollars(EX.hourlyWage)} wage turns into a ${dollars(R.billableHourlyRateRounded)} billed hour once burden, unbilled hours, overhead and margin are counted. Charge ${usd(R.costPerBillableHour)} and every hour only breaks even.`,
      }}
      guide={[
        {
          id: "quick-or-full",
          label: "Quick version or workspace?",
          title: "The quick version or the full workspace?",
          body: (
            <>
              <p>Both use the same math and give the same answer for the same numbers. Pick by what you need to price:</p>
              <DataTable
                head={["", "Quick calculator (this page)", "Labor Cost Workspace"]}
                rows={[
                  ["Technicians", "One, or an average", "Every technician, each with a wage"],
                  ["Labor burden", "One percentage", "One percentage, or itemized from IRS and your own rates"],
                  ["Unbilled time", "One number", "Drive, shop, training, callbacks and other, or an efficiency %"],
                  ["Overhead", "This technician's share", "The whole company, line by line"],
                  ["Extras", "What-if table, share, save, print", "Flat-rate price book, after-hours rate card, published-range check"],
                ]}
              />
              <p>
                Either one hands your rate to the{" "}
                <Link href={calculatorPath("maintenance-agreement")} className={link}>maintenance agreement</Link>,{" "}
                <Link href={calculatorPath("callback-cost")} className={link}>callback cost</Link> and{" "}
                <Link href={calculatorPath("job-profitability")} className={link}>job profitability</Link> calculators in this browser, with a
                &ldquo;Use my labor rate&rdquo; button on each. It stays in your browser.
              </p>
            </>
          ),
        },
      ]}
      formula={[
        "loaded hourly cost     = wage × (1 + burden %)",
        "weekly labor cost      = loaded hourly cost × (billable + non-billable hours)",
        "weekly overhead        = monthly overhead × 12 ÷ 52",
        "cost per billable hour = (weekly labor cost + weekly overhead) ÷ billable hours",
        "billable hourly rate   = cost per billable hour ÷ (1 − target net margin %)",
      ]}
      assumptions={[
        "Overhead is converted to weekly using 52 weeks and 12 months per year.",
        "Target margin is a share of the billed rate (a margin), not a markup on cost.",
        "Materials are priced separately and are not part of this rate.",
        "Hours are the same every week; seasonal swings are not modeled. Run it for your busy and slow seasons separately.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      faq={[
        {
          question: "How do I calculate my HVAC labor rate?",
          answer:
            "Add up what a technician costs you in a week (wage plus burden, for every paid hour, plus their share of overhead), divide by the hours you actually bill, then divide by one minus your target margin. The calculator above does exactly that and shows each step.",
        },
        {
          question: "What is the difference between this and the Labor Cost Workspace?",
          answer:
            "The math is the same. This page is the quick version for one technician with six inputs. The workspace handles a whole crew, itemized burden and overhead, and adds a flat-rate price book and an after-hours rate card.",
        },
        {
          question: "Why is my labor rate so much higher than the wage?",
          answer:
            "Because the billed hours carry every cost. Payroll taxes and benefits, the paid hours no customer pays for, and the office all have to be recovered through the hours that are billed, and the business still needs a profit on top.",
        },
        {
          question: "Is margin the same as markup?",
          answer:
            "No. Margin is profit as a share of the price; markup is profit as a share of the cost. A 20% margin on a $100 cost means a $125 price, not $120. This calculator uses margin.",
        },
        {
          question: "Should materials be in the labor rate?",
          answer: "No. This rate covers labor and overhead only. Price parts and equipment separately, with their own markup, on the estimate and the invoice.",
        },
      ]}
      featureKeys={["price-book", "time-clock"]}
    >
      <LaborRateTool />
    </CalculatorFrame>
  );
}
