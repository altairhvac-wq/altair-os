import type { Metadata } from "next";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { TechnicianPayCalculator } from "@/shared/components/resources/TechnicianPayCalculator";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Technician pay calculator: hourly, flat rate or commission";
const DESCRIPTION =
  "Free HVAC technician pay calculator: compare one week on hourly with overtime, flat rate by book hours, and commission on revenue. Formula shown, no account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: calculatorPath("technician-pay"),
    title: TITLE,
    description: DESCRIPTION,
  }),
};

export default function TechnicianPayCalculatorPage() {
  return (
    <CalculatorFrame
      slug="technician-pay"
      intro="The same week of work pays differently on hourly, flat rate and commission. Enter one real week and see all three side by side, with what each one works out to per hour on the clock. Useful whether you write the paychecks or cash them."
      howToUse={[
        "Pick one real week. A slow week and a busy week give very different answers, so try both.",
        "Enter the hours on the clock for that week, including drive and shop time.",
        "Enter the book hours for the jobs completed and what a book hour pays.",
        "Enter the revenue those jobs billed and the commission rate.",
        "Compare the three totals and the pay per hour on the clock. The last two lines show what flat rate or commission would need to match the hourly pay.",
      ]}
      formula={[
        "hourly pay      = wage × hours up to 40 + wage × 1.5 × hours past 40",
        "flat rate pay   = book hours × pay per book hour",
        "commission pay  = revenue produced × commission %",
        "pay per hour    = each plan's pay ÷ hours on the clock",
        "book hours to match hourly = hourly pay ÷ pay per book hour",
        "revenue to match hourly    = hourly pay ÷ commission %",
      ]}
      assumptions={[
        "One week, one technician. Overtime on the hourly plan is time and a half past 40 hours in the week.",
        "Flat rate and commission are shown as the plan's own formula only. In the United States an employee is generally still owed at least minimum wage, and overtime on top unless an exemption applies. That is not calculated here. The rules vary by state: check with your payroll provider or your state labor office.",
        "Bonuses, spiffs, benefits, on-call pay and tool allowances are left out.",
        "Revenue is what the technician's completed jobs billed, before sales tax.",
        "Default values are placeholders to show how it works, not typical pay.",
      ]}
      featureKeys={["time-clock", "reports"]}
    >
      <TechnicianPayCalculator />
    </CalculatorFrame>
  );
}
