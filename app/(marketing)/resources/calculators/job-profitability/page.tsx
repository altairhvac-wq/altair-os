import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { JobProfitabilityTool } from "@/shared/components/resources/calc/JobProfitabilityTool";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { JOB_PROFITABILITY_DEFAULTS, calculateJobProfitability } from "@/shared/lib/resources/job-profitability";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "HVAC Job Profitability Calculator: Profit per Job";
const DESCRIPTION =
  "Gross profit, net profit and margin on one HVAC job from revenue, labor, materials and overhead, plus the price for your target margin. Free, no sign-up.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("job-profitability"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (fraction: number | null) => (fraction === null ? "n/a" : `${(fraction * 100).toFixed(1)}%`);

/** The calculator's own defaults through its own function: the page cannot disagree with the tool. */
const EX = JOB_PROFITABILITY_DEFAULTS;
const R = calculateJobProfitability(EX);
const TARGET = 0.2;
const TARGET_PRICE = R.directCost / (1 - EX.overheadAllocationRate - TARGET);
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function JobProfitabilityCalculatorPage() {
  return (
    <CalculatorFrame
      slug="job-profitability"
      guideTitle="How to tell whether a job made money"
      lead={
        <p>
          A job can look good on the invoice and still lose money once labor, parts and its share of the office are
          counted. Enter one finished job to see what it actually left behind, what it would have made if it ran long,
          and the price that hits your target margin.
        </p>
      }
      facts={["No sign-up", "Revenue-to-profit chart", "Share link, save or print"]}
      howToUse={[
        "Pick a recent, finished job so the numbers are real, not estimated.",
        "Enter the revenue before sales tax.",
        "Use every paid hour on the job, including drive time and return trips, at your loaded cost per hour (wage plus burden). The Labor Cost Workspace works out that figure and can fill it in.",
        "Enter materials at what you paid, not what you charged, and anything you paid a subcontractor.",
        "For overhead, use last year's total overhead divided by last year's revenue.",
        "Repeat for a few job types (service call, repair, replacement) to see which ones carry the business.",
      ]}
      inputs={[
        { name: "Job revenue", text: "What the customer paid for the job, before sales tax." },
        { name: "Labor hours", text: "Every paid technician hour on the job, including the drive and any return trip." },
        { name: "Loaded labor cost", text: "Wage plus payroll taxes, insurance and benefits for one paid hour. Your cost, not the rate you bill." },
        { name: "Materials and subcontract", text: "Parts and supplies at your cost, and anything you paid another company to do." },
        { name: "Overhead allocation", text: "The job's share of the office, trucks, insurance and software, as a percentage of revenue: last year's overhead divided by last year's revenue." },
        { name: "Target margin and labor rate", text: "Optional. The net margin you aim for on every job, and the hourly rate you bill, to compare with what this job actually billed." },
      ]}
      workedExample={{
        setup: `A ${usd(EX.revenue)} job (before tax) that took ${EX.laborHours} paid hours at a loaded ${usd(EX.loadedLaborRate)} an hour, ${usd(EX.materialsCost)} of materials, no subcontractor, and overhead running at ${Math.round(EX.overheadAllocationRate * 100)}% of revenue. These are the calculator's example values, not industry averages.`,
        rows: [
          { label: "Labor cost", working: `${EX.laborHours} × ${usd(EX.loadedLaborRate)}`, value: usd(R.laborCost) },
          { label: "Direct cost", working: `${usd(R.laborCost)} + ${usd(EX.materialsCost)}`, value: usd(R.directCost) },
          { label: "Gross profit", working: `${usd(EX.revenue)} − ${usd(R.directCost)}`, value: usd(R.grossProfit) },
          { label: "Gross margin", value: pct(R.grossMargin) },
          { label: "Overhead share", working: `${usd(EX.revenue)} × ${Math.round(EX.overheadAllocationRate * 100)}%`, value: usd(R.overheadAllocated) },
          { label: "Net profit", working: `${usd(R.grossProfit)} − ${usd(R.overheadAllocated)}`, value: usd(R.netProfit), strong: true },
          { label: "Net margin", value: pct(R.netMargin), strong: true },
        ],
        conclusion: `The job shows ${usd(R.grossProfit)} of gross profit, but once it carries its share of the office it leaves ${usd(R.netProfit)}. Net profit, not gross, is what the business keeps.`,
      }}
      guide={[
        {
          id: "price-for-margin",
          label: "Pricing for a margin",
          title: "Working back from the margin you want",
          body: (
            <>
              <p>
                Once you know a job&apos;s direct cost and your overhead share, the price that leaves a target net margin
                is one division: direct cost ÷ (1 − overhead share − target margin). For the worked example at a{" "}
                {TARGET * 100}% target that is {usd(R.directCost)} ÷ (1 − 25% − 20%) = <strong>{usd(TARGET_PRICE)}</strong>.
                The calculator shows the same figure for your own job, and the difference from what it billed.
              </p>
              <p>
                If many jobs come in under target, look at the hours first: the what-if table shows how one extra hour
                eats into net profit. The{" "}
                <Link href={LABOR_WORKSPACE_PATH} className={link}>Labor Cost Workspace</Link> sets the hourly rate those hours should bill, and the{" "}
                <Link href={calculatorPath("break-even")} className={link}>break-even calculator</Link> shows how many such jobs the month needs.
              </p>
            </>
          ),
        },
      ]}
      formula={[
        "labor cost     = labor hours × loaded labor cost per hour",
        "direct cost    = labor cost + materials + subcontract",
        "gross profit   = revenue − direct cost",
        "gross margin   = gross profit ÷ revenue",
        "overhead       = revenue × overhead allocation %",
        "net profit     = gross profit − overhead",
        "net margin     = net profit ÷ revenue",
        "price for a target margin = direct cost ÷ (1 − overhead % − target margin %)",
      ]}
      assumptions={[
        "Overhead is allocated as a percentage of revenue. If you allocate overhead per labor hour instead, put it into the loaded hourly cost and set overhead to 0%.",
        "Revenue excludes sales tax.",
        "Warranty callbacks and financing or card fees are not included unless you add them to materials or subcontract.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      faq={[
        {
          question: "What is the difference between gross profit and net profit on a job?",
          answer:
            "Gross profit is revenue minus the job's direct costs: labor, materials and subcontractors. Net profit also takes off the job's share of overhead (the office, trucks, insurance, software), which is what the business actually keeps.",
        },
        {
          question: "What labor cost should I use?",
          answer:
            "Every paid hour on the job, including drive time and return trips, at your loaded cost: wage plus payroll taxes, insurance and benefits. Not the rate you bill. The Labor Cost Workspace shows both numbers.",
        },
        {
          question: "How do I work out my overhead percentage?",
          answer: "Divide last year's total overhead by last year's revenue. If overhead was $150,000 on $600,000 of revenue, that is 25%.",
        },
        {
          question: "How do I price a job for a target margin?",
          answer:
            "Divide the job's direct cost by one minus your overhead percentage minus your target margin. With $1,170 of direct cost, 25% overhead and a 20% target, that is $1,170 ÷ 0.55, or about $2,127.",
        },
      ]}
      featureKeys={["estimates", "reports"]}
    >
      <JobProfitabilityTool />
    </CalculatorFrame>
  );
}
