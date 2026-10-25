import Link from "next/link";
import { AltairFeatureNote } from "@/shared/components/resources/AltairFeatureNote";
import {
  ResourceCard,
  ResourcePageHeader,
  resourceLinkClass,
} from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
  CALCULATOR_DISCLAIMER,
  RESOURCES_CALCULATORS_PATH,
  RESOURCE_CALCULATORS,
  calculatorPath,
  type ResourceCalculatorEntry,
} from "@/shared/lib/resources/catalog";
import type { AltairFeatureKey } from "@/shared/lib/resources/feature-links";
import { buildResourceWebPageStructuredData } from "@/shared/lib/resources/structured-data";

/**
 * The shared calculator page pattern: header, the interactive calculator
 * (a client component passed as children), then "how to use this", the
 * formula, the assumptions, the disclaimer, the Altair note and the other
 * calculators. Server-rendered so every explanation is in the HTML a
 * crawler and a no-JS reader receive; only the inputs need the client.
 */
export function CalculatorFrame({
  slug,
  intro,
  howToUse,
  formula,
  assumptions,
  featureKeys,
  children,
}: {
  readonly slug: ResourceCalculatorEntry["slug"];
  readonly intro: string;
  readonly howToUse: readonly string[];
  readonly formula: readonly string[];
  readonly assumptions: readonly string[];
  readonly featureKeys: readonly AltairFeatureKey[];
  readonly children: React.ReactNode;
}) {
  const entry = RESOURCE_CALCULATORS.find((calculator) => calculator.slug === slug);
  if (!entry) return null;
  const others = RESOURCE_CALCULATORS.filter((calculator) => calculator.slug !== slug);

  return (
    <>
      <JsonLdScript
        data={buildResourceWebPageStructuredData({
          name: entry.title,
          description: entry.description,
          path: calculatorPath(slug),
        })}
      />
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

      {featureKeys.map((key) => (
        <AltairFeatureNote key={key} featureKey={key} />
      ))}

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
        </ul>
      </nav>
    </>
  );
}
