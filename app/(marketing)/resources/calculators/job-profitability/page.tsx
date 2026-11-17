import type { Metadata } from "next";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { JobProfitabilityCalculator } from "@/shared/components/resources/JobProfitabilityCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";
import {
  JOB_PROFITABILITY_DEFAULTS,
  calculateJobProfitability,
} from "@/shared/lib/resources/job-profitability";

const TITLE = "Job profitability calculator";
const DESCRIPTION =
  "Free job profitability calculator: gross profit, net profit and margin on one job from revenue, labor, materials and overhead. Formula shown.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("job-profitability"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

const usd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pct = (fraction: number | null) => (fraction === null ? "n/a" : `${(fraction * 100).toFixed(1)}%`);

/** The calculator's own defaults through its own function: the page cannot disagree with the tool. */
const EXAMPLE_INPUT = JOB_PROFITABILITY_DEFAULTS;
const EXAMPLE = calculateJobProfitability(EXAMPLE_INPUT);

export default function JobProfitabilityCalculatorPage() {
  return (
    <CalculatorFrame
      slug="job-profitability"
      intro="A job can look good on the invoice and still lose money once labor, parts and its share of the office are counted. Enter one job to see what it actually left behind."
      howToUse={[
        "Pick a recent, finished job so the numbers are real, not estimated.",
        "Enter the revenue before sales tax.",
        "Use every paid hour on the job, including drive time and return trips, at your loaded cost per hour (wage plus burden). The labor rate calculator shows how to get that figure.",
        "Enter materials at what you paid, not what you charged.",
        "For overhead, use last year's total overhead divided by last year's revenue.",
        "Repeat for a few job types (service call, repair, replacement) to see which ones carry the business.",
      ]}
      formula={[
        "labor cost     = labor hours × loaded labor cost per hour",
        "direct cost    = labor cost + materials + subcontract",
        "gross profit   = revenue − direct cost",
        "gross margin   = gross profit ÷ revenue",
        "overhead       = revenue × overhead allocation %",
        "net profit     = gross profit − overhead",
        "net margin     = net profit ÷ revenue",
      ]}
      assumptions={[
        "Overhead is allocated as a percentage of revenue. If you allocate overhead per labor hour instead, put it into the loaded hourly cost and set overhead to 0%.",
        "Revenue excludes sales tax.",
        "Warranty callbacks and financing or card fees are not included unless you add them to materials or subcontract.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      workedExample={{
        setup: `A ${usd(EXAMPLE_INPUT.revenue)} job (before tax) that took ${EXAMPLE_INPUT.laborHours} paid hours at a loaded ${usd(EXAMPLE_INPUT.loadedLaborRate)} an hour, ${usd(EXAMPLE_INPUT.materialsCost)} of materials, no subcontractor, and overhead running at ${Math.round(EXAMPLE_INPUT.overheadAllocationRate * 100)}% of revenue. These are the calculator's example values, not industry averages.`,
        lines: [
          { label: "Labor cost", value: usd(EXAMPLE.laborCost) },
          { label: "Direct cost (labor, materials, subcontract)", value: usd(EXAMPLE.directCost) },
          { label: "Gross profit", value: usd(EXAMPLE.grossProfit) },
          { label: "Gross margin", value: pct(EXAMPLE.grossMargin) },
          { label: "Overhead share", value: usd(EXAMPLE.overheadAllocated) },
          { label: "Net profit", value: usd(EXAMPLE.netProfit) },
          { label: "Net margin", value: pct(EXAMPLE.netMargin) },
        ],
        conclusion: `The job shows ${usd(EXAMPLE.grossProfit)} of gross profit, but once it carries its share of the office it leaves ${usd(EXAMPLE.netProfit)}. Net profit, not gross, is what the business keeps.`,
      }}
      faq={[
        {
          question: "What is the difference between gross profit and net profit on a job?",
          answer:
            "Gross profit is revenue minus the job's direct costs: labor, materials and subcontractors. Net profit also takes off the job's share of overhead (the office, trucks, insurance, software), which is what the business actually keeps.",
        },
        {
          question: "What labor cost should I use?",
          answer:
            "Every paid hour on the job, including drive time and return trips, at your loaded cost: wage plus payroll taxes, insurance and benefits. Not the rate you bill. The HVAC labor rate calculator shows both numbers.",
        },
        {
          question: "How do I work out my overhead percentage?",
          answer:
            "Divide last year's total overhead by last year's revenue. If overhead was $150,000 on $600,000 of revenue, that is 25%.",
        },
      ]}
      featureKeys={["estimates", "reports"]}
    >
      <JobProfitabilityCalculator />
    </CalculatorFrame>
  );
}
