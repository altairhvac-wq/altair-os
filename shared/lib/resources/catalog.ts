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
/** The flat-rate price list builder: a list tool, not one of the fixed-form calculators. */
export const RESOURCES_FLAT_RATE_PATH = "/resources/flat-rate-price-list";
/** The estimate builder: the Invoice Builder with an estimate's words. */
export const RESOURCES_ESTIMATE_PATH = "/resources/estimate-builder";
export const RESOURCES_GUIDES_PATH = "/resources/guides";
export const RESOURCES_LIBRARY_PATH = "/resources/library";

export type ResourceCalculatorEntry = {
  slug:
    | "labor-rate"
    | "job-profitability"
    | "break-even"
    | "maintenance-agreement"
    | "technician-pay"
    | "callback-cost"
    | "service-call-fee"
    | "hiring-a-technician"
    | "truck-cost";
  title: string;
  /** One sentence for cards and meta descriptions. */
  description: string;
  /** The question it answers, in the owner's words. Shown on the calculators list and at the top of the tool on a phone. */
  question: string;
  /** What to have open before starting. Shown on the list and above the tool itself. */
  needs: string;
};

export const RESOURCE_CALCULATORS: readonly ResourceCalculatorEntry[] = [
  {
    slug: "labor-rate",
    title: "Quick HVAC labor rate calculator",
    description:
      "The quick version: one technician's billable rate from wage, burden, unbillable hours, overhead and your target margin.",
    question: "What do I have to charge per billable hour so a technician's time actually pays for itself?",
    needs: "A pay stub, your payroll provider's employer-cost report, and last year's Profit and Loss.",
  },
  {
    slug: "job-profitability",
    title: "Job profitability calculator",
    description:
      "See the gross profit, net profit and margin on a single job from its revenue, labor, materials, subcontract and overhead share.",
    question: "Did that job make money once labor, materials and overhead are counted?",
    needs: "One finished job's invoice, timesheets and parts receipts.",
  },
  {
    slug: "break-even",
    title: "HVAC break-even calculator",
    description:
      "Find how many jobs and how much revenue a month it takes to cover your fixed costs.",
    question: "How many jobs a month does it take before the business stops losing money?",
    needs: "Last year's Profit and Loss and your number of jobs a month.",
  },
  {
    slug: "maintenance-agreement",
    title: "Maintenance agreement pricing calculator",
    description:
      "Price a maintenance agreement from what it costs to serve: the visits, the materials, the office time and the repair discount members get.",
    question: "What should a maintenance agreement cost so the visits and the member discount are paid for?",
    needs: "Your labor rate result and what a tune-up uses in time and parts.",
  },
  {
    slug: "technician-pay",
    title: "Technician pay calculator: hourly, flat rate or commission",
    description:
      "Compare one week of technician pay three ways: hourly with overtime, flat rate by book hours, and commission on revenue.",
    question: "Would this week have paid more on hourly, flat rate or commission?",
    needs: "One week's timesheet and the revenue that technician produced.",
  },
  {
    slug: "callback-cost",
    title: "Callback cost calculator",
    description:
      "See what unpaid return trips cost a month and a year, your callback rate, and the billable hours they take off the board.",
    question: "What are free return trips really costing me every month?",
    needs: "Last month's callbacks, jobs finished, and your labor rate result.",
  },
  {
    slug: "service-call-fee",
    title: "HVAC service call fee calculator",
    description:
      "Work out a service call fee from your own labor rate, see whether today's fee covers the visit, and what a low or free call costs a year.",
    question: "What should a service call cost, and is the fee I charge now losing money?",
    needs: "Your labor rate result, the fee you charge now, and last month's service calls.",
  },
  {
    slug: "hiring-a-technician",
    title: "Hiring calculator: can I afford another technician?",
    description:
      "What another technician costs a month, the billed hours a week that pay for them, and the cash the first weeks take while their schedule fills.",
    question: "Can I afford another technician, and how many hours do they have to bill?",
    needs: "The wage you would offer, what one truck costs you a month, and your labor rate result.",
  },
  {
    slug: "truck-cost",
    title: "Service truck cost calculator",
    description:
      "What one service truck costs a month, per working day, per billed hour and per job, and what a day with it parked still costs.",
    question: "What does one truck cost me a day, and is my rate covering it?",
    needs: "The truck's loan and insurance statements, a month of fuel, and last year's repair bills.",
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
  RESOURCES_FLAT_RATE_PATH,
  RESOURCES_ESTIMATE_PATH,
  RESOURCES_GUIDES_PATH,
  RESOURCES_LIBRARY_PATH,
];

export const RESOURCES_HUB_DESCRIPTION =
  "Free HVAC business tools: a labor cost workspace, an invoice builder, pay, break-even and pricing calculators, and templates. No account needed.";

export const CALCULATOR_DISCLAIMER =
  "Estimates only. This calculator is for planning and education; it is not financial, tax or legal advice. Results depend entirely on the numbers you enter. Verify your figures and decisions with your accountant.";
