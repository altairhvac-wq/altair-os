import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { TechnicianPayTool } from "@/shared/components/resources/calc/TechnicianPayTool";
import { DataTable } from "@/shared/components/resources/tools/ToolGuide";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { TECHNICIAN_PAY_DEFAULTS, calculateTechnicianPay } from "@/shared/lib/resources/technician-pay";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "HVAC Tech Pay Calculator: Hourly, Flat Rate, Commission";
const DESCRIPTION =
  "Compare one week of HVAC technician pay: hourly with overtime, flat rate and commission. Chart, what-if table, share link and PDF. Free, no sign-up.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("technician-pay"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** The calculator's own defaults through its own function: the page cannot disagree with the tool. */
const EX = TECHNICIAN_PAY_DEFAULTS;
const R = calculateTechnicianPay(EX)!;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function TechnicianPayCalculatorPage() {
  return (
    <CalculatorFrame
      slug="technician-pay"
      guideTitle="How to compare technician pay plans"
      lead={
        <p>
          The same week of work pays differently on hourly, flat rate and commission. Enter one real week and see all
          three side by side, where each plan starts paying more, and what each one costs the shop per hour and as a
          share of revenue. Useful whether you write the paychecks or cash them.
        </p>
      }
      facts={["No sign-up", "Chart and what-if table", "Share link, save or print"]}
      howToUse={[
        "Pick one real week. A slow week and a busy week give very different answers, so run both (the Load sample menu has one of each).",
        "Enter the hours on the clock for that week, including drive and shop time, and the revenue the technician's finished jobs billed.",
        "Enter the hourly wage, the book hours turned and what a book hour pays, and the commission rate.",
        "Read the three totals and the pay per hour on the clock. The tiles show the book hours and the revenue at which flat rate and commission catch up with hourly.",
        "Use the chart and the what-if table to see how each plan behaves in a slower or busier week before you change a pay plan.",
      ]}
      inputs={[
        { name: "Hours on the clock", text: "Every paid hour in the week: jobs, driving, the shop, meetings. Hours past 40 are paid at time and a half on the hourly plan." },
        { name: "Revenue produced", text: "What the technician's completed jobs billed that week, before sales tax. Commission is figured on this number." },
        { name: "Hourly wage", text: "The base hourly pay on the hourly plan. If you have built your rate in the Labor Cost Workspace, its average wage can fill this in." },
        { name: "Book hours turned", text: "The flat-rate hours for the jobs completed, from your price book, however long the jobs actually took." },
        { name: "Pay per book hour", text: "What the flat-rate plan pays the technician for each book hour." },
        { name: "Commission", text: "The share of revenue produced that the commission plan pays." },
      ]}
      workedExample={{
        setup: `One technician's week: ${EX.hoursOnClock} hours on the clock, ${EX.bookHours} book hours turned, ${usd0(EX.revenueProduced)} of revenue produced. The plans pay ${usd0(EX.hourlyWage)} an hour, ${usd0(EX.payPerBookHour)} a book hour, or ${EX.commissionRate * 100}% commission. These are the calculator's example values, not typical pay.`,
        rows: [
          { label: "Hourly", working: `$30 × 40 + $30 × 1.5 × ${R.overtimeHours}`, value: usd(R.hourlyPay), strong: true },
          { label: "Flat rate", working: `${EX.bookHours} × $${EX.payPerBookHour}`, value: usd(R.flatRatePay) },
          { label: "Commission", working: `${usd0(EX.revenueProduced)} × ${EX.commissionRate * 100}%`, value: usd(R.commissionPay) },
          { label: "Book hours for flat rate to match", working: `${usd(R.hourlyPay)} ÷ $${EX.payPerBookHour}`, value: (R.bookHoursToMatchHourly ?? 0).toFixed(1) },
          { label: "Revenue for commission to match", working: `${usd(R.hourlyPay)} ÷ ${EX.commissionRate * 100}%`, value: usd(R.revenueToMatchHourly ?? 0) },
        ],
        conclusion: `This week pays most on hourly, ${usd(R.hourlyPay)}, because of the ${R.overtimeHours} overtime hours. Flat rate would catch up at ${(R.bookHoursToMatchHourly ?? 0).toFixed(1)} book hours, about ${Math.ceil((R.bookHoursToMatchHourly ?? 0) - EX.bookHours)} more than this week, and commission only at ${usd0(R.revenueToMatchHourly ?? 0)} of revenue.`,
      }}
      guide={[
        {
          id: "plans",
          label: "The three plans compared",
          title: "Hourly, flat rate and commission, compared",
          body: (
            <>
              <p>Each plan answers the same question differently: who carries the risk of a slow week, and who keeps the reward of a fast one.</p>
              <DataTable
                head={["Plan", "How pay is figured", "A slow week", "Watch for"]}
                rows={[
                  ["Hourly", "Wage × hours on the clock, time and a half past 40", "The shop carries it: the hours are paid either way.", "Unbilled hours and overtime that no invoice covers."],
                  ["Flat rate", "Book hours turned × pay per book hour", "The technician carries it: fewer book hours, less pay.", "Book hours that do not match real job times, and wage and overtime rules."],
                  ["Commission", "Revenue produced × commission %", "The technician carries it, and parts prices move the pay.", "Pay that follows ticket size rather than the work, and wage and overtime rules."],
                ]}
              />
              <p>
                Whatever plan you choose, the pay has to fit inside the labor rate you bill. The{" "}
                <Link href={LABOR_WORKSPACE_PATH} className={link}>Labor Cost Workspace</Link> shows what a technician costs per billed hour once
                burden, unbilled time and overhead are added, and the{" "}
                <Link href={calculatorPath("callback-cost")} className={link}>callback cost calculator</Link> shows what return trips take out of the week.
              </p>
            </>
          ),
        },
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
        "The slow-to-busy chart and table hold the hours on the clock steady and grow revenue at this week's revenue per book hour.",
        "Bonuses, spiffs, benefits, on-call pay and tool allowances are left out. Payroll taxes come on top of every plan.",
        "Default values are placeholders to show how it works, not typical pay.",
      ]}
      faq={[
        {
          question: "Is flat rate or hourly pay better for an HVAC technician?",
          answer: `Neither is better every week. Flat rate pays more once book hours times the book rate passes the hourly pay. In the worked example that happens at ${(R.bookHoursToMatchHourly ?? 0).toFixed(1)} book hours in a ${EX.hoursOnClock}-hour week. A technician who turns more book hours than clock hours does better on flat rate; in a slow week hourly pays more.`,
        },
        {
          question: "What is a book hour?",
          answer: "The standard time your flat-rate price book gives a task, such as 0.75 hours to replace a run capacitor. The technician is paid the book hours for the job whether it took longer or shorter.",
        },
        {
          question: "Do flat-rate and commission technicians get overtime?",
          answer: "In the United States most employees are owed overtime however they are paid, and how it is worked out on flat-rate or commission pay depends on federal and state rules. This calculator does not work it out. Ask your payroll provider or your state labor office before changing a pay plan.",
        },
        {
          question: "How do I compare pay plans fairly?",
          answer: "Use the same real week for all three, then repeat with a slow week and a busy week. Compare the pay per hour on the clock, not just the total, and check what each plan costs as a share of the revenue the technician produced.",
        },
        {
          question: "What share of revenue should technician pay be?",
          answer: "There is no single right share. It depends on your prices, how much of each ticket is parts, and your overhead. The calculator shows the share for each plan so you can check it against the labor cost your rate assumes.",
        },
      ]}
      featureKeys={["time-clock", "reports"]}
    >
      <TechnicianPayTool />
    </CalculatorFrame>
  );
}
