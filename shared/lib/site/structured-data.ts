import {
  SAAS_TRIAL_CONFIG,
  listPublicSaasCatalogPlans,
} from "@/lib/saas-billing/catalog";
import { SAAS_PLAN_DESCRIPTIONS } from "@/shared/components/pricing/plan-descriptions";
import {
  PUBLIC_SITE_DESCRIPTION,
  PUBLIC_SITE_NAME,
  PUBLIC_SITE_ORIGIN,
} from "@/shared/lib/site/public-site";
import { SITE_FAQ } from "@/shared/lib/site/faq";

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
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SITE_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
