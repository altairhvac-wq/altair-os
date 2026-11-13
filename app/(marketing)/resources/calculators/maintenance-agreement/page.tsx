import type { Metadata } from "next";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { MaintenanceAgreementCalculator } from "@/shared/components/resources/MaintenanceAgreementCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Maintenance agreement pricing calculator";
const DESCRIPTION =
  "Free HVAC maintenance agreement pricing calculator: what to charge per month and per year from your visit cost, materials, office time and member discount. Formula shown, no account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("maintenance-agreement"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

export default function MaintenanceAgreementCalculatorPage() {
  return (
    <CalculatorFrame
      slug="maintenance-agreement"
      intro="A maintenance agreement is priced by what it costs you to keep the promise: the visits, what you use on them, the office time, and the discount members get on repairs. This calculator adds those up and puts your margin on top."
      howToUse={[
        "Enter how many visits the agreement includes and how long one takes, drive included.",
        "Use your cost per billable hour, not the technician's wage. The labor rate calculator works it out.",
        "Add the materials used on every visit and a small yearly amount for booking, reminders and billing.",
        "If members get a repair discount, enter what a typical member spends on repairs in a year and the discount. That discount is a cost of the agreement.",
        "Set the margin you want. The result is the yearly price and the same price as a monthly payment.",
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
        "Members who cancel partway through the year are not modeled.",
        "Margin is measured on the agreement price (a margin), not added to cost (a markup).",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      featureKeys={["price-book", "estimates"]}
    >
      <MaintenanceAgreementCalculator />
    </CalculatorFrame>
  );
}
