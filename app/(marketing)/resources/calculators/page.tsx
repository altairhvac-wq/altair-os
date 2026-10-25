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
  "Free labor rate, job profitability and break-even calculators for HVAC and trade business owners. Every formula and assumption is shown. No account required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_CALCULATORS_PATH,
    title: TITLE,
    description: DESCRIPTION,
  }),
};

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
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {calculator.description}
              </p>
            </ResourceCard>
          </li>
        ))}
      </ul>
    </>
  );
}
