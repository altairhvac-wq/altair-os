import type { Metadata } from "next";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { LaborRateCalculator } from "@/shared/components/resources/LaborRateCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Labor rate calculator";
const DESCRIPTION =
  "Calculate the hourly rate a technician needs to bill to cover wage, labor burden, unbillable hours, overhead and your target net margin. Free, with the formula shown.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("labor-rate"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

export default function LaborRateCalculatorPage() {
  return (
    <CalculatorFrame
      slug="labor-rate"
      intro="A technician's billed hour has to pay for more than the wage: payroll taxes and benefits, the paid hours nobody can bill, a share of the office, and the profit the business needs to keep. This calculator spreads all of it over the hours you actually bill."
      howToUse={[
        "Start with one technician, or an average across your crew.",
        "Enter the base wage and your labor burden. Your payroll provider or accountant can give you the burden percentage.",
        "Be honest about billable hours: count only hours that end up on an invoice. Drive, shop and training time go in non-billable.",
        "For overhead, divide your monthly overhead by the number of field technicians, or use the share you already allocate.",
        "Compare the result with the rate you charge today. If it is higher, look at billable hours and overhead before raising prices.",
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
      featureKeys={["price-book", "time-clock"]}
    >
      <LaborRateCalculator />
    </CalculatorFrame>
  );
}
