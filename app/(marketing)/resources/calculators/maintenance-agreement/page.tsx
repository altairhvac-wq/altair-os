import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { MaintenanceAgreementTool } from "@/shared/components/resources/calc/MaintenanceAgreementTool";
import { BulletList } from "@/shared/components/resources/tools/ToolGuide";
import { RESOURCES_TEMPLATES_PATH, calculatorPath } from "@/shared/lib/resources/catalog";
import { MAINTENANCE_AGREEMENT_DEFAULTS, calculateMaintenanceAgreement } from "@/shared/lib/resources/maintenance-agreement";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "HVAC Maintenance Agreement Pricing Calculator";
const DESCRIPTION =
  "Price an HVAC maintenance agreement from your cost to serve: visits, materials, office time and member discount. Monthly price, chart and PDF. Free.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("maintenance-agreement"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const EX = MAINTENANCE_AGREEMENT_DEFAULTS;
const R = calculateMaintenanceAgreement(EX)!;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function MaintenanceAgreementCalculatorPage() {
  return (
    <CalculatorFrame
      slug="maintenance-agreement"
      guideTitle="How to price an HVAC maintenance agreement"
      lead={
        <p>
          A maintenance agreement is priced by what it costs you to keep the promise: the visits, what you use on them,
          the office time, and the discount members get on repairs. This calculator adds those up, puts your margin on
          top, and shows the price by visits and margin and for your whole program.
        </p>
      }
      facts={["Built for contractors", "Uses your cost per billed hour", "Share link, save or print"]}
      howToUse={[
        "Enter how many visits the agreement includes and how long one takes, drive included.",
        "Use your cost per billable hour, not the technician's wage. The Labor Cost Workspace works it out, and this calculator can use it with one button.",
        "Add the materials used on every visit and a small yearly amount for booking, reminders and billing.",
        "If members get a repair discount, enter what a typical member spends on repairs in a year and the discount. That discount is a cost of the agreement.",
        "Set the margin you want. Then use the price grid to compare one to four visits, and the program view to see revenue and technician hours for all your members.",
      ]}
      inputs={[
        { name: "Visits per year", text: "Scheduled maintenance visits the agreement includes, for example one cooling visit in spring and one heating visit in fall." },
        { name: "Hours per visit", text: "Time on site plus the drive there. Use your own average from finished maintenance visits." },
        { name: "Cost per billable hour", text: "What one hour of technician time costs you once wage, burden, unbilled hours and overhead are counted: your break-even labor rate. Not the wage, and not the rate you bill." },
        { name: "Materials per visit", text: "Filters, coil cleaner, drain treatment and anything else used every time, at your cost." },
        { name: "Office cost per agreement", text: "The office's time to book visits, send reminders and bill one agreement over a year." },
        { name: "Repairs a member buys, and the discount", text: "If members get a repair discount, the discount is money you give up. A typical member's yearly repair spend times the discount is that cost." },
        { name: "Target net margin", text: "The profit left from the agreement price after its costs, as a share of the price." },
      ]}
      workedExample={{
        setup: `Two visits a year of ${EX.hoursPerVisit} hours each at a ${usd0(EX.costPerBillableHour)} cost per billable hour, ${usd0(EX.materialsPerVisit)} of materials a visit, ${usd0(EX.officeCostPerYear)} of office time a year, and a ${EX.repairDiscountRate * 100}% discount on ${usd0(EX.expectedRepairSpendPerYear)} of yearly repairs, at a ${EX.targetNetMargin * 100}% margin. These are the calculator's example values, not industry averages.`,
        rows: [
          { label: "Cost per visit", working: `${EX.hoursPerVisit} × $${EX.costPerBillableHour} + $${EX.materialsPerVisit}`, value: usd(R.costPerVisit) },
          { label: "Visits per year, at cost", working: `${EX.visitsPerYear} × ${usd(R.costPerVisit)}`, value: usd(R.visitCostPerYear) },
          { label: "Repair discount given", working: `$${EX.expectedRepairSpendPerYear} × ${EX.repairDiscountRate * 100}%`, value: usd(R.repairDiscountGiven) },
          { label: "Cost to serve", working: `${usd(R.visitCostPerYear)} + $${EX.officeCostPerYear} + ${usd(R.repairDiscountGiven)}`, value: usd(R.costToServePerYear) },
          { label: "Yearly price", working: `${usd(R.costToServePerYear)} ÷ (1 − ${EX.targetNetMargin * 100}%)`, value: usd(R.annualPrice), strong: true },
          { label: "Monthly price", working: `${usd(R.annualPrice)} ÷ 12`, value: usd(R.monthlyPrice), strong: true },
        ],
        conclusion: `At ${usd(R.monthlyPrice)} a month the agreement covers both visits, the office time and the member discount, and leaves ${usd(R.profitPerAgreement)} a year per member. Price it lower and the visits are paid for out of other work.`,
      }}
      guide={[
        {
          id: "what-to-include",
          label: "What goes in the agreement",
          title: "What to put in the agreement itself",
          body: (
            <>
              <p>The price only holds if the agreement says exactly what it includes. Before you sell one, write down:</p>
              <BulletList
                items={[
                  "Which equipment is covered, and what is not.",
                  "The visits per year, the season of each, and a numbered checklist for each visit type.",
                  "The member perks: repair discount, scheduling priority, any waived fee. Each one is a cost in this calculator.",
                  "How it is paid, how it renews, and how either side cancels.",
                ]}
              />
              <p>
                The free{" "}
                <Link href={RESOURCES_TEMPLATES_PATH} className={link}>maintenance agreement outline</Link> walks through those sections in Word
                or PDF, with a filled-in HVAC example. Have your own version reviewed by an attorney in your state. To get
                the cost per billable hour this calculator needs, start with the{" "}
                <Link href={LABOR_WORKSPACE_PATH} className={link}>Labor Cost Workspace</Link> or the{" "}
                <Link href={calculatorPath("labor-rate")} className={link}>quick labor rate calculator</Link>.
              </p>
            </>
          ),
        },
      ]}
      formula={[
        "cost per visit        = hours per visit × cost per billable hour + materials per visit",
        "visits per year       = visits × cost per visit",
        "repair discount given = member repair spend × discount %",
        "cost to serve         = visits per year + office cost + repair discount given",
        "annual price          = cost to serve ÷ (1 − target margin %)",
        "monthly price         = annual price ÷ 12",
      ]}
      assumptions={[
        "Every member gets the same number of visits and each visit takes the same time.",
        "The repair discount is counted as a cost. Extra repair work an agreement brings in is not counted as income here.",
        "Members who cancel partway through the year, and card fees on monthly payments, are not modeled.",
        "Margin is measured on the agreement price (a margin), not added to cost (a markup).",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      faq={[
        {
          question: "How do I price an HVAC maintenance agreement?",
          answer: "Add up what one agreement costs you to serve in a year: the visits (hours times your cost per billable hour, plus materials), the office time, and any repair discount members get. Divide by one minus your target margin for the yearly price, and by twelve for the monthly price.",
        },
        {
          question: "Should the member repair discount be part of the price?",
          answer: "Yes. A discount is money you give up on every repair a member buys, so it is a real cost of the agreement. Leave it out and the agreement looks more profitable than it is.",
        },
        {
          question: "Should I use the technician's wage for the visit cost?",
          answer: "No. Use your cost per billable hour, which includes burden, the hours nobody pays for and overhead. A visit hour costs you the same as any other hour the technician could have billed.",
        },
        {
          question: "Monthly or yearly billing?",
          answer: "The price is the same either way: the monthly price is the yearly price divided by twelve. Card fees on monthly payments and members who cancel early are not in the calculation, so allow for them if they apply to you.",
        },
        {
          question: "Does an agreement have to make money on its own?",
          answer: "This calculator assumes it should. Members may buy more repair and replacement work later, but that is a separate and less certain number, so it is not counted as income here.",
        },
      ]}
      featureKeys={["price-book", "estimates"]}
    >
      <MaintenanceAgreementTool />
    </CalculatorFrame>
  );
}
