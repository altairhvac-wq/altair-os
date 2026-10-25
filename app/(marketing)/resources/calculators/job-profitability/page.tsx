import type { Metadata } from "next";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { JobProfitabilityCalculator } from "@/shared/components/resources/JobProfitabilityCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Job profitability calculator";
const DESCRIPTION =
  "Work out gross profit, net profit and margin on a single job from revenue, labor hours, loaded labor cost, materials, subcontract and overhead allocation. Free, with the formula shown.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("job-profitability"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

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
      featureKeys={["estimates", "reports"]}
    >
      <JobProfitabilityCalculator />
    </CalculatorFrame>
  );
}
