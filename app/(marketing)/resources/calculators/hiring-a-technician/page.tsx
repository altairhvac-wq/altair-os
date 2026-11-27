import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { NewHireCalculator } from "@/shared/components/resources/calc/NewHireCalculator";
import { BulletList } from "@/shared/components/resources/tools/ToolGuide";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { NEW_HIRE_DEFAULTS, calculateNewHire } from "@/shared/lib/resources/new-hire";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Can I Afford Another HVAC Technician? Hiring Calculator";
const DESCRIPTION =
  "What another HVAC technician costs a month, the billed hours a week that pay for them, and the cash the first weeks take. Free calculator, no sign-up.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("hiring-a-technician"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** The calculator's own defaults through its own function: the page cannot disagree with the tool. */
const EX = NEW_HIRE_DEFAULTS;
const R = calculateNewHire(EX)!;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function HiringCalculatorPage() {
  return (
    <CalculatorFrame
      slug="hiring-a-technician"
      guideTitle="How to tell whether you can afford another technician"
      lead={
        <p>
          A new technician costs the wage, the payroll costs on top of it, and a truck. They pay for themselves once
          they bill enough hours a week to cover that. This calculator finds that number of hours, shows what is left
          once they are busy, and adds up the cash the first weeks take while their schedule fills.
        </p>
      }
      facts={["No sign-up", "Works for a helper or a lead tech", "Share link, save or print"]}
      howToUse={[
        "Enter the wage you would offer and your payroll costs as a percent of the wage.",
        "Enter the hours a week you will pay for, and what a truck, tools and a phone cost you a month. For a helper who rides along, leave the truck out.",
        "Enter your billable rate. If you have used the Labor Cost Workspace, one button fills it in.",
        "Enter the hours a week you expect them to bill once they are busy, and how many weeks it will take to get there.",
        "Read the hours that pay for the hire first. Then ask whether you have that much work waiting.",
      ]}
      inputs={[
        { name: "Hourly wage", text: "What you would pay the new technician per hour, before taxes and benefits." },
        { name: "Payroll costs (labor burden)", text: "Payroll taxes, workers' comp, insurance and benefits, as a percent of the wage. The same figure the labor rate calculator uses." },
        { name: "Paid hours a week", text: "The hours on the paycheck, including drive time, shop time and training." },
        { name: "Truck and tools", text: "What this technician adds each month besides pay: the truck payment, fuel, that truck's insurance, tools and a phone." },
        { name: "Your billable rate", text: "What one billed hour is quoted at. The recommended rate from the labor rate calculator." },
        { name: "Billed hours a week, once busy", text: "The hours that end up on invoices in a normal week, once the technician has a full schedule." },
        { name: "Weeks until that busy", text: "How long it takes before they bill that many hours. The calculator assumes billing grows evenly from nothing over those weeks." },
      ]}
      workedExample={{
        setup: `A shop offers ${usd0(EX.hourlyWage)} an hour for ${EX.paidHoursPerWeek} paid hours, with ${EX.burdenPercent}% payroll costs and ${usd0(EX.truckPerMonth)} a month for a truck and tools. Its rate is ${usd0(EX.billableRate)} an hour, and it expects ${EX.billedHoursPerWeek} billed hours a week after ${EX.rampWeeks} weeks. These are the calculator's example values, not industry averages.`,
        rows: [
          { label: "Cost a week", working: `$${EX.hourlyWage} × ${(1 + EX.burdenPercent / 100).toFixed(2)} × ${EX.paidHoursPerWeek} + $${EX.truckPerMonth} × 12 ÷ 52`, value: usd(R.weeklyCost), strong: true },
          { label: "Cost a month", working: `${usd(R.weeklyCost)} × 52 ÷ 12`, value: usd(R.monthlyCost) },
          { label: "Billed hours to break even", working: `${usd(R.weeklyCost)} ÷ $${EX.billableRate}`, value: R.breakEvenHoursPerWeek.toFixed(1), strong: true },
          { label: "Bills a week, once busy", working: `${EX.billedHoursPerWeek} × $${EX.billableRate}`, value: usd(R.weeklyRevenue) },
          { label: "Left over a month", working: `(${usd(R.weeklyRevenue)} − ${usd(R.weeklyCost)}) × 52 ÷ 12`, value: usd(R.monthlyLeftOver), strong: true },
          { label: "Cash to carry the hire", working: `weeks 1 to ${(R.firstWeekInTheBlack ?? EX.rampWeeks) - 1} cost more than they bill`, value: usd(R.cashToCarry) },
        ],
        conclusion: `This hire pays for itself at ${R.breakEvenHoursPerWeek.toFixed(1)} billed hours a week, ${Math.round(R.breakEvenShare * 100)}% of the hours on the paycheck. At ${EX.billedHoursPerWeek} billed hours it leaves ${usd0(R.monthlyLeftOver)} a month before parts margin, and the first weeks take about ${usd0(R.cashToCarry)} of cash.`,
      }}
      guide={[
        {
          id: "the-work",
          label: "Do you have the work?",
          title: "The wage is the easy part. The work is the question.",
          body: (
            <>
              <p>
                The calculator tells you how many billed hours a week the hire needs. Whether those hours exist is
                something only your schedule can answer. Signs that they do:
              </p>
              <BulletList
                items={[
                  "You are booking service calls more than a few days out, and customers are going elsewhere.",
                  "You are turning down installs, or putting them off, because nobody is free.",
                  "Your technicians are on overtime most weeks.",
                  "You are still running calls yourself when you should be selling or managing.",
                ]}
              />
              <p>
                If none of those is true, a new technician splits the work you already have instead of adding to it.
                The{" "}
                <Link href={calculatorPath("break-even")} className={link}>
                  break-even calculator
                </Link>{" "}
                shows how many jobs a month your crew can run against how many you need.
              </p>
            </>
          ),
        },
        {
          id: "left-out",
          label: "What it leaves out",
          title: "What this number leaves out",
          body: (
            <>
              <BulletList
                items={[
                  "Parts margin. Jobs the new technician runs also sell parts and equipment. That comes on top of the result.",
                  "Your time. Someone has to ride along, check their work and answer their calls for the first weeks. Those are hours your lead technician is not billing.",
                  "The cost of hiring. Job ads, a second set of tools bought up front, uniforms and training days are one-time costs, not in the weekly figure.",
                  "More office load. More jobs means more scheduling and more invoices. If that needs more office hours, add them to truck and tools.",
                ]}
              />
              <p>
                To see how the pay plan changes the picture, the{" "}
                <Link href={calculatorPath("technician-pay")} className={link}>
                  technician pay calculator
                </Link>{" "}
                compares hourly, flat rate and commission on the same week.
              </p>
            </>
          ),
        },
      ]}
      formula={[
        "cost a week        = wage × (1 + payroll costs) × paid hours + truck and tools × 12 ÷ 52",
        "break-even hours   = cost a week ÷ billable rate",
        "bills a week       = billed hours × billable rate",
        "left over a month  = (bills a week − cost a week) × 52 ÷ 12",
        "ramp week w of N   = bills a week × w ÷ N − cost a week",
        "cash to carry      = the ramp weeks below zero, added up",
      ]}
      assumptions={[
        "Only what the hire adds is counted. Your existing overhead is already being paid by the technicians you have.",
        "Revenue is labor only: billed hours at your rate. Parts and equipment margin is not included.",
        "Billing grows evenly from nothing to the expected hours over the ramp weeks. A real ramp is bumpier.",
        "A year is 52 weeks like the one you entered. Slow seasons are not modeled; try a slow-season number of billed hours too.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      faq={[
        {
          question: "How much does it cost to hire an HVAC technician?",
          answer: `More than the wage. Add your payroll costs (payroll taxes, workers' comp, insurance, benefits) and what a truck, tools and a phone cost a month. In this page's example a ${usd0(EX.hourlyWage)} wage becomes ${usd0(R.monthlyCost)} a month once those are counted. Use your own wage and costs in the calculator.`,
        },
        {
          question: "How many billable hours does a new technician need to pay for themselves?",
          answer: "Divide what the hire costs a week by your billable rate. That is the number of billed hours a week at which the hire costs you nothing. Every billed hour past it is what the hire adds, before parts margin.",
        },
        {
          question: "How long until a new technician pays for themselves?",
          answer: "It depends on how fast their schedule fills. The calculator assumes billing grows evenly over the weeks you enter and shows the first week that brings in more than it costs, and the cash you need to carry the weeks before it.",
        },
        {
          question: "Should I hire a helper instead of a technician?",
          answer: "Run both. A helper costs less and often needs no truck, but bills fewer hours. Enter the lower wage, leave out the truck and use the hours a helper really adds to invoices. The preset \"A helper, no truck\" shows the shape of it.",
        },
        {
          question: "Does this include my overhead?",
          answer: "No. It counts only what the new hire adds: wage, payroll costs and the truck. Your rent, office staff and insurance are already being paid by the technicians you have. If the hire means more office hours or a bigger shop, add that cost to truck and tools.",
        },
      ]}
      featureKeys={["dispatch", "time-clock"]}
    >
      <NewHireCalculator />
    </CalculatorFrame>
  );
}
