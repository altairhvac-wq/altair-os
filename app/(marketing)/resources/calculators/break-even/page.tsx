import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { BreakEvenTool } from "@/shared/components/resources/calc/BreakEvenTool";
import { BulletList } from "@/shared/components/resources/tools/ToolGuide";
import { BREAK_EVEN_DEFAULTS, calculateBreakEven } from "@/shared/lib/resources/break-even";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "HVAC Break-Even Calculator: Jobs Needed per Month";
const DESCRIPTION =
  "How many jobs and how much revenue a month cover your HVAC company's fixed costs. Chart, profit goal, crew capacity check and PDF. Free, no sign-up.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("break-even"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number, digits = 2) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

/** The calculator's own defaults through its own function: the page cannot disagree with the tool. */
const EX = BREAK_EVEN_DEFAULTS;
const R = calculateBreakEven(EX)!;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function BreakEvenCalculatorPage() {
  return (
    <CalculatorFrame
      slug="break-even"
      guideTitle="How to find your HVAC break-even point"
      lead={
        <p>
          Every month starts in the hole by the amount of your fixed costs. Each job digs you out by whatever is left
          after its own costs. This calculator shows how many jobs that takes, how many more reach your profit goal,
          and whether your crew can run them.
        </p>
      }
      facts={["No sign-up", "Chart and what-if table", "Share link, save or print"]}
      howToUse={[
        "Add up fixed costs for a normal month from your books: rent, insurance, office and owner salaries, vehicle payments, software, loan payments. If you have used the Labor Cost Workspace, its overhead can fill this in.",
        "Average job revenue is total revenue divided by the number of jobs over the last three to six months.",
        "Variable costs are what each job consumes: parts, field labor, permits, card fees. Enter them as a percentage of revenue.",
        "Add a monthly profit goal and your crew's capacity (technicians, jobs a day, working days) to see how far past break-even you can get.",
        "Use the what-if table to see whether a higher average ticket or lower variable costs moves the number more for your shop.",
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
        {
          name: "Profit goal and capacity",
          text: "Optional. The monthly profit you want after every fixed cost, and how many jobs your technicians can realistically run in a month. Use an average day, not your best one.",
        },
      ]}
      workedExample={{
        setup: `A shop with ${usd(EX.fixedMonthlyCosts, 0)} of fixed costs a month, an average job of ${usd(EX.averageJobRevenue, 0)}, and variable costs of ${pct(EX.variableCostRate)} of revenue. These are the calculator's example values, not industry averages.`,
        rows: [
          { label: "Each job leaves", working: `${usd(EX.averageJobRevenue, 0)} × (1 − ${pct(EX.variableCostRate)})`, value: usd(R.contributionPerJob) },
          { label: "Break-even jobs", working: `${usd(EX.fixedMonthlyCosts, 0)} ÷ ${usd(R.contributionPerJob)}`, value: R.breakEvenJobsExact.toFixed(1) },
          { label: "Rounded up to whole jobs", value: String(R.breakEvenJobs), strong: true },
          { label: "Break-even revenue", working: `${usd(EX.fixedMonthlyCosts, 0)} ÷ (1 − ${pct(EX.variableCostRate)})`, value: usd(R.breakEvenRevenue), strong: true },
          { label: "Jobs per week", working: `${R.breakEvenJobsExact.toFixed(1)} ÷ (52 ÷ 12)`, value: R.breakEvenJobsPerWeek.toFixed(1) },
        ],
        conclusion: `This shop needs ${R.breakEvenJobs} jobs a month, about ${R.breakEvenJobsPerWeek.toFixed(1)} a week, before it makes a dollar of profit. Job ${R.breakEvenJobs + 1} is the first one that pays the owner.`,
      }}
      guide={[
        {
          id: "move-it",
          label: "Moving the number",
          title: "Three ways to lower your break-even point",
          body: (
            <>
              <BulletList
                items={[
                  <>
                    <strong>Raise the average ticket.</strong> Price from your real labor cost (the{" "}
                    <Link href={LABOR_WORKSPACE_PATH} className={link}>Labor Cost Workspace</Link> shows it), present repair options, and sell
                    maintenance agreements so the month starts with revenue already booked.
                  </>,
                  <>
                    <strong>Lower variable costs per job.</strong> Fewer free return trips (the{" "}
                    <Link href={calculatorPath("callback-cost")} className={link}>callback cost calculator</Link> puts a number on them), better parts
                    buying and less drive time all raise what each job leaves.
                  </>,
                  <>
                    <strong>Lower fixed costs.</strong> Usually the slowest lever, but every dollar off fixed costs comes straight off the
                    break-even revenue.
                  </>,
                ]}
              />
              <p>
                Then check single jobs: the{" "}
                <Link href={calculatorPath("job-profitability")} className={link}>job profitability calculator</Link> shows whether the jobs that make
                up your average actually make money once overhead is counted.
              </p>
            </>
          ),
        },
      ]}
      formula={[
        "contribution per job  = average job revenue × (1 − variable cost %)",
        "break-even jobs       = fixed monthly costs ÷ contribution per job",
        "break-even revenue    = fixed monthly costs ÷ (1 − variable cost %)",
        "jobs for a profit     = (fixed monthly costs + profit goal) ÷ contribution per job",
        "jobs per week         = break-even jobs ÷ (52 ÷ 12)",
        "crew capacity         = technicians × jobs per technician per day × working days",
      ]}
      assumptions={[
        "Fixed costs stay the same regardless of job count over the month.",
        "Variable costs are a steady percentage of revenue on every job.",
        "Break-even means zero profit: no owner profit, reserves or debt paydown beyond what is in fixed costs.",
        "Jobs are rounded up to whole jobs; weeks use 52 weeks and 12 months per year.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
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
            "Only if your salary is in fixed costs. Break-even means zero profit, so if your pay is not in the fixed costs, the jobs after break-even are what pays you. Use the profit goal to see how many jobs that takes.",
        },
        {
          question: "How can I lower my break-even point?",
          answer:
            "Three levers: a higher average ticket, lower variable costs per job, or lower fixed costs. The what-if table in the calculator shows which moves the number most for your shop.",
        },
        {
          question: "What if break-even is more jobs than my crew can run?",
          answer:
            "Then the month cannot cover its costs at today's prices and costs, however busy the schedule. Raise the average ticket, cut variable or fixed costs, or add capacity before adding more marketing.",
        },
      ]}
      featureKeys={["reports", "dispatch"]}
    >
      <BreakEvenTool />
    </CalculatorFrame>
  );
}
