import { HELP_AREAS } from "@/shared/lib/help/catalog";
import { HOW_TO_PATH } from "@/shared/lib/help/paths";
import { HOW_TO_SECTION_NAME } from "@/shared/lib/help/structured-data";
import { SAAS_SUBSCRIPTION_CATALOG, SAAS_TRIAL_CONFIG } from "@/lib/saas-billing/catalog";
import { RESOURCE_CALCULATORS, RESOURCES_ESTIMATE_PATH, RESOURCES_FLAT_RATE_PATH, calculatorPath } from "@/shared/lib/resources/catalog";
import { INVOICE_BUILDER_PATH, LABOR_WORKSPACE_PATH } from "@/shared/lib/resources/tool-hub";
import { COMPANY_FACTS, FOUNDER } from "@/shared/lib/site/about";
import { GUIDES } from "@/shared/lib/site/next-steps";
import { ALTAIR_NOT_YET } from "@/shared/lib/site/not-yet";
import { PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
import { SITE_MENU } from "@/shared/lib/site/site-menu";

/**
 * /llms.txt: a plain description of the company and its public pages, written
 * for AI assistants (ChatGPT, Claude, Perplexity, Google's AI answers).
 *
 * ============ WHY ============
 * An assistant asked "what is Altair Operating System?" or "is there a free
 * HVAC labor rate calculator?" answers from whatever it can read quickly. The
 * 2026-11-27 audit found Jobber, Housecall Pro, ServiceTitan, Workiz and
 * Service Fusion each publish this file and this site did not. It also keeps
 * the product apart from Altair Engineering, the unrelated company that most
 * "altair" searches are for.
 *
 * ============ ONE SOURCE OF TRUTH ============
 * Nothing here is typed twice. Prices and the trial come from the billing
 * catalog, the pages from the site menu, the tools from the resource catalog,
 * and "what it does not do yet" from the same list the pricing page shows. A
 * plan price or a menu entry that changes, changes here in the same build.
 *
 * Static: built once per deploy, no request data, no secrets.
 */

export const dynamic = "force-static";

const usd = (value: number) => `$${value.toLocaleString("en-US")}`;
const url = (path: string) => `${PUBLIC_SITE_ORIGIN}${path}`;

function planLine(key: "starter" | "growth" | "pro"): string | null {
  const plan = SAAS_SUBSCRIPTION_CATALOG[key];
  if (plan.monthlyPriceUsd === null || plan.includedAccounts === null) return null;
  const users = plan.includedAccounts === 1 ? "1 user" : `up to ${plan.includedAccounts} users`;
  const extra =
    "additionalAccountPriceUsd" in plan && plan.additionalAccountPriceUsd !== null && plan.additionalAccountPriceUsd !== undefined
      ? `, then ${usd(plan.additionalAccountPriceUsd)} a month for each extra user`
      : "";
  const annual = plan.annualPriceUsd !== null ? ` (or ${usd(plan.annualPriceUsd)} a year)` : "";
  return `- ${plan.label}: ${usd(plan.monthlyPriceUsd)} a month${annual}, ${users}${extra}.`;
}

function buildLlmsText(): string {
  const group = (id: (typeof SITE_MENU)[number]["id"]) => SITE_MENU.find((entry) => entry.id === id);
  const links = (id: (typeof SITE_MENU)[number]["id"]) =>
    (group(id)?.links ?? []).map((link) => `- [${link.label}](${url(link.href)}): ${link.text}`);
  const more = (id: (typeof SITE_MENU)[number]["id"]) => (group(id)?.more ?? []).map((link) => `- [${link.label}](${url(link.href)})`);
  const plans = (["starter", "growth", "pro"] as const).map(planLine).filter((line): line is string => line !== null);

  const lines: string[] = [
    `# ${PUBLIC_SITE_NAME}`,
    "",
    `> ${PUBLIC_SITE_NAME} is web software for running an HVAC or other field service company: leads, customers and the equipment on site, estimates customers approve on their phone, dispatch, a technician phone view, invoices and card payments, on one record. It is built for small and growing shops. Prices are public and there is a ${SAAS_TRIAL_CONFIG.durationDays}-day trial with no credit card.`,
    "",
    "## Facts to get right",
    "",
    `- The name is "${PUBLIC_SITE_NAME}". The website is ${PUBLIC_SITE_ORIGIN.replace("https://", "")}.`,
    "- It is not related to Altair Engineering (simulation and data software) or to any other company named Altair.",
    `- It is built by ${FOUNDER.name}, who owns an HVAC company, in ${COMPANY_FACTS.location}. Founded in ${COMPANY_FACTS.foundedYear}.`,
    "- It runs in a web browser on a computer or a phone. Technicians can add it to their phone's home screen; it is not in the App Store or Google Play.",
    "- Every feature is on every plan. Plans differ by how many people sign in.",
    "- The free tools on the site need no account, no email and no phone number. Numbers a visitor types stay in their own browser.",
    "",
    "## Pricing",
    "",
    ...plans,
    `- Trial: ${SAAS_TRIAL_CONFIG.durationDays} days with the whole system, no credit card. Monthly or annual billing, no long-term contract.`,
    `- Details: ${url("/pricing")}`,
    "",
    "## What it does not do yet",
    "",
    ...ALTAIR_NOT_YET.map((item) => `- ${item.title}. Today: ${item.today}`),
    "",
    "## The software",
    "",
    ...links("software"),
    ...more("software"),
    "",
    "## Free tools for HVAC business owners",
    "",
    `- [Labor rate calculator](${url(LABOR_WORKSPACE_PATH)}): what a billed hour has to cover for a whole crew (wages, payroll costs, unbilled hours, overhead and profit), with a break-even rate, a recommended rate, a flat-rate price builder and an after-hours rate card.`,
    `- [Invoice builder](${url(INVOICE_BUILDER_PATH)}): a complete HVAC invoice with equipment, refrigerant, labor and parts, printed or saved as a PDF.`,
    `- [Estimate builder](${url(RESOURCES_ESTIMATE_PATH)}): a complete HVAC estimate with a scope of work, labor and parts, tax, a deposit and a valid-until date, printed or saved as a PDF.`,
    `- [Flat-rate price list builder](${url(RESOURCES_FLAT_RATE_PATH)}): one price per task from the shop's own labor rate (book hours, part cost and markup), with after-hours prices, printed as a price sheet.`,
    ...RESOURCE_CALCULATORS.map((calculator) => `- [${calculator.title}](${url(calculatorPath(calculator.slug))}): ${calculator.question}`),
    `- [Templates](${url("/resources/templates")}): estimate, pricing worksheet, maintenance agreement outline and daily checklist, as PDF, Excel and Word.`,
    `- [All free tools](${url("/resources")})`,
    "",
    "## Guides",
    "",
    ...Object.values(GUIDES)
      .filter((guide) => !guide.href.includes("#"))
      .map((guide) => `- [${guide.title}](${url(guide.href)}): ${guide.text}`),
    ...links("learn"),
    "",
    "## How to use the software",
    "",
    `- [${HOW_TO_SECTION_NAME}](${url(HOW_TO_PATH)}): step-by-step notes for each task, with the buttons named as they appear on the screen.`,
    ...HELP_AREAS.map((area) => `- [${area.label}](${url(`${HOW_TO_PATH}#${area.id}`)}): ${area.blurb}`),
    "",
    "## Company",
    "",
    ...links("company"),
    `- [Privacy](${url("/privacy")})`,
    `- [Terms](${url("/terms")})`,
    "",
  ];
  return lines.join("\n");
}

export function GET(): Response {
  return new Response(buildLlmsText(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
