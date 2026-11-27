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
import { LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";

const TITLE = "HVAC Business Calculators";
const H1 = "Business calculators for HVAC contractors";
const DESCRIPTION =
  "Free HVAC business calculators: labor rate, job profit, break-even, maintenance agreement pricing, technician pay and callback cost. Formulas shown.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_CALCULATORS_PATH,
    title: TITLE,
    description: DESCRIPTION,
  }),
};

/** A sensible order to run them in. */
const STEPS: readonly { title: string; text: string }[] = [
  {
    title: "Set your rate first",
    text: "Start with the Labor Cost Workspace, or the quick labor rate calculator for one technician. Wage is only part of what a billed hour has to cover: burden, the paid hours nobody can bill, and a share of the office all ride on the hours you do bill.",
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
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-8 sm:pt-28">
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: H1,
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
        title={H1}
        intro={<p>{DESCRIPTION}</p>}
        crumbs={[{ label: "Calculators" }]}
      />
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#C2A05A]/50 bg-amber-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]">Start here</p>
          <p className="mt-1 text-base font-semibold text-[#0A0A0A]">Work out your labor rate first. The other calculators use it.</p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
            Have last year&apos;s Profit and Loss report and a recent pay stub open. Every field has a &ldquo;Where do I find this?&rdquo; link that says
            which report or bill the number comes from, and every result says in plain words what it means for your shop.
          </p>
        </div>
        {/* The same first step as the free tools page: the full labor rate tool, with the short one beside it. */}
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <Link
            href={LABOR_WORKSPACE_PATH}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#0A0A0A] px-5 text-sm font-semibold text-[#fff9ea] hover:bg-stone-800"
          >
            Start with the labor rate →
          </Link>
          <Link
            href={calculatorPath("labor-rate")}
            className="inline-flex min-h-11 items-center justify-center text-[13px] font-semibold text-[#77591B] underline decoration-[#C2A05A]/60 underline-offset-4 sm:min-h-0"
          >
            Short on time? One tech, two minutes
          </Link>
        </div>
      </div>

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {RESOURCE_CALCULATORS.map((calculator) => (
          <li key={calculator.slug}>
            <ResourceCard className="h-full">
              <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
                <Link href={calculatorPath(calculator.slug)} className={resourceLinkClass}>
                  {calculator.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-stone-800">
                {calculator.question}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {calculator.description}
              </p>
              <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-[13px] leading-relaxed text-stone-600">
                <span className="font-semibold text-stone-800">You&apos;ll need: </span>
                {calculator.needs}
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
          Every calculator shows its formula worked with your own numbers, has a chart and a what-if table, can
          save your numbers in this browser, copy a share link or print a one-page PDF. Your labor rate from the{" "}
          <Link href={LABOR_WORKSPACE_PATH} className={resourceLinkClass}>
            Labor Cost Workspace
          </Link>{" "}
          carries into the others with one button. Your numbers stay in your browser unless you email a result to yourself. Need the paperwork side?{" "}
          <Link href="/resources/templates" className={resourceLinkClass}>
            Free templates
          </Link>{" "}
          cover estimates, maintenance agreements and pricing, as PDF, Excel and Word.
        </p>
      </section>
    </div>
  );
}
