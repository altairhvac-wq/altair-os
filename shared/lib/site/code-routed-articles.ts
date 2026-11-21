/**
 * Insights addresses answered by a page in code rather than by their
 * database row.
 *
 * /insights/how-to-calculate-hvac-labor-rate and /insights/hvac-invoice-template
 * became static routes in PR #95 (a static segment wins over `[slug]`). Their
 * rows in marketing_site_pages still exist and still feed the Insights index,
 * the guides list, the library search, "Read next" and the sitemap, but the
 * row's title and description describe the old article. Every list of
 * articles shows these instead, so a card names the page it opens. The
 * database is not written to.
 *
 * Each page reads its own H1 and meta description from here, so the card and
 * the page cannot drift apart. Pure (no imports).
 */

export type CodeRoutedArticle = {
  /** The page's H1, also the title on every card that links to it. */
  readonly title: string;
  /** The page's meta description, also the card's summary. */
  readonly description: string;
};

export const CODE_ROUTED_ARTICLES: Readonly<Record<string, CodeRoutedArticle>> = {
  "how-to-calculate-hvac-labor-rate": {
    title: "HVAC labor rate calculator and cost workspace",
    description:
      "Work out your HVAC hourly labor rate for the whole crew: wages, burden, unbilled time, overhead and margin. Plus sourced average and commercial rates.",
  },
  "hvac-invoice-template": {
    title: "HVAC invoice template and builder",
    description:
      "Free HVAC invoice template and builder: equipment, refrigerant, labor and parts, a live invoice to print or save as PDF, and a filled-in example.",
  },
};

/** A listed article's title and description, with the code route's own where one answers the slug. */
export function withCodeRouteDisplay<T extends { slug: string; title: string; metaDescription: string | null }>(
  page: T,
): T {
  const override = CODE_ROUTED_ARTICLES[page.slug];
  if (!override) return page;
  return { ...page, title: override.title, metaDescription: override.description };
}
