import type { Metadata } from "next";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { LaborRateCalculator } from "@/shared/components/resources/LaborRateCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { LABOR_RATE_DEFAULTS, calculateLaborRate } from "@/shared/lib/resources/labor-rate";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "HVAC Labor Rate Calculator: What to Charge per Hour";
const DESCRIPTION =
  "Free HVAC labor rate calculator: the hourly rate a technician has to bill to cover wage, burden, unbillable hours, overhead and margin. Worked example and formula shown.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("labor-rate"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

/** Cents in the arithmetic table; whole dollars ($30, $6,000) in the sentences around it. */
const usd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const dollars = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

/**
 * The worked example is the calculator's own defaults run through its own
 * function, so the page can never show arithmetic the tool would not.
 */
const EXAMPLE_INPUT = LABOR_RATE_DEFAULTS;
const EXAMPLE = calculateLaborRate(EXAMPLE_INPUT);

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
      inputs={[
        {
          name: "Technician wage",
          text: "The base hourly pay on the technician's pay stub, before taxes and benefits. For a crew, use an average or run each pay level separately.",
        },
        {
          name: "Labor burden",
          text: "What it costs to employ someone on top of the wage: the employer's payroll taxes, workers' comp, insurance and benefits, written as a percentage of the wage. Your payroll provider's reports or your accountant can give you the number.",
        },
        {
          name: "Billable hours per week",
          text: "Hours that end up on a customer's invoice. Not hours worked: hours charged. This is the input that moves the rate the most.",
        },
        {
          name: "Paid non-billable hours per week",
          text: "Hours you pay for that no customer pays for: driving between calls, the shop, the supply house, training, meetings and free callbacks.",
        },
        {
          name: "Overhead allocated per month",
          text: "This technician's share of everything that is not field labor or materials: rent, office pay, trucks, insurance, software, marketing. Total monthly overhead divided by the number of field technicians is a fair start.",
        },
        {
          name: "Target net margin",
          text: "The profit you want left after every cost, as a share of the billed rate. A margin, not a markup: 20% margin means $20 of every $100 billed is profit.",
        },
      ]}
      workedExample={
        EXAMPLE
          ? {
              setup: `One technician paid ${dollars(EXAMPLE_INPUT.hourlyWage)} an hour, with ${pct(EXAMPLE_INPUT.burdenRate)} labor burden, ${EXAMPLE_INPUT.billableHoursPerWeek} billable and ${EXAMPLE_INPUT.nonBillableHoursPerWeek} non-billable hours a week, ${dollars(EXAMPLE_INPUT.monthlyOverhead)} of overhead a month, and a ${pct(EXAMPLE_INPUT.targetNetMargin)} target margin. These are the calculator's example values, not industry averages.`,
              lines: [
                { label: "Loaded hourly cost (wage plus burden)", value: usd(EXAMPLE.loadedHourlyCost) },
                {
                  label: `Weekly labor cost (${EXAMPLE.paidHoursPerWeek} paid hours)`,
                  value: usd(EXAMPLE.weeklyLaborCost),
                },
                { label: "Weekly share of overhead", value: usd(EXAMPLE.weeklyOverhead) },
                { label: "Total weekly cost", value: usd(EXAMPLE.weeklyTotalCost) },
                {
                  label: `Cost per billable hour (÷ ${EXAMPLE_INPUT.billableHoursPerWeek} hours)`,
                  value: usd(EXAMPLE.costPerBillableHour),
                },
                {
                  label: `Billable rate at ${pct(EXAMPLE_INPUT.targetNetMargin)} margin`,
                  value: usd(EXAMPLE.billableHourlyRate),
                },
                { label: "Rounded up to quote", value: usd(EXAMPLE.billableHourlyRateRounded) },
              ],
              conclusion: `A ${dollars(EXAMPLE_INPUT.hourlyWage)} wage turns into a ${dollars(EXAMPLE.billableHourlyRateRounded)} billed hour once burden, unbilled hours, overhead and margin are counted. Charge ${usd(EXAMPLE.costPerBillableHour)} and every hour only breaks even.`,
            }
          : undefined
      }
      faq={[
        {
          question: "How do I calculate my HVAC labor rate?",
          answer:
            "Add up what a technician costs you in a week (wage plus burden, for every paid hour, plus their share of overhead), divide by the hours you actually bill, then divide by one minus your target margin. The calculator above does exactly that and shows each step.",
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
          answer:
            "No. This rate covers labor and overhead only. Price parts and equipment separately, with their own markup, on the estimate and the invoice.",
        },
        {
          question: "What is a typical HVAC labor rate?",
          answer:
            "It depends on your wages, overhead, market and how many hours you bill, which is why this page gives a calculator instead of a number. Use your own figures; the example values above are placeholders, not benchmarks.",
        },
      ]}
      featureKeys={["price-book", "time-clock"]}
    >
      <LaborRateCalculator />
    </CalculatorFrame>
  );
}
