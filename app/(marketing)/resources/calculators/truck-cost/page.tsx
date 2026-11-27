import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { TruckCostCalculator } from "@/shared/components/resources/calc/TruckCostCalculator";
import { BulletList } from "@/shared/components/resources/tools/ToolGuide";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { TRUCK_COST_DEFAULTS, calculateTruckCost } from "@/shared/lib/resources/truck-cost";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Service Truck Cost Calculator: Per Day, Hour and Job";
const DESCRIPTION =
  "What one HVAC service truck costs a month, per working day, per billed hour and per job, and what a parked day still costs. Free calculator, no sign-up.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("truck-cost"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** The calculator's own defaults through its own function: the page cannot disagree with the tool. */
const EX = TRUCK_COST_DEFAULTS;
const R = calculateTruckCost(EX)!;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function TruckCostCalculatorPage() {
  return (
    <CalculatorFrame
      slug="truck-cost"
      guideTitle="How to work out what a service truck costs"
      lead={
        <p>
          A service truck costs money every month whether or not it leaves the yard: the payment, the insurance, the
          fuel, the repairs. This calculator adds those up and spreads them over the days the truck works, the hours
          it bills and the jobs it runs, so you can see what the truck has cost before the technician earns a dollar.
        </p>
      }
      facts={["No sign-up", "Per day, per billed hour, per job", "Share link, save or print"]}
      howToUse={[
        "Enter the truck's payment. If it is paid off, enter 0, or divide what a replacement will cost by the months you will keep it.",
        "Enter this truck's insurance, an average month of fuel, and maintenance and repairs averaged over a year.",
        "Enter the costs that come once a year: registration, inspection, a GPS subscription, lettering.",
        "Enter the days a month the truck goes out, the hours a day it bills and the jobs it runs.",
        "Read the cost per working day first. Then check whether your labor rate already includes it.",
      ]}
      inputs={[
        { name: "Payment", text: "The loan or lease payment. For a truck bought outright, the price divided by the months you expect to keep it, so its replacement is being saved for." },
        { name: "Insurance", text: "This truck's share of the commercial auto policy, per month." },
        { name: "Fuel", text: "An average month of fuel for this truck." },
        { name: "Maintenance, tires and repairs", text: "Oil changes, tires and repairs for a year, divided by 12, so one large repair is spread out." },
        { name: "Registration and other", text: "What comes once a year: registration, inspection, a GPS or tracking subscription, lettering or a wrap divided by the years it lasts." },
        { name: "Working days a month", text: "The days the truck goes out on jobs. Five days a week is about 21." },
        { name: "Billed hours a day", text: "The hours a day that end up on invoices for this truck's technician." },
        { name: "Jobs a day", text: "The jobs this truck runs on a normal day." },
      ]}
      workedExample={{
        setup: `A financed service truck: ${usd0(EX.paymentPerMonth)} payment, ${usd0(EX.insurancePerMonth)} insurance, ${usd0(EX.fuelPerMonth)} of fuel and ${usd0(EX.maintenancePerMonth)} of upkeep a month, plus ${usd0(EX.otherPerYear)} a year for registration and tracking. It works ${EX.workingDaysPerMonth} days a month, bills ${EX.billedHoursPerDay} hours a day and runs ${EX.jobsPerDay} jobs. These are the calculator's example values, not industry averages.`,
        rows: [
          { label: "Cost per month", working: `$${EX.paymentPerMonth} + $${EX.insurancePerMonth} + $${EX.fuelPerMonth} + $${EX.maintenancePerMonth} + $${EX.otherPerYear} ÷ 12`, value: usd(R.perMonth), strong: true },
          { label: "Cost per year", working: `${usd(R.perMonth)} × 12`, value: usd(R.perYear) },
          { label: "Cost per working day", working: `${usd(R.perMonth)} ÷ ${EX.workingDaysPerMonth}`, value: usd(R.perWorkingDay), strong: true },
          { label: "Cost per billed hour", working: `${usd(R.perWorkingDay)} ÷ ${EX.billedHoursPerDay}`, value: usd(R.perBilledHour ?? 0) },
          { label: "Cost per job", working: `${usd(R.perWorkingDay)} ÷ ${EX.jobsPerDay}`, value: usd(R.perJob ?? 0) },
          { label: "A parked day", working: `($${EX.paymentPerMonth} + $${EX.insurancePerMonth} + $${EX.otherPerYear / 12}) ÷ ${EX.workingDaysPerMonth}`, value: usd(R.parkedDay) },
        ],
        conclusion: `This truck costs ${usd(R.perWorkingDay)} every working day: ${usd(R.perBilledHour ?? 0)} of every billed hour and ${usd(R.perJob ?? 0)} of every job. A day it sits parked still costs ${usd(R.parkedDay)}.`,
      }}
      guide={[
        {
          id: "count-it-once",
          label: "Count it once",
          title: "Put the truck in your rate once, not twice",
          body: (
            <>
              <p>
                This number already has a home in your pricing. In the{" "}
                <Link href={LABOR_WORKSPACE_PATH} className={link}>
                  labor rate calculator
                </Link>{" "}
                the truck goes under &ldquo;Vehicle and tools per technician&rdquo; when you itemize payroll costs, or
                under shop costs if you would rather keep it there. Either works. Both at once counts the truck twice
                and prices you out of jobs.
              </p>
              <p>
                If your rate was set without the truck, the cost per billed hour on this page is what the rate is
                missing. Separate trip charges are the other place shops recover it; the{" "}
                <Link href={calculatorPath("service-call-fee")} className={link}>
                  service call fee calculator
                </Link>{" "}
                checks that fee against your costs.
              </p>
            </>
          ),
        },
        {
          id: "lower-it",
          label: "Lowering the number",
          title: "Three ways the cost per day comes down",
          body: (
            <>
              <BulletList
                items={[
                  "More working days. The payment and the insurance are the same whether the truck goes out 15 days or 22, so every extra working day makes each one cheaper.",
                  "More billed hours in the day. Tighter routes and fewer trips back for parts put the same truck cost over more billed hours.",
                  "Fewer callbacks. A free return trip burns fuel and a slot in the day and bills nothing.",
                ]}
              />
              <p>
                The{" "}
                <Link href={calculatorPath("callback-cost")} className={link}>
                  callback cost calculator
                </Link>{" "}
                puts a number on return trips, and the{" "}
                <Link href={calculatorPath("hiring-a-technician")} className={link}>
                  hiring calculator
                </Link>{" "}
                uses this truck cost when you weigh another technician.
              </p>
            </>
          ),
        },
      ]}
      formula={[
        "cost per month       = payment + insurance + fuel + maintenance + other per year ÷ 12",
        "cost per year        = cost per month × 12",
        "cost per working day = cost per month ÷ working days a month",
        "cost per billed hour = cost per working day ÷ billed hours a day",
        "cost per job         = cost per working day ÷ jobs a day",
        "a parked day         = (payment + insurance + other per year ÷ 12) ÷ working days a month",
      ]}
      assumptions={[
        "Every month looks like the one you entered. Use averages for fuel and repairs.",
        "A parked day leaves out fuel and maintenance, which mostly stop when the truck does.",
        "A paid-off truck with 0 entered as the payment sets nothing aside for its replacement.",
        "The technician's pay, tools and stock on the truck are not counted here. Tools and phone can go with the truck in the labor rate calculator.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      faq={[
        {
          question: "How much does an HVAC service truck cost per day?",
          answer: `Add the payment, insurance, fuel, maintenance and a twelfth of the yearly costs, then divide by the days the truck works in a month. In this page's example that is ${usd(R.perMonth)} a month over ${EX.workingDaysPerMonth} working days: ${usd(R.perWorkingDay)} a day. Put your own truck's numbers in the calculator.`,
        },
        {
          question: "Should I charge customers a truck fee?",
          answer: "Only if your labor rate does not already cover the truck. Most shops build it into the hourly rate or the service call fee. A separate line on the invoice is fine too, as long as the truck is counted in one place and not two.",
        },
        {
          question: "What should I enter for a truck that is paid off?",
          answer: "Enter 0 to see what it costs to run today. To see what it really costs to own, enter what its replacement will cost divided by the months you will keep it: the truck will wear out whether or not you are saving for the next one.",
        },
        {
          question: "Does this include the technician's wage?",
          answer: "No. This is the truck alone. The labor rate calculator adds the wage, payroll costs, unbilled time and overhead to get a full hourly rate, and has a line for the truck.",
        },
      ]}
      featureKeys={["dispatch", "reports"]}
    >
      <TruckCostCalculator />
    </CalculatorFrame>
  );
}
