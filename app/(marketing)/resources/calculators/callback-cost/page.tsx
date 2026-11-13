import type { Metadata } from "next";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { CallbackCostCalculator } from "@/shared/components/resources/CallbackCostCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Callback cost calculator";
const DESCRIPTION =
  "Free HVAC callback cost calculator: what unpaid return trips cost per month and per year, your callback rate, and the billable hours they use up. Formula shown, no account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("callback-cost"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

export default function CallbackCostCalculatorPage() {
  return (
    <CalculatorFrame
      slug="callback-cost"
      intro="A callback is a trip back to a finished job that nobody pays for. Each one costs the hour it takes and the parts it uses, and it takes a paying job's place on the schedule. This calculator puts a monthly and yearly number on it."
      howToUse={[
        "Count last month's callbacks: return trips to a finished job that were not billed.",
        "Enter the jobs completed in the same month so the callback rate is real.",
        "Enter the time a typical callback takes, with the drive both ways.",
        "Use your cost per billable hour from the labor rate calculator, and the parts a callback usually uses at your cost.",
        "Enter your billable rate to see what those hours would have billed on paying work.",
      ]}
      formula={[
        "callback rate        = callbacks ÷ jobs completed",
        "cost per callback    = hours per callback × cost per billable hour + parts",
        "cost per month       = callbacks × cost per callback",
        "cost per year        = cost per month × 12",
        "hours lost per month = callbacks × hours per callback",
        "revenue those hours would bill = hours lost × billable rate",
      ]}
      assumptions={[
        "Every callback takes about the same time and parts. Use an average.",
        "The cost and the revenue those hours would have billed are shown side by side and are not added together. The second number only applies if you had paying work waiting for those hours.",
        "Refunds, credits and customers who do not call again are not counted.",
        "A year is twelve months like the one you entered.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      featureKeys={["time-clock", "reports"]}
    >
      <CallbackCostCalculator />
    </CalculatorFrame>
  );
}
