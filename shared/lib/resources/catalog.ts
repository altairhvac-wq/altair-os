/**
 * The Resource Center's own map: paths, section copy and calculator entries.
 *
 * One list drives the hub, the calculators index, the sitemap and the
 * verifier, so a calculator cannot exist in one place and be missing from
 * another. Pure (no imports).
 */

export const RESOURCES_PATH = "/resources";
export const RESOURCES_CALCULATORS_PATH = "/resources/calculators";
export const RESOURCES_TEMPLATES_PATH = "/resources/templates";
export const RESOURCES_GUIDES_PATH = "/resources/guides";
export const RESOURCES_LIBRARY_PATH = "/resources/library";

export type ResourceCalculatorEntry = {
  slug: "labor-rate" | "job-profitability" | "break-even";
  title: string;
  /** One sentence for cards and meta descriptions. */
  description: string;
};

export const RESOURCE_CALCULATORS: readonly ResourceCalculatorEntry[] = [
  {
    slug: "labor-rate",
    title: "Labor rate calculator",
    description:
      "Work out the hourly rate a technician needs to bill to cover wage, burden, unbillable hours, overhead and your target margin.",
  },
  {
    slug: "job-profitability",
    title: "Job profitability calculator",
    description:
      "See the gross profit, net profit and margin on a single job from its revenue, labor, materials, subcontract and overhead share.",
  },
  {
    slug: "break-even",
    title: "Break-even calculator",
    description:
      "Find how many jobs and how much revenue a month it takes to cover your fixed costs.",
  },
];

export function calculatorPath(slug: ResourceCalculatorEntry["slug"]): string {
  return `${RESOURCES_CALCULATORS_PATH}/${slug}`;
}

export function templateDownloadPath(id: string): string {
  return `${RESOURCES_TEMPLATES_PATH}/${id}`;
}

/** Every static Resource Center page, for the sitemap. */
export const RESOURCE_STATIC_PATHS: readonly string[] = [
  RESOURCES_PATH,
  RESOURCES_CALCULATORS_PATH,
  ...RESOURCE_CALCULATORS.map((calculator) => calculatorPath(calculator.slug)),
  RESOURCES_TEMPLATES_PATH,
  RESOURCES_GUIDES_PATH,
  RESOURCES_LIBRARY_PATH,
];

export const RESOURCES_HUB_DESCRIPTION =
  "Free calculators, templates, guides and videos for HVAC and trade business owners: price your labor, check job profit, find your break-even, and run the office day. No account required.";

export const CALCULATOR_DISCLAIMER =
  "Estimates only. This calculator is for planning and education; it is not financial, tax or legal advice. Results depend entirely on the numbers you enter. Verify your figures and decisions with your accountant.";
