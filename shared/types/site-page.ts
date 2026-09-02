/**
 * The Altair site page: what a slug may be, what makes a page publishable,
 * and what its structured data says.
 *
 * ====================== WHY THIS FILE IS PURE ======================
 * No imports, no `server-only`, no clock, no database. Every rule here
 * decides something that ends up in a public URL or in a search engine's
 * index, and both are expensive to get wrong and slow to take back. A rule
 * that can only be exercised by publishing a real page to a real site is a
 * rule that will not be exercised.
 *
 * Mirrors the CHECK constraints in migration 187. The database is the
 * authority; this is the same answer given early enough to be useful.
 */

export const SITE_PAGE_STATES = ["draft", "published", "archived"] as const;
export type SitePageState = (typeof SITE_PAGE_STATES)[number];

/** Matches `marketing_site_pages_slug_shape`. */
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 96;
export const META_TITLE_MAX = 70;
export const META_DESCRIPTION_MAX = 200;
export const TITLE_MAX = 200;

/**
 * The minimum body a page may be published with.
 *
 * ============ THIS IS THE ANTI-THIN-CONTENT FLOOR ============
 * It exists because the cheapest possible way to "do SEO" is to generate
 * hundreds of near-empty pages, and a system that CAN do that eventually
 * will — not by decision, but because nothing stopped it. 600 characters is
 * not a good article. It is far more than a placeholder, and it is enforced
 * in SQL as well (`marketing_site_pages_published_is_complete`) so no code
 * path can publish under it.
 *
 * Raising this is a content-strategy decision. Lowering it is a decision to
 * publish thinner pages, and should be argued for rather than tuned.
 */
export const BODY_MIN_LENGTH_FOR_PUBLISH = 600;

/**
 * Turn a title into a URL slug.
 *
 * Deliberately lossy and deliberately boring: lowercase ASCII, words joined
 * by single hyphens, everything else dropped. No transliteration table, no
 * stop-word removal, no keyword stuffing. A slug is an address, and an
 * address optimised for a search engine rather than for a human reading it
 * in a link is the first step toward the kind of page nobody wants to land
 * on.
 *
 * Returns null when nothing usable survives — an empty slug is not a URL,
 * and guessing one would put a page at an address nobody chose.
 */
export function slugify(input: string): string | null {
  const slug = input
    .normalize("NFKD")
    // Strip combining marks so "é" becomes "e" rather than vanishing.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    // A trailing hyphen can reappear after the slice.
    .replace(/-+$/g, "");

  if (slug.length < SLUG_MIN_LENGTH) return null;
  return slug;
}

export function isValidSlug(candidate: string): boolean {
  return (
    candidate.length >= SLUG_MIN_LENGTH &&
    candidate.length <= SLUG_MAX_LENGTH &&
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(candidate)
  );
}

/**
 * A slug that does not collide with one already taken.
 *
 * Suffixes `-2`, `-3`, … rather than a random token, because a human reading
 * a URL should be able to tell that two pages are related. The caller passes
 * the slugs already in use; this decides, and does not look anything up.
 *
 * The suffix is applied within the length limit, so a maximal slug does not
 * become invalid by being disambiguated.
 */
export function uniqueSlug(
  desired: string,
  taken: ReadonlySet<string>,
): string | null {
  if (!isValidSlug(desired)) return null;
  if (!taken.has(desired)) return desired;

  for (let n = 2; n <= 99; n += 1) {
    const suffix = `-${n}`;
    const base = desired.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, "");
    const candidate = `${base}${suffix}`;
    if (isValidSlug(candidate) && !taken.has(candidate)) return candidate;
  }

  // 99 pages competing for one slug is not a collision, it is a generator
  // producing the same page over and over. Refusing is the right answer.
  return null;
}

/** Absolute https URL for a slug on the configured site origin. */
export function canonicalUrlFor(siteOrigin: string, slug: string): string | null {
  if (!isValidSlug(slug)) return null;
  const origin = siteOrigin.trim().replace(/\/+$/g, "");
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) return null;
  return `${origin}${SITE_PAGE_PATH_PREFIX}/${slug}`;
}

/** The one place the public path is spelled. */
export const SITE_PAGE_PATH_PREFIX = "/insights";

export type SitePageDraft = {
  readonly slug: string;
  readonly title: string;
  readonly metaTitle: string | null;
  readonly metaDescription: string | null;
  readonly canonicalUrl: string | null;
  readonly bodyMarkdown: string;
  readonly internalLinks: readonly string[];
  readonly keywords: readonly string[];
};

export type PublishabilityVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly detail: string };

/**
 * Everything that must be true before a page becomes a public URL.
 *
 * Mirrors `marketing_site_pages_published_is_complete` and adds the checks
 * SQL cannot express — that internal links point at pages that exist, and
 * that the canonical actually addresses THIS page rather than some other.
 *
 * `existingSlugs` is every published slug for the company, so a link to a
 * page that was never published (or was archived) is caught before it ships
 * as a dead internal link.
 */
export function assertPublishableSitePage(input: {
  readonly draft: SitePageDraft;
  readonly siteOrigin: string;
  readonly existingSlugs: ReadonlySet<string>;
}): PublishabilityVerdict {
  const { draft } = input;

  if (!isValidSlug(draft.slug)) {
    return {
      ok: false,
      code: "invalid_slug",
      detail:
        "The page's slug is not a usable URL segment. Slugs are lowercase words joined by single hyphens.",
    };
  }

  if (!draft.title.trim() || draft.title.length > TITLE_MAX) {
    return {
      ok: false,
      code: "invalid_title",
      detail: `A page needs a title of 1 to ${TITLE_MAX} characters.`,
    };
  }

  // Metadata is required to PUBLISH, not to draft. A page without a meta
  // description gets one written by a search engine from whatever text it
  // finds, which is how a page ends up summarised by its own navigation.
  if (!draft.metaTitle || draft.metaTitle.length > META_TITLE_MAX) {
    return {
      ok: false,
      code: "invalid_meta_title",
      detail: `A published page needs a meta title of 1 to ${META_TITLE_MAX} characters.`,
    };
  }

  if (
    !draft.metaDescription ||
    draft.metaDescription.length > META_DESCRIPTION_MAX
  ) {
    return {
      ok: false,
      code: "invalid_meta_description",
      detail: `A published page needs a meta description of 1 to ${META_DESCRIPTION_MAX} characters.`,
    };
  }

  const expectedCanonical = canonicalUrlFor(input.siteOrigin, draft.slug);
  if (!expectedCanonical) {
    return {
      ok: false,
      code: "invalid_site_origin",
      detail:
        "The site origin is not a usable https origin, so a canonical URL cannot be derived.",
    };
  }

  // A canonical pointing anywhere but this page tells a search engine to
  // credit a different URL — including, if it were ever attacker-influenced,
  // somebody else's site.
  if (draft.canonicalUrl !== expectedCanonical) {
    return {
      ok: false,
      code: "canonical_mismatch",
      detail:
        "The canonical URL does not address this page on this site. A canonical that points elsewhere hands the page's ranking to that address.",
    };
  }

  if (draft.bodyMarkdown.trim().length < BODY_MIN_LENGTH_FOR_PUBLISH) {
    return {
      ok: false,
      code: "body_too_thin",
      detail: `A published page needs at least ${BODY_MIN_LENGTH_FOR_PUBLISH} characters of body. Thin pages are not published.`,
    };
  }

  // No HTML in the body. The renderer escapes, so this is defence in depth
  // rather than the only guard — but a body carrying a script tag is a
  // generator doing something nobody asked for, and worth refusing loudly.
  if (/<\s*script/i.test(draft.bodyMarkdown)) {
    return {
      ok: false,
      code: "body_contains_script",
      detail: "The page body contains a script tag and was not published.",
    };
  }

  for (const link of draft.internalLinks) {
    if (!isValidSlug(link)) {
      return {
        ok: false,
        code: "invalid_internal_link",
        detail: `Internal link '${link}' is not a valid page slug.`,
      };
    }
    if (link === draft.slug) {
      return {
        ok: false,
        code: "self_internal_link",
        detail: "A page cannot list itself as an internal link.",
      };
    }
    if (!input.existingSlugs.has(link)) {
      // A dead internal link is worse than no link: it ships a 404 into the
      // site's own navigation and dilutes whatever the linking was for.
      return {
        ok: false,
        code: "dead_internal_link",
        detail: `Internal link '${link}' does not match a published page.`,
      };
    }
  }

  return { ok: true };
}

/**
 * The JSON-LD an article page carries.
 *
 * Deliberately minimal and honest: schema.org `Article` with the fields we
 * actually hold. No `aggregateRating`, no `review`, no `author` we cannot
 * name — structured data that claims things the page does not support is
 * exactly what earns a manual action.
 */
export function buildArticleStructuredData(input: {
  readonly title: string;
  readonly metaDescription: string;
  readonly canonicalUrl: string;
  readonly publishedAt: string;
  readonly updatedAt: string;
  readonly publisherName: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title.slice(0, 110),
    description: input.metaDescription,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.canonicalUrl },
    url: input.canonicalUrl,
    datePublished: input.publishedAt,
    dateModified: input.updatedAt,
    publisher: { "@type": "Organization", name: input.publisherName },
  };
}
