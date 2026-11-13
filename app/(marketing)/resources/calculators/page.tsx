import type { Metadata } from "next";
import Link from "next/link";
import {
  ResourceCard,
  ResourcePageHeader,
  resourceLinkClass,
} from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
  RESOURCES_CALCULATORS_PATH,
  RESOURCE_CALCULATORS,
  calculatorPath,
} from "@/shared/lib/resources/catalog";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

const TITLE = "Business calculators for contractors";
const DESCRIPTION =
  "Six free calculators for HVAC and trade business owners: labor rate, job profit, break-even, maintenance agreement pricing, technician pay and callback cost. Every formula is shown. No account required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_CALCULATORS_PATH,
    title: TITLE,
    description: DESCRIPTION,
  }),
};

/** The question each calculator answers, in the owner's words. */
const ANSWERS: Record<(typeof RESOURCE_CALCULATORS)[number]["slug"], string> = {
  "labor-rate": "What do I have to charge per billable hour so a technician's time actually pays for itself?",
  "job-profitability": "Did that job make money once labor, materials and overhead are counted?",
  "break-even": "How many jobs a month does it take before the business stops losing money?",
  "maintenance-agreement": "What should a maintenance agreement cost so the visits and the member discount are paid for?",
  "technician-pay": "Would this week have paid more on hourly, flat rate or commission?",
  "callback-cost": "What are free return trips really costing me every month?",
};

/** A sensible order to run them in. */
const STEPS: readonly { title: string; text: string }[] = [
  {
    title: "Set your rate first",
    text: "Start with the labor rate calculator. Wage is only part of what a billed hour has to cover: burden, the paid hours nobody can bill, and a share of the office all ride on the hours you do bill.",
  },
  {
    title: "Then check real jobs against it",
    text: "Run a few finished jobs through the job profitability calculator. A job can look busy and still lose money once loaded labor and an overhead share are counted.",
  },
  {
    title: "Then see what the month needs",
    text: "The break-even calculator turns your fixed monthly costs and average job into the number of jobs it takes to cover them. Everything past that line is profit.",
  },
  {
    title: "Price the agreement from your cost",
    text: "The maintenance agreement calculator uses the cost per billable hour from step one. Visits, materials, office time and the member discount go in; a monthly price comes out.",
  },
  {
    title: "Compare pay plans on a real week",
    text: "The technician pay calculator runs one week three ways. Owners use it before changing a pay plan; technicians use it to check an offer.",
  },
  {
    title: "Put a number on callbacks",
    text: "The callback cost calculator turns last month's free return trips into dollars and lost hours, so you know what fixing the cause is worth.",
  },
];

export default function ResourceCalculatorsIndexPage() {
  return (
    <>
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: TITLE,
          description: DESCRIPTION,
          path: RESOURCES_CALCULATORS_PATH,
          parts: RESOURCE_CALCULATORS.map((calculator) => ({
            name: calculator.title,
            path: calculatorPath(calculator.slug),
          })),
        })}
      />
      <ResourcePageHeader
        eyebrow="Calculators"
        title={TITLE}
        intro={<p>{DESCRIPTION}</p>}
        crumbs={[{ label: "Calculators" }]}
      />
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {RESOURCE_CALCULATORS.map((calculator) => (
          <li key={calculator.slug}>
            <ResourceCard className="h-full">
              <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                <Link href={calculatorPath(calculator.slug)} className={resourceLinkClass}>
                  {calculator.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-stone-800">
                {ANSWERS[calculator.slug]}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {calculator.description}
              </p>
              <Link
                href={calculatorPath(calculator.slug)}
                className={`mt-4 inline-block text-sm font-semibold text-[#77591B] ${resourceLinkClass}`}
                aria-hidden="true"
                tabIndex={-1}
              >
                Open the calculator →
              </Link>
            </ResourceCard>
          </li>
        ))}
      </ul>

      <section aria-labelledby="calculators-order-heading" className="mt-14">
        <h2 id="calculators-order-heading" className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
          How to use them together
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <ResourceCard className="h-full">
                <p className="font-mono text-xs font-semibold text-[#77591B]">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 text-base font-semibold text-[#0A0A0A]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{step.text}</p>
              </ResourceCard>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-stone-600">
          Every calculator shows its formula and assumptions, remembers your numbers in this browser, can copy a
          link to your result, and can email the result to you. Need the paperwork side?{" "}
          <Link href="/resources/templates" className={resourceLinkClass}>
            Free templates
          </Link>{" "}
          cover estimates, maintenance agreements and pricing.
        </p>
      </section>
    </>
  );
}
