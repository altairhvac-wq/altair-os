import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { CallbackCostTool } from "@/shared/components/resources/calc/CallbackCostTool";
import { BulletList } from "@/shared/components/resources/tools/ToolGuide";
import { CALLBACK_COST_DEFAULTS, calculateCallbackCost } from "@/shared/lib/resources/callback-cost";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "HVAC Callback Cost Calculator: What Callbacks Cost";
const DESCRIPTION =
  "What unpaid HVAC callbacks cost a month and a year, your callback rate, the technician hours lost and what cutting them is worth. Free, no sign-up.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("callback-cost"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const EX = CALLBACK_COST_DEFAULTS;
const R = calculateCallbackCost(EX)!;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function CallbackCostCalculatorPage() {
  return (
    <CalculatorFrame
      slug="callback-cost"
      guideTitle="How to put a number on HVAC callbacks"
      lead={
        <p>
          A callback is a trip back to a finished job that nobody pays for. Each one costs the hours it takes and the
          parts it uses, and it takes a paying job&apos;s place on the schedule. This calculator puts a monthly and
          yearly number on it, and shows what cutting callbacks would be worth.
        </p>
      }
      facts={["No sign-up", "What-if by callback rate", "Share link, save or print"]}
      howToUse={[
        "Count last month's callbacks: return trips to a finished job that were not billed.",
        "Enter the jobs completed in the same month so the callback rate is real.",
        "Enter the time a typical callback takes, with the drive both ways, and the parts it usually uses at your cost.",
        "Use your cost per billable hour and your billable rate. If you have used the Labor Cost Workspace, one button fills both in.",
        "Read the monthly and yearly cost, then the bars and the table to see what fewer callbacks would save.",
      ]}
      inputs={[
        { name: "Callbacks", text: "Return trips to a job you already finished that the customer did not pay for: the same problem again, a missed step, a part that failed under your warranty." },
        { name: "Jobs completed", text: "All jobs finished in the same month, so the callback rate compares like with like." },
        { name: "Hours per callback", text: "Time on site plus the drive there and back, on a typical callback." },
        { name: "Parts given away", text: "Parts and materials used on a typical callback, at your cost." },
        { name: "Cost per billable hour", text: "What one hour of technician time costs you once wage, burden, unbilled time and overhead are counted: your break-even labor rate." },
        { name: "Billable rate", text: "What an hour bills on paying work. Used only to show what the lost hours could have billed." },
      ]}
      workedExample={{
        setup: `${EX.callbacksPerMonth} callbacks in a month of ${EX.jobsPerMonth} jobs, ${EX.hoursPerCallback} hours each at a ${usd0(EX.costPerBillableHour)} cost per billable hour, with ${usd0(EX.partsPerCallback)} of parts given away each time, and a ${usd0(EX.billableRate)} billable rate. These are the calculator's example values, not industry averages.`,
        rows: [
          { label: "Callback rate", working: `${EX.callbacksPerMonth} ÷ ${EX.jobsPerMonth}`, value: `${((R.callbackRate ?? 0) * 100).toFixed(1)}%` },
          { label: "Cost per callback", working: `${EX.hoursPerCallback} × $${EX.costPerBillableHour} + $${EX.partsPerCallback}`, value: usd(R.costPerCallback) },
          { label: "Cost per month", working: `${EX.callbacksPerMonth} × ${usd(R.costPerCallback)}`, value: usd(R.costPerMonth), strong: true },
          { label: "Cost per year", working: `${usd(R.costPerMonth)} × 12`, value: usd(R.costPerYear), strong: true },
          { label: "Hours lost per month", working: `${EX.callbacksPerMonth} × ${EX.hoursPerCallback}`, value: R.hoursLostPerMonth.toFixed(1) },
          { label: "Those hours would bill", working: `${R.hoursLostPerMonth.toFixed(1)} × $${EX.billableRate}`, value: usd(R.revenueNotBilledPerMonth) },
        ],
        conclusion: `${EX.callbacksPerMonth} free trips a month cost this shop ${usd0(R.costPerYear)} a year and ${(R.hoursLostPerMonth * 12).toFixed(0)} technician hours. Halving them is worth ${usd0(R.costPerYear / 2)} a year before counting the paying work those hours could do.`,
      }}
      guide={[
        {
          id: "causes",
          label: "Finding the causes",
          title: "Cutting callbacks starts with knowing why they happen",
          body: (
            <>
              <p>The number on its own does not fix anything. For a month, write down why each callback happened, then sort them:</p>
              <BulletList
                items={[
                  "The same fault came back: diagnosis or the repair itself.",
                  "A step was missed: a checklist problem, often fixed with a written one per job type.",
                  "A part failed early: a supplier or part-choice problem.",
                  "The customer was not shown what was done: a communication problem, often fixed with photos and notes on the invoice.",
                ]}
              />
              <p>
                The{" "}
                <Link href={calculatorPath("job-profitability")} className={link}>job profitability calculator</Link> shows what a job that came back
                really made, and the{" "}
                <Link href={calculatorPath("technician-pay")} className={link}>technician pay calculator</Link> shows how each pay plan treats the
                hours a callback takes.
              </p>
            </>
          ),
        },
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
      faq={[
        {
          question: "What counts as an HVAC callback?",
          answer: "A return trip to a job you already finished that the customer does not pay for: the same problem coming back, a missed step, or a part that failed under your warranty. A new, unrelated problem at the same house is a new job, not a callback.",
        },
        {
          question: "How do I calculate the cost of a callback?",
          answer: "Multiply the hours a callback takes, drive included, by your cost per billable hour, and add the parts it uses at your cost. Multiply by the callbacks in a month for the monthly cost, and by twelve for the year.",
        },
        {
          question: "What is a good callback rate?",
          answer: "We have not found a reliable published benchmark, so this page does not quote one. Track your own rate month to month: the trend, and the reasons behind each callback, tell you more than any industry figure.",
        },
        {
          question: "Should I count the revenue those hours could have billed?",
          answer: "Only if paying work was waiting for them. The calculator shows that figure beside the cost, not added to it, because in a slow month the hours would not have been billed anyway.",
        },
      ]}
      featureKeys={["time-clock", "reports"]}
    >
      <CallbackCostTool />
    </CalculatorFrame>
  );
}
