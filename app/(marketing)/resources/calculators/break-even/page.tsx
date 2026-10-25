import type { Metadata } from "next";
import { BreakEvenCalculator } from "@/shared/components/resources/BreakEvenCalculator";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Break-even calculator";
const DESCRIPTION =
  "Find how many jobs and how much revenue per month it takes to cover your fixed costs, from fixed monthly costs, average job revenue and variable cost percentage. Free, with the formula shown.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("break-even"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

export default function BreakEvenCalculatorPage() {
  return (
    <CalculatorFrame
      slug="break-even"
      intro="Every month starts in the hole by the amount of your fixed costs. Each job digs you out by whatever is left after its own costs. This calculator shows how many jobs that takes."
      howToUse={[
        "Add up fixed costs for a normal month from your books: rent, insurance, office and owner salaries, vehicle payments, software, loan payments.",
        "Average job revenue is total revenue divided by the number of jobs over the last three to six months.",
        "Variable costs are what each job consumes: parts, field labor, permits, card fees. Enter them as a percentage of revenue.",
        "Compare the break-even jobs with how many jobs your crew can realistically run in a month.",
        "Try a higher average ticket or lower variable costs to see which moves the number more.",
      ]}
      formula={[
        "contribution per job  = average job revenue × (1 − variable cost %)",
        "break-even jobs       = fixed monthly costs ÷ contribution per job",
        "break-even revenue    = fixed monthly costs ÷ (1 − variable cost %)",
        "jobs per week         = break-even jobs ÷ (52 ÷ 12)",
      ]}
      assumptions={[
        "Fixed costs stay the same regardless of job count over the month.",
        "Variable costs are a steady percentage of revenue on every job.",
        "Break-even means zero profit: no owner profit, reserves or debt paydown beyond what is in fixed costs.",
        "Jobs are rounded up to whole jobs; weeks use 52 weeks and 12 months per year.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      featureKeys={["reports", "dispatch"]}
    >
      <BreakEvenCalculator />
    </CalculatorFrame>
  );
}
