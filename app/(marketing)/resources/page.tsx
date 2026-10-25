import type { Metadata } from "next";
import Link from "next/link";
import {
  ResourceCard,
  ResourcePageShell,
  resourceLinkClass,
} from "@/shared/components/resources/ResourcePageShell";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import {
  RESOURCES_CALCULATORS_PATH,
  RESOURCES_GUIDES_PATH,
  RESOURCES_HUB_DESCRIPTION,
  RESOURCES_LIBRARY_PATH,
  RESOURCES_PATH,
  RESOURCES_TEMPLATES_PATH,
  RESOURCE_CALCULATORS,
  calculatorPath,
} from "@/shared/lib/resources/catalog";
import { buildResourceCollectionStructuredData } from "@/shared/lib/resources/structured-data";
import { RESOURCE_TEMPLATES } from "@/shared/lib/resources/templates";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

/**
 * The Contractor Business Resource Center hub.
 *
 * Static and anonymous: everything here is constant copy and links. The
 * guides and library sections link to their own pages (which read the
 * published Insights pages and the channel feeds) rather than loading data
 * here, so the hub stays fast and never fails because a feed did.
 */

const TITLE = "Contractor Business Resource Center";

export const metadata: Metadata = {
  title: TITLE,
  description: RESOURCES_HUB_DESCRIPTION,
  ...buildPublicSocialMetadata({
    path: RESOURCES_PATH,
    title: TITLE,
    description: RESOURCES_HUB_DESCRIPTION,
  }),
};

const SECTIONS = [
  {
    title: "Calculators",
    href: RESOURCES_CALCULATORS_PATH,
    description:
      "Price your labor, check what a job really made, and find the number of jobs that covers your month. Every formula and assumption is on the page.",
    links: RESOURCE_CALCULATORS.map((calculator) => ({
      label: calculator.title,
      href: calculatorPath(calculator.slug),
    })),
  },
  {
    title: "Templates",
    href: RESOURCES_TEMPLATES_PATH,
    description:
      "Original files to download and make your own: open them in any spreadsheet program or text editor.",
    links: RESOURCE_TEMPLATES.map((template) => ({
      label: template.title,
      href: `${RESOURCES_TEMPLATES_PATH}#${template.id}`,
    })),
  },
  {
    title: "Guides",
    href: RESOURCES_GUIDES_PATH,
    description:
      "Practical articles on pricing, estimates, dispatch, invoicing and running the office, published on Altair Insights.",
    links: [
      { label: "Browse the guides", href: RESOURCES_GUIDES_PATH },
      { label: "All Insights articles", href: "/insights" },
    ],
  },
  {
    title: "Library",
    href: RESOURCES_LIBRARY_PATH,
    description:
      "Search articles and public videos from the Altair HVAC Exploration and Altair Operating System channels in one place.",
    links: [{ label: "Search the library", href: RESOURCES_LIBRARY_PATH }],
  },
] as const;

export default function ResourcesHubPage() {
  return (
    <ResourcePageShell
      eyebrow="Free resources"
      title={TITLE}
      width="wide"
      intro={
        <>
          <p>
            An educational destination for HVAC and trade business owners. Use the calculators,
            templates, guides and videos to work on the business side of the trade: pricing,
            profit, scheduling and the daily routine of the office.
          </p>
          <p className="mt-3 text-base text-stone-500">
            Free, with no account required. Calculators give estimates for planning, not
            financial, tax or legal advice.
          </p>
        </>
      }
    >
      <JsonLdScript
        data={buildResourceCollectionStructuredData({
          name: TITLE,
          description: RESOURCES_HUB_DESCRIPTION,
          path: RESOURCES_PATH,
          parts: SECTIONS.map((section) => ({ name: section.title, path: section.href })),
        })}
      />

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <section key={section.title} aria-labelledby={`resources-${section.title}`}>
            <ResourceCard className="h-full">
              <h2
                id={`resources-${section.title}`}
                className="text-xl font-semibold tracking-tight text-[#0A0A0A]"
              >
                <Link
                  href={section.href}
                  className="hover:text-[#77591B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40"
                >
                  {section.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{section.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={resourceLinkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </ResourceCard>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-stone-600">
        Altair OS is field service software for the same work these resources cover.{" "}
        <Link href="/#features" className={resourceLinkClass}>
          See what is in the product
        </Link>
        .
      </p>
    </ResourcePageShell>
  );
}
