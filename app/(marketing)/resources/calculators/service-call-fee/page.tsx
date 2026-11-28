import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorFrame } from "@/shared/components/resources/CalculatorFrame";
import { ServiceCallFeeCalculator } from "@/shared/components/resources/calc/ServiceCallFeeCalculator";
import { BulletList } from "@/shared/components/resources/tools/ToolGuide";
import { calculatorPath } from "@/shared/lib/resources/catalog";
import { SERVICE_CALL_FEE_DEFAULTS, calculateServiceCallFee } from "@/shared/lib/resources/service-call-fee";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "HVAC Service Call Fee Calculator: What to Charge";
const DESCRIPTION =
  "Work out an HVAC service call fee from your own labor rate, see whether today's fee covers the visit, and what a low or free call costs a year. No sign-up.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({ path: calculatorPath("service-call-fee"), title: TITLE, description: DESCRIPTION }),
};

const usd = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const usd0 = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** The calculator's own defaults through its own function: the page cannot disagree with the tool. */
const EX = SERVICE_CALL_FEE_DEFAULTS;
const R = calculateServiceCallFee(EX)!;
const link = "font-medium text-[#77591B] underline-offset-4 hover:underline";

export default function ServiceCallFeeCalculatorPage() {
  return (
    <CalculatorFrame
      slug="service-call-fee"
      guideTitle="How to set an HVAC service call fee"
      lead={
        <p>
          A service call fee pays for getting a technician to the door and finding the problem. That visit costs you
          the same whether or not a repair follows. This calculator works the fee out from your own labor rate, shows
          whether the fee you charge today covers the visit, and adds up what a low or free service call costs over a
          year of visits that end with no repair.
        </p>
      }
      facts={["No sign-up", "Compares free, $49, $79 and your fee", "Share link, save or print"]}
      howToUse={[
        "Enter the fee you charge or advertise today. Use 0 for a free service call.",
        "Enter the hours the fee has to cover: the drive to the job plus the time to find the problem.",
        "Enter your billable rate and your cost per billable hour. If you have used the Labor Cost Workspace, one button fills both in.",
        "Enter last month's service calls and the share that ended with no repair, so the gap on one visit becomes a month and a year.",
        "Read the result, then the table to see what each fee would do to the same month.",
      ]}
      inputs={[
        { name: "Your fee today", text: "The price the customer hears when they book: a trip charge, a diagnostic fee, or 0 if you advertise a free service call." },
        { name: "Hours the fee covers", text: "The time the fee has to pay for: the drive to the job and the time on site until you can tell the customer what is wrong." },
        { name: "Your billable rate", text: "What one billed hour is quoted at. The recommended rate from the labor rate calculator." },
        { name: "Cost per billable hour", text: "What one billed hour costs you once the wage, payroll costs, unbilled time and overhead are counted: your break-even labor rate." },
        { name: "Service calls a month", text: "Diagnostic visits in a month. Leave out installs and maintenance visits." },
        { name: "Calls that end with no repair", text: "The share of service calls where the customer pays the fee, or nothing, and no repair is sold." },
      ]}
      workedExample={{
        setup: `A shop with a ${usd0(EX.billableRate)} billable rate and ${usd(EX.costPerBillableHour)} of cost per billable hour advertises a ${usd0(EX.currentFee)} service call that covers ${EX.hoursCovered} hour. It runs ${EX.callsPerMonth} service calls a month and ${EX.noRepairPercent}% end with no repair. These are the calculator's example values, not industry averages.`,
        rows: [
          { label: "Fee at your rate", working: `${EX.hoursCovered} × $${EX.billableRate}`, value: usd(R.feeAtRate), strong: true },
          { label: "Cost floor", working: `${EX.hoursCovered} × $${EX.costPerBillableHour}`, value: usd(R.costFloor), strong: true },
          { label: "Short of cost per visit", working: `${usd(R.costFloor)} − ${usd(EX.currentFee)}`, value: usd(R.shortOfCostPerVisit) },
          { label: "Visits with no repair", working: `${EX.callsPerMonth} × ${EX.noRepairPercent}%`, value: String(R.noRepairVisitsPerMonth) },
          { label: "Lost per month", working: `${R.noRepairVisitsPerMonth} × ${usd(R.shortOfCostPerVisit)}`, value: usd(R.lostPerMonth), strong: true },
          { label: "Lost per year", working: `${usd(R.lostPerMonth)} × 12`, value: usd(R.lostPerYear), strong: true },
        ],
        conclusion: `The ${usd0(EX.currentFee)} fee is ${usd(R.shortOfCostPerVisit)} under what the visit costs. On the ${R.noRepairVisitsPerMonth} visits a month with no repair that is ${usd0(R.lostPerYear)} a year, which the repairs this shop does sell have to earn back first.`,
      }}
      guide={[
        {
          id: "what-it-covers",
          label: "What the fee covers",
          title: "Decide what the fee covers, and say it",
          body: (
            <>
              <p>
                Write down what the customer gets for the fee. A common way to set it up is the trip and the diagnosis.
                Whatever you choose, say it on the phone, on the confirmation and on the invoice, so nobody is surprised
                at the door.
              </p>
              <p>
                One thing to watch: your labor rate already spreads drive time across every billed hour. If you also
                add a separate trip charge on top of an hourly fee, you count the drive twice. Either leave drive time
                in the rate, or take it out and charge for it separately. Not both. The{" "}
                <Link href="/insights/how-to-price-an-hvac-service-call" className={link}>
                  guide to pricing a service call
                </Link>{" "}
                walks through this with the same example.
              </p>
            </>
          ),
        },
        {
          id: "free-or-cheap",
          label: "A free or cheap call",
          title: "What a free or cheap service call really costs",
          body: (
            <>
              <p>
                Some shops advertise a low or free service call and plan to make it back on the repair. It can work,
                but put a number on it first. A fee under your cost floor loses the difference every time the customer
                says no. Three ways shops handle that:
              </p>
              <BulletList
                items={[
                  "Charge the fee and credit it toward the repair when the customer goes ahead. The visit is paid for either way.",
                  "Keep the low fee in the ad and price the repair to carry the gap. Then check finished jobs to see that it does.",
                  "Waive the fee only for maintenance agreement members, so the price of the agreement pays for it.",
                ]}
              />
              <p>
                The{" "}
                <Link href={calculatorPath("job-profitability")} className={link}>
                  job profitability calculator
                </Link>{" "}
                shows whether a repair really made up a low fee, and the{" "}
                <Link href={calculatorPath("maintenance-agreement")} className={link}>
                  maintenance agreement calculator
                </Link>{" "}
                prices an agreement from what its visits and member discount cost you.
              </p>
            </>
          ),
        },
      ]}
      formula={[
        "fee at your rate        = hours the fee covers × billable rate",
        "cost floor              = hours the fee covers × cost per billable hour",
        "short of cost per visit = cost floor − fee          (0 when the fee covers cost)",
        "visits with no repair   = service calls × share with no repair",
        "lost per month          = visits with no repair × short of cost per visit",
        "lost per year           = lost per month × 12",
      ]}
      assumptions={[
        "Every service call takes about the same time. Use an average that includes the drive.",
        "Only visits that end with no repair are counted as a loss. A call that becomes a repair can make up a low fee in the repair's price; this calculator does not check that.",
        "A customer who pays no fee and no repair costs the whole visit. A fee that is credited toward a repair is still collected, so enter it as the fee.",
        "A year is twelve months like the one you entered.",
        "Default values are placeholders to show how it works, not industry benchmarks.",
      ]}
      faq={[
        {
          question: "What is an HVAC service call fee?",
          answer: "A fee for getting a technician to the door and finding the problem, also called a trip charge or a diagnostic fee. It is charged whether or not the customer goes ahead with a repair, because the visit costs you the same either way.",
        },
        {
          question: "How do I work out my service call fee?",
          answer: "Multiply the hours the fee has to cover, the drive and the diagnosis, by your billable labor rate. Then check it against the same hours multiplied by your cost per billable hour: below that, every visit that ends with no repair loses money.",
        },
        {
          question: "Should I offer a free service call?",
          answer: "Only with the number in front of you. A free call costs your full cost for the visit every time the customer says no. If you offer it, price the repair to carry the gap, or keep it for maintenance agreement members so the agreement pays for it.",
        },
        {
          question: "Should I charge for drive time on top of the fee?",
          answer: "Not if your labor rate already counts drive time as unbilled hours, which the labor rate calculator does. That would charge for the drive twice. Either keep drive time in the rate or charge for it separately, not both.",
        },
        {
          question: "What is a typical HVAC service call fee?",
          answer: "We have not found a reliable published figure, so this page does not quote one. Your own labor rate and the hours the visit takes give you a fee that fits your shop, which a number copied from a competitor cannot.",
        },
      ]}
      featureKeys={["price-book", "estimates"]}
    >
      <ServiceCallFeeCalculator />
    </CalculatorFrame>
  );
}
