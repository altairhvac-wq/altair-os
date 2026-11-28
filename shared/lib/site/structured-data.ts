import {
  SAAS_TRIAL_CONFIG,
  describePlanAccounts,
  listPublicSaasCatalogPlans,
} from "@/lib/saas-billing/catalog";
import { SAAS_PLAN_DESCRIPTIONS } from "@/shared/components/pricing/plan-descriptions";
import {
  PUBLIC_SITE_DESCRIPTION,
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_ORIGIN,
} from "@/shared/lib/site/public-site";
import { SITE_FAQ } from "@/shared/lib/site/faq";
import { YOUTUBE_CHANNELS } from "@/shared/lib/resources/youtube-feed";
import { COMPANY_FACTS, FOUNDER } from "@/shared/lib/site/about";

/**
 * Structured data (JSON-LD) for the public marketing pages.
 *
 * ============ ONE SERIALIZER, AND ONLY FACTS THE SITE ALREADY STATES ============
 * Every builder here reads from the same sources the visible pages render:
 * the plan catalog the pricing page lists, the trial config it quotes, the
 * site constants the layout uses. Nothing is typed in by hand that a visitor
 * cannot also read on the page, and there is deliberately no
 * `aggregateRating`, no `review`, no `author` we cannot name — structured
 * data that claims what the page does not show is what earns a manual action.
 *
 * `serializeJsonLd` moved here from `SitePageArticle` so the article page,
 * the homepage and the pricing page escape the one dangerous sequence the
 * same way.
 */

/**
 * JSON-LD, escaped for the one sequence that can break out of a script tag.
 *
 * `JSON.stringify` does not escape `</script>`, and a body or title
 * containing it would end the block and let whatever followed be parsed as
 * markup. Replacing `<` inside the serialised string closes that.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The product's publisher, as the site already names it. */
export function buildOrganizationStructuredData(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PUBLIC_SITE_NAME,
    url: PUBLIC_SITE_ORIGIN,
    // The PWA icon in `public/icons/`, regenerated from its SVG source.
    logo: `${PUBLIC_SITE_ORIGIN}/icons/icon-512.png`,
    // The two YouTube channels, which the footer links on every page.
    sameAs: YOUTUBE_CHANNELS.map((channel) => channel.url),
    // Named on /about, in the same words (shared/lib/site/about.ts).
    founder: { "@type": "Person", name: FOUNDER.name, jobTitle: FOUNDER.title },
    foundingDate: COMPANY_FACTS.foundedYear,
  };
}

/**
 * The product and its three public plans.
 *
 * Offers are read from the SAME catalog the pricing page renders, so a price
 * change there changes here in the same commit. The trial is an Offer
 * description in the pricing page's own words rather than a separate
 * zero-price Offer, because a "$0 plan" is not something the site sells.
 */
export function buildSoftwareApplicationStructuredData(): Record<string, unknown> {
  const trialNote = `${SAAS_TRIAL_CONFIG.durationDays}-day free trial. No credit card required to start.`;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PUBLIC_SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: PUBLIC_SITE_ORIGIN,
    description: PUBLIC_SITE_DESCRIPTION,
    publisher: { "@type": "Organization", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
    offers: listPublicSaasCatalogPlans().map((plan) => ({
      "@type": "Offer",
      name: `${PUBLIC_SITE_NAME} ${plan.label}`,
      description: [
        SAAS_PLAN_DESCRIPTIONS[plan.planKey],
        describePlanAccounts(plan) ? `${describePlanAccounts(plan)}.` : "",
        `$${plan.monthlyPriceUsd}/month or $${plan.annualPriceUsd}/year.`,
        trialNote,
      ]
        .filter(Boolean)
        .join(" "),
      price: plan.monthlyPriceUsd,
      priceCurrency: "USD",
      url: `${PUBLIC_SITE_ORIGIN}/pricing`,
      availability: "https://schema.org/InStock",
      category: "subscription",
    })),
  };
}

/**
 * The FAQ block, for the pages that RENDER it (homepage and pricing). The
 * same list the visible section reads, so the structured data can never say
 * more than the page does.
 */
export function buildFaqStructuredData(): Record<string, unknown> {
  return buildFaqPageStructuredData(SITE_FAQ);
}

/**
 * FAQPage JSON-LD for a page that renders its OWN questions (the invoicing
 * page, the calculators). Pass the same list the page shows, never a second
 * copy, and render only one FAQPage per page.
 */
export function buildFaqPageStructuredData(
  items: readonly { readonly question: string; readonly answer: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * JSON-LD for one Insights article (app/(articles)/insights/[slug]).
 *
 * Article, BreadcrumbList and, only when the body has a real FAQ section that
 * the page renders, FAQPage, in one graph. The author is the publisher, the
 * way the page's byline names it ("the Altair Operating System team"):
 * no person is credited with writing these articles, so none is named here.
 * Dates are the row's own: published_at, and updated_at as dateModified.
 */
export function buildInsightsArticleStructuredData(input: {
  readonly title: string;
  readonly description: string | null;
  /** The recorded canonical, absolute. */
  readonly url: string;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly section: string;
  readonly wordCount: number;
  readonly faq: readonly { readonly question: string; readonly answer: string }[];
}): Record<string, unknown> {
  const organization = {
    "@type": "Organization",
    "@id": `${PUBLIC_SITE_ORIGIN}/#organization`,
    name: PUBLIC_SITE_NAME,
    url: PUBLIC_SITE_ORIGIN,
    logo: { "@type": "ImageObject", url: `${PUBLIC_SITE_ORIGIN}/icons/icon-512.png` },
  };
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Article",
      "@id": `${input.url}#article`,
      headline: input.title.slice(0, 110),
      ...(input.description ? { description: input.description } : {}),
      url: input.url,
      mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
      image: `${PUBLIC_SITE_ORIGIN}/og.png`,
      ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
      dateModified: input.updatedAt,
      author: organization,
      publisher: organization,
      articleSection: input.section,
      wordCount: input.wordCount,
      inLanguage: "en-US",
      isAccessibleForFree: true,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Insights", item: `${PUBLIC_SITE_ORIGIN}/insights` },
        { "@type": "ListItem", position: 2, name: input.title, item: input.url },
      ],
    },
  ];
  if (input.faq.length >= 2) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: input.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
