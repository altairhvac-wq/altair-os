import { AltairFeatureNote } from "@/shared/components/resources/AltairFeatureNote";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { NextStep } from "@/shared/components/site/NextStep";
import {
  BulletList,
  Callout,
  FaqList,
  GuideLayout,
  GuideSection,
  MathTable,
  ProductBand,
  RelatedGrid,
  ToolHero,
  ToolStage,
  type GuideNavItem,
} from "@/shared/components/resources/tools/ToolGuide";
import {
  CALCULATOR_DISCLAIMER,
  RESOURCES_CALCULATORS_PATH,
  RESOURCES_PATH,
  RESOURCES_TEMPLATES_PATH,
  RESOURCE_CALCULATORS,
  calculatorPath,
  type ResourceCalculatorEntry,
} from "@/shared/lib/resources/catalog";
import type { AltairFeatureKey } from "@/shared/lib/resources/feature-links";
import { buildResourceWebPageStructuredData } from "@/shared/lib/resources/structured-data";
import { HUB_TOOLS } from "@/shared/lib/resources/tool-hub";
import { CALCULATOR_SOFTWARE, SOFTWARE_PAGES } from "@/shared/lib/site/internal-links";
import { CALCULATOR_NEXT_STEPS } from "@/shared/lib/site/next-steps";
import { PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { buildFaqPageStructuredData } from "@/shared/lib/site/structured-data";

/** The two full workspaces, listed with the other calculators. */
const WORKSPACES = HUB_TOOLS.filter((tool) => tool.workspace);

export type CalculatorInputNote = { readonly name: string; readonly text: string };
export type CalculatorFaqItem = { readonly question: string; readonly answer: string };
export type CalculatorWorkedExample = {
  /** One sentence setting up the example shop. */
  readonly setup: string;
  /** Each line of the arithmetic, computed by the calculator's own function. */
  readonly rows: readonly { readonly label: string; readonly working?: string; readonly value: string; readonly strong?: boolean }[];
  /** What the result means, in a sentence or two. */
  readonly conclusion: string;
};
export type CalculatorGuideSection = { readonly id: string; readonly label: string; readonly title: string; readonly body: React.ReactNode };

/** When the calculator pages were last reviewed against their math and copy. */
export const CALCULATORS_UPDATED = { iso: "2026-11-21", label: "November 21, 2026" } as const;

/**
 * The calculator page, built like the Labor Cost Workspace page: a hero with
 * what you get, the tool (a client component passed as children), the next
 * step, then a numbered guide (how to use it, the inputs, a worked example,
 * any extra sections, the formula and assumptions, the FAQ), related tools
 * and the software the numbers feed.
 *
 * Server-rendered, so every explanation is in the HTML a crawler and a no-JS
 * reader receive. The FAQ list is the one source for both the visible
 * questions and the page's single FAQPage JSON-LD.
 */
export function CalculatorFrame({
  slug,
  lead,
  facts = ["No sign-up", "Share link, save or print", "Formula shown"],
  howToUse,
  formula,
  assumptions,
  featureKeys,
  inputs,
  workedExample,
  guide = [],
  guideTitle,
  faq,
  children,
}: {
  /** The guide's heading, e.g. "How to compare technician pay plans". */
  readonly guideTitle: string;
  readonly slug: ResourceCalculatorEntry["slug"];
  readonly lead: React.ReactNode;
  readonly facts?: readonly string[];
  readonly howToUse: readonly string[];
  readonly formula: readonly string[];
  readonly assumptions: readonly string[];
  readonly featureKeys: readonly AltairFeatureKey[];
  readonly inputs?: readonly CalculatorInputNote[];
  readonly workedExample?: CalculatorWorkedExample;
  readonly guide?: readonly CalculatorGuideSection[];
  readonly faq: readonly CalculatorFaqItem[];
  readonly children: React.ReactNode;
}) {
  const entry = RESOURCE_CALCULATORS.find((calculator) => calculator.slug === slug);
  if (!entry) return null;
  const path = calculatorPath(slug);
  const url = `${PUBLIC_SITE_ORIGIN}${path}`;
  const others = RESOURCE_CALCULATORS.filter((calculator) => calculator.slug !== slug);
  const software = CALCULATOR_SOFTWARE[slug].map((softwarePath) => SOFTWARE_PAGES[softwarePath]);

  const nav: GuideNavItem[] = [
    { id: "how-to-use", label: "How to use it" },
    ...(inputs && inputs.length > 0 ? [{ id: "inputs", label: "What each input means" }] : []),
    ...(workedExample ? [{ id: "example", label: "A worked example" }] : []),
    ...guide.map((section) => ({ id: section.id, label: section.label })),
    { id: "formula", label: "The formula and assumptions" },
    { id: "faq", label: "Questions owners ask" },
  ];
  const numberOf = (id: string) => nav.findIndex((item) => item.id === id) + 1;

  return (
    <>
      <JsonLdScript data={buildResourceWebPageStructuredData({ name: entry.title, description: entry.description, path })} />
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebApplication",
              name: entry.title,
              url: `${url}#calculator`,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any (runs in the browser)",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Free tools", item: `${PUBLIC_SITE_ORIGIN}${RESOURCES_PATH}` },
                { "@type": "ListItem", position: 2, name: "Calculators", item: `${PUBLIC_SITE_ORIGIN}${RESOURCES_CALCULATORS_PATH}` },
                { "@type": "ListItem", position: 3, name: entry.title, item: url },
              ],
            },
          ],
        }}
      />
      <JsonLdScript data={buildFaqPageStructuredData(faq)} />

      <ToolHero
        trail={[
          { label: "Free tools", href: RESOURCES_PATH },
          { label: "Calculators", href: RESOURCES_CALCULATORS_PATH },
        ]}
        crumb={entry.title}
        eyebrow="Free calculator"
        title={entry.title}
        question={entry.question}
        needs={entry.needs}
        lead={lead}
        updated={CALCULATORS_UPDATED}
        facts={facts}
        jumpLinks={[
          { href: "#calculator", label: "Open the calculator" },
          ...(workedExample ? [{ href: "#example", label: "Worked example" }] : []),
          { href: "#formula", label: "The formula" },
          { href: "#faq", label: "FAQ" },
        ]}
      />

      <ToolStage>
        {children}
        <p className="mx-auto mt-3 max-w-4xl px-2 text-center text-xs leading-relaxed text-stone-500 print:mt-6 print:text-left">
          {CALCULATOR_DISCLAIMER} Values marked &ldquo;sample&rdquo; are placeholders, not industry data.
        </p>
        <NextStep
          className="mx-auto mt-10 max-w-6xl print:hidden"
          placement={`calc-${slug}`}
          steps={CALCULATOR_NEXT_STEPS[slug]}
          heading="Got your number? Here is where it goes next."
        />
      </ToolStage>

      <GuideLayout eyebrow="The guide" title={guideTitle} nav={nav}>
        <GuideSection id="how-to-use" n={numberOf("how-to-use")} title="How to use it">
          <ol className="space-y-2.5">
            {howToUse.map((step, index) => (
              <li key={step} className="flex gap-3 rounded-xl bg-stone-50 px-4 py-3 ring-1 ring-inset ring-stone-200">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A4823A] text-[11px] font-semibold text-[#080907]">
                  {index + 1}
                </span>
                <span className="min-w-0 text-[15px] leading-relaxed text-stone-700">{step}</span>
              </li>
            ))}
          </ol>
        </GuideSection>

        {inputs && inputs.length > 0 ? (
          <GuideSection id="inputs" n={numberOf("inputs")} title="What each input means">
            <dl className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
              {inputs.map((input) => (
                <div key={input.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
                  <dt className="font-semibold text-stone-900">{input.name}</dt>
                  <dd className="text-[15px] leading-relaxed text-stone-700">{input.text}</dd>
                </div>
              ))}
            </dl>
          </GuideSection>
        ) : null}

        {workedExample ? (
          <GuideSection id="example" n={numberOf("example")} title="A worked example">
            <p>{workedExample.setup}</p>
            <MathTable caption="Worked example, sample numbers" rows={workedExample.rows} />
            <p>{workedExample.conclusion}</p>
          </GuideSection>
        ) : null}

        {guide.map((section) => (
          <GuideSection key={section.id} id={section.id} n={numberOf(section.id)} title={section.title}>
            {section.body}
          </GuideSection>
        ))}

        <GuideSection
          id="formula"
          n={numberOf("formula")}
          title="The formula and assumptions"
          aside={
            <Callout title="Disclaimer">
              <p>{CALCULATOR_DISCLAIMER}</p>
            </Callout>
          }
        >
          <div className="overflow-x-auto rounded-xl bg-stone-900 px-4 py-4">
            <pre className="whitespace-pre font-mono text-[12.5px] leading-6 text-[#f3ebdd]">{formula.join("\n")}</pre>
          </div>
          <p className="font-semibold text-stone-900">Assumptions</p>
          <BulletList items={assumptions} />
          {featureKeys.map((key) => (
            <AltairFeatureNote key={key} featureKey={key} compact />
          ))}
        </GuideSection>

        <GuideSection id="faq" n={numberOf("faq")} title="Questions owners ask">
          <FaqList items={faq} />
        </GuideSection>

        <RelatedGrid
          title="Other free tools"
          links={[
            ...WORKSPACES.map((tool) => ({ href: tool.href, title: tool.title, text: tool.youGet })),
            ...others.map((calculator) => ({ href: calculatorPath(calculator.slug), title: calculator.title, text: calculator.description })),
            { href: RESOURCES_TEMPLATES_PATH, title: "Free templates", text: "Estimate, pricing worksheet, agreement outline and checklist: PDF, Excel and Word." },
          ]}
        />

        <ProductBand
          headline="Run these numbers on your real jobs."
          text="Altair Operating System keeps jobs, technician time, estimates and invoices on one record, so the numbers this calculator asks for come from what actually happened instead of a guess."
          softwareHref={software[0].href}
          softwareLabel={software[0].label}
        />
      </GuideLayout>
    </>
  );
}
