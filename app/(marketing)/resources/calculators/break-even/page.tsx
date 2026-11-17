import type { Metadata } from "next";
import { BreakEvenCalculator } from "@/shared/components/resources/BreakEvenCalculator";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { BREAK_EVEN_DEFAULTS, calculateBreakEven } from "@/shared/lib/resources/break-even";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "HVAC Break-Even Calculator: Jobs per Month to Cover Costs";
const DESCRIPTION =
  "Free break-even calculator for HVAC and service companies: how many jobs and how much revenue a month it takes to cover fixed costs. Worked example and formula shown, no account.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("break-even"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

const usd = (value: number, digits = 2) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

/** The calculator's own defaults through its own function: the page cannot disagree with the tool. */
const EXAMPLE_INPUT = BREAK_EVEN_DEFAULTS;
const EXAMPLE = calculateBreakEven(EXAMPLE_INPUT);

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
      inputs={[
        {
          name: "Fixed monthly costs",
          text: "Everything you pay in a month whether or not a truck rolls: rent, insurance, office and owner salaries, truck and loan payments, software, phones, marketing you have committed to. Take it from your books for a normal month.",
        },
        {
          name: "Average job revenue",
          text: "Your average ticket: total revenue divided by the number of jobs over the last three to six months. Use the same months for both numbers.",
        },
        {
          name: "Variable costs",
          text: "What each job uses up, as a percentage of what it brings in: parts and equipment, field labor paid for the job, permits, card processing fees. If a $1,000 job costs $350 in these, that is 35%.",
        },
      ]}
      workedExample={
        EXAMPLE
          ? {
              setup: `A shop with ${usd(EXAMPLE_INPUT.fixedMonthlyCosts, 0)} of fixed costs a month, an average job of ${usd(EXAMPLE_INPUT.averageJobRevenue, 0)}, and variable costs of ${pct(EXAMPLE_INPUT.variableCostRate)} of revenue. These are the calculator's example values, not industry averages.`,
              lines: [
                {
                  label: `Contribution per job (${usd(EXAMPLE_INPUT.averageJobRevenue, 0)} × ${pct(EXAMPLE.contributionMarginRate)})`,
                  value: usd(EXAMPLE.contributionPerJob),
                },
                {
                  label: "Break-even jobs (fixed costs ÷ contribution)",
                  value: EXAMPLE.breakEvenJobsExact.toFixed(1),
                },
                { label: "Rounded up to whole jobs", value: String(EXAMPLE.breakEvenJobs) },
                { label: "Break-even revenue per month", value: usd(EXAMPLE.breakEvenRevenue) },
                { label: "Jobs per week", value: EXAMPLE.breakEvenJobsPerWeek.toFixed(1) },
              ],
              conclusion: `This shop needs ${EXAMPLE.breakEvenJobs} jobs a month, about ${EXAMPLE.breakEvenJobsPerWeek.toFixed(1)} a week, before it makes a dollar of profit. Job ${EXAMPLE.breakEvenJobs + 1} is the first one that pays the owner.`,
            }
          : undefined
      }
      faq={[
        {
          question: "How do I calculate break-even for an HVAC business?",
          answer:
            "Work out how much each job leaves after its own costs (average job revenue times one minus your variable cost percentage). Divide your fixed monthly costs by that number. The result is how many jobs a month it takes to cover the fixed costs.",
        },
        {
          question: "What counts as a fixed cost and what counts as variable?",
          answer:
            "Fixed costs arrive whether or not you run a job: rent, insurance, office pay, truck payments, software. Variable costs scale with each job: parts, field labor paid for the job, permits and card fees.",
        },
        {
          question: "Does break-even include paying myself?",
          answer:
            "Only if your salary is in fixed costs. Break-even means zero profit, so if your pay is not in the fixed costs, the jobs after break-even are what pays you.",
        },
        {
          question: "How can I lower my break-even point?",
          answer:
            "Three levers: a higher average ticket, lower variable costs per job, or lower fixed costs. Change one input at a time in the calculator to see which moves the number most for your shop.",
        },
      ]}
      featureKeys={["reports", "dispatch"]}
    >
      <BreakEvenCalculator />
    </CalculatorFrame>
  );
}
