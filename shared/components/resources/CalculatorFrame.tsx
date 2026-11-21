import Link from "next/link";
import { AltairFeatureNote } from "@/shared/components/resources/AltairFeatureNote";
import {
  ResourceCard,
  ResourcePageHeader,
  resourceLinkClass,
} from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import {
  CALCULATOR_DISCLAIMER,
  RESOURCES_CALCULATORS_PATH,
  RESOURCES_PATH,
  RESOURCE_CALCULATORS,
  calculatorPath,
  type ResourceCalculatorEntry,
} from "@/shared/lib/resources/catalog";
import type { AltairFeatureKey } from "@/shared/lib/resources/feature-links";
import { buildResourceWebPageStructuredData } from "@/shared/lib/resources/structured-data";
import { CALCULATOR_SOFTWARE, SOFTWARE_PAGES } from "@/shared/lib/site/internal-links";
import { CALCULATOR_NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";
import { HUB_TOOLS } from "@/shared/lib/resources/tool-hub";

/** The two full workspaces, listed with the other calculators. */
const WORKSPACES = HUB_TOOLS.filter((tool) => tool.workspace);

export type CalculatorInputNote = { readonly name: string; readonly text: string };
export type CalculatorFaqItem = { readonly question: string; readonly answer: string };
export type CalculatorWorkedExample = {
  /** One sentence setting up the example shop. */
  readonly setup: string;
  /** Each line of the arithmetic, label and result, computed by the calculator's own function. */
  readonly lines: readonly { readonly label: string; readonly value: string }[];
  /** What the result means, in a sentence or two. */
  readonly conclusion: string;
};

/**
 * The shared calculator page pattern: header, the interactive calculator
 * (a client component passed as children), then "how to use this", the
 * formula, the assumptions, the disclaimer, the Altair note and the other
 * calculators. Optionally a worked example, a plain explanation of each
 * input and a short FAQ (with FAQPage JSON-LD built from the same list).
 * Every calculator links to the software pages its numbers feed
 * (shared/lib/site/internal-links.ts). Server-rendered so every explanation is in the HTML a
 * crawler and a no-JS reader receive; only the inputs need the client.
 */
export function CalculatorFrame({
  slug,
  intro,
  howToUse,
  formula,
  assumptions,
  featureKeys,
  inputs,
  workedExample,
  faq,
  children,
}: {
  readonly slug: ResourceCalculatorEntry["slug"];
  readonly intro: string;
  readonly howToUse: readonly string[];
  readonly formula: readonly string[];
  readonly assumptions: readonly string[];
  readonly featureKeys: readonly AltairFeatureKey[];
  readonly inputs?: readonly CalculatorInputNote[];
  readonly workedExample?: CalculatorWorkedExample;
  readonly faq?: readonly CalculatorFaqItem[];
  readonly children: React.ReactNode;
}) {
  const entry = RESOURCE_CALCULATORS.find((calculator) => calculator.slug === slug);
  if (!entry) return null;
  const others = RESOURCE_CALCULATORS.filter((calculator) => calculator.slug !== slug);
  const software = CALCULATOR_SOFTWARE[slug].map((path) => SOFTWARE_PAGES[path]);

  return (
    <>
      <JsonLdScript
        data={buildResourceWebPageStructuredData({
          name: entry.title,
          description: entry.description,
          path: calculatorPath(slug),
        })}
      />
      {faq && faq.length > 0 ? <JsonLdScript data={buildFaqPageStructuredData(faq)} /> : null}
      <ResourcePageHeader
        eyebrow="Free calculator"
        title={entry.title}
        intro={<p>{intro}</p>}
        crumbs={[
          { label: "Calculators", href: RESOURCES_CALCULATORS_PATH },
          { label: entry.title },
        ]}
      />

      <div className="mt-10">{children}</div>

      {/* Right after the result: the calculator used to end in lists, so the
          next tool, its guide and its software page now sit where the
          visitor finishes. Chosen per calculator in shared/lib/site/next-steps.ts. */}
      <NextStep
        className="mt-8"
        placement={`calc-${slug}`}
        steps={CALCULATOR_NEXT_STEPS[slug]}
        heading="Got your number? Here is where it goes next."
      />

      {inputs && inputs.length > 0 ? (
        <ResourceCard className="mt-10">
          <h2 className="text-base font-semibold text-[#0A0A0A]">What each input means</h2>
          <dl className="mt-3 space-y-3 text-sm leading-relaxed text-stone-700">
            {inputs.map((input) => (
              <div key={input.name}>
                <dt className="font-semibold text-stone-900">{input.name}</dt>
                <dd className="mt-0.5">{input.text}</dd>
              </div>
            ))}
          </dl>
        </ResourceCard>
      ) : null}

      {workedExample ? (
        <ResourceCard className="mt-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">A worked example</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-700">{workedExample.setup}</p>
          <dl className="mt-4 divide-y divide-stone-200 rounded-lg border border-stone-200 bg-stone-50 text-sm">
            {workedExample.lines.map((line) => (
              <div
                key={line.label}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5"
              >
                <dt className="min-w-0 text-stone-700">{line.label}</dt>
                <dd className="font-mono font-semibold tabular-nums text-stone-900">{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-stone-700">{workedExample.conclusion}</p>
        </ResourceCard>
      ) : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <ResourceCard>
          <h2 className="text-base font-semibold text-[#0A0A0A]">How to use this</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
            {howToUse.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </ResourceCard>

        <ResourceCard>
          <h2 className="text-base font-semibold text-[#0A0A0A]">Assumptions</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-700">
            {assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </ResourceCard>
      </div>

      <ResourceCard className="mt-5">
        <h2 className="text-base font-semibold text-[#0A0A0A]">The formula</h2>
        <div className="mt-3 overflow-x-auto rounded-lg bg-stone-50 px-4 py-3">
          <pre className="whitespace-pre-wrap font-mono text-[13px] leading-6 text-stone-800">
            {formula.join("\n")}
          </pre>
        </div>
      </ResourceCard>

      <p
        role="note"
        className="mt-5 rounded-xl border border-stone-300/70 bg-stone-100/70 px-5 py-4 text-sm leading-relaxed text-stone-700"
      >
        <strong className="font-semibold text-stone-900">Disclaimer. </strong>
        {CALCULATOR_DISCLAIMER}
      </p>

      {faq && faq.length > 0 ? (
        <section aria-labelledby="calculator-faq-heading" className="mt-10">
          <h2 id="calculator-faq-heading" className="text-lg font-semibold text-[#0A0A0A]">
            Common questions
          </h2>
          <div className="mt-4 space-y-3">
            {faq.map((item) => (
              <ResourceCard key={item.question}>
                <h3 className="text-sm font-semibold text-[#0A0A0A]">{item.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">{item.answer}</p>
              </ResourceCard>
            ))}
          </div>
        </section>
      ) : null}

      {featureKeys.map((key) => (
        <AltairFeatureNote key={key} featureKey={key} />
      ))}

      <nav aria-label="Software for this work" className="mt-8">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">Where these numbers get used</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {software.map((page) => (
            <li key={page.href}>
              <Link href={page.href} className={resourceLinkClass}>
                {page.label}
              </Link>
              <span className="text-stone-600"> — {page.text}</span>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Other calculators" className="mt-10 border-t border-stone-200 pt-6">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">Other calculators</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {others.map((calculator) => (
            <li key={calculator.slug}>
              <Link href={calculatorPath(calculator.slug)} className={resourceLinkClass}>
                {calculator.title}
              </Link>
              <span className="text-stone-600"> — {calculator.description}</span>
            </li>
          ))}
          {WORKSPACES.map((tool) => (
            <li key={tool.id}>
              <Link href={tool.href} className={resourceLinkClass}>
                {tool.title}
              </Link>
              <span className="text-stone-600"> — {tool.youGet}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href={RESOURCES_PATH} className={resourceLinkClass}>
            Every free tool, grouped by job →
          </Link>
        </p>
      </nav>
    </>
  );
}
