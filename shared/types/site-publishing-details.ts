/**
 * What the Marketing editor shows about a Website post's publication.
 *
 * ====================== WHY THIS IS PURE ======================
 * Same reasoning as `integration-row.ts`: every state here is reached only
 * by publishing something, failing to publish something, or not having
 * published yet — and two of those three are awkward to arrange on demand.
 * The mapping from stored facts to what a human reads lives here, as data,
 * so a browser is not required to prove that an unpublished draft shows no
 * public URL.
 *
 * ====================== IT STORES NOTHING ======================
 * Every field is projected from a row that already exists:
 *
 *   marketing_site_pages            slug, state, revision, canonical, meta
 *                                   title/description, published/updated at
 *   marketing_site_page_revisions   the latest change note
 *   marketing_channel_deliveries    delivery state and the verified
 *                                   provider_result (migration 186)
 *   marketing_content_packages      the brief's primary keyword and intent
 *
 * There is no new SEO storage and there must not be. If a field is wanted
 * that nothing already records, the answer is a migration on the table that
 * owns the concept, not a second copy of it here.
 */

export type SitePublishState = "published" | "draft" | "archived" | "unpublished";

/**
 * A value that may genuinely be unknown.
 *
 * Null means "the system does not have this", and every renderer must show a
 * neutral unavailable state rather than a plausible-looking default. An
 * invented canonical or a guessed publish date on this panel would be read
 * as fact by whoever opens it.
 */
export type SitePublishingDetails = {
  /** The page row, when this post has one. Null before the first publish. */
  readonly page: {
    readonly id: string;
    readonly slug: string;
    readonly state: SitePublishState;
    readonly revision: number;
    readonly canonicalUrl: string | null;
    readonly metaTitle: string | null;
    readonly metaDescription: string | null;
    readonly publishedAt: string | null;
    readonly updatedAt: string;
  } | null;

  /** The delivery ledger row for this post to `altair_site`, if any. */
  readonly delivery: {
    readonly state: string;
    readonly settledAt: string | null;
    readonly failureDetail: string | null;
    /**
     * `provider_result` (migration 186) — what the adapter VERIFIED on
     * readback, not what it intended. The distinction is the whole point of
     * showing it.
     */
    readonly verified: {
      readonly slug: string | null;
      readonly pageState: string | null;
      readonly canonicalUrl: string | null;
      readonly revision: number | null;
      readonly verifiedAt: string | null;
    } | null;
  } | null;

  /** From the content package's brief, where the brief carries them. */
  readonly brief: {
    readonly primaryKeyword: string | null;
    readonly searchIntent: string | null;
  } | null;

  /** The most recent revision note, when one was recorded. */
  readonly latestChangeNote: string | null;
};

/** What the panel renders. Every field is display-ready or explicitly absent. */
export type SitePublishingPanel = {
  readonly statusLabel: string;
  readonly statusTone: "neutral" | "success" | "warning" | "danger" | "info";
  readonly summary: string;
  /**
   * The live page, or null.
   *
   * ============ WHY THIS IS NOT BUILT FROM THE SLUG ============
   * It is the canonical the PUBLISH RECORDED, and only when the page is
   * actually published. Assembling `origin + "/insights/" + slug` in the UI
   * would produce a link for a draft that 404s, and would be a second place
   * the site's address is decided — one that could disagree with the
   * canonical the page itself emits. If there is no recorded canonical there
   * is no button.
   */
  readonly publicUrl: string | null;
  readonly rows: readonly SitePublishingRow[];
};

export type SitePublishingRow = {
  readonly label: string;
  /** Null renders as the neutral unavailable state, never as a guess. */
  readonly value: string | null;
  /** Long values (a meta description, an intent) wrap instead of truncating. */
  readonly wrap?: boolean;
};

function formatDateTime(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Whether this page is in the sitemap, derived rather than fetched.
 *
 * `app/sitemap.ts` lists exactly the published pages that carry a canonical,
 * so those two stored facts answer the question completely. Making an HTTP
 * request to /sitemap.xml to find out would be asking the application
 * something it already knows, and would turn opening an editor into a
 * network call.
 */
export function isInSitemap(details: SitePublishingDetails): boolean {
  return Boolean(
    details.page &&
      details.page.state === "published" &&
      details.page.canonicalUrl,
  );
}

/**
 * Project stored facts into the panel.
 *
 * Exhaustive about absence: a post with no page, a page that is a draft, and
 * a delivery that failed each produce a different, honest summary rather
 * than a blank card.
 */
export function buildSitePublishingPanel(
  details: SitePublishingDetails,
): SitePublishingPanel {
  const { page, delivery, brief } = details;

  // Nothing has been published, and nothing pretends otherwise.
  if (!page) {
    const failed = delivery?.state === "failed";
    return {
      statusLabel: failed ? "Publish failed" : "Not published",
      statusTone: failed ? "danger" : "neutral",
      summary: failed
        ? delivery?.failureDetail ??
          "The last publish attempt to the Altair website failed."
        : "This post has not been published to the Altair website yet.",
      publicUrl: null,
      rows: [
        { label: "Delivery state", value: delivery?.state ?? null },
        {
          label: "Primary keyword",
          value: brief?.primaryKeyword ?? null,
        },
        { label: "Search intent", value: brief?.searchIntent ?? null, wrap: true },
      ],
    };
  }

  const isPublished = page.state === "published";
  const settled = delivery?.state === "posted";

  // The canonical is shown for any page that has one, but only a PUBLISHED
  // page gets a link — a draft's canonical describes where it would live,
  // and offering it as a button would send someone to a 404.
  const publicUrl = isPublished ? page.canonicalUrl : null;

  const statusLabel = isPublished
    ? "Published"
    : page.state === "archived"
      ? "Archived"
      : "Draft";

  const statusTone = isPublished
    ? settled
      ? "success"
      : // The page is live but the ledger does not say so. Worth a human's
        // attention rather than a green pill.
        "warning"
    : "neutral";

  const summary = isPublished
    ? settled
      ? `Live on the Altair website at revision ${page.revision}.`
      : `The page is live at revision ${page.revision}, but the delivery ledger has not recorded it. Check the delivery row.`
    : `This page exists as a ${page.state} and is not publicly readable.`;

  return {
    statusLabel,
    statusTone,
    summary,
    publicUrl,
    rows: [
      { label: "Slug", value: page.slug },
      { label: "Revision", value: `r${page.revision}` },
      { label: "Canonical URL", value: page.canonicalUrl, wrap: true },
      { label: "Meta title", value: page.metaTitle, wrap: true },
      { label: "Meta description", value: page.metaDescription, wrap: true },
      { label: "Published", value: formatDateTime(page.publishedAt) },
      { label: "Last updated", value: formatDateTime(page.updatedAt) },
      { label: "Delivery state", value: delivery?.state ?? null },
      {
        label: "Verified on readback",
        // What the adapter actually confirmed after writing, which is a
        // different claim from "we asked for published".
        value: delivery?.verified?.pageState
          ? `${delivery.verified.pageState}${
              delivery.verified.verifiedAt
                ? ` · ${formatDateTime(delivery.verified.verifiedAt)}`
                : ""
            }`
          : null,
      },
      {
        label: "In sitemap",
        value: isInSitemap(details) ? "Yes" : "No",
      },
      { label: "Primary keyword", value: brief?.primaryKeyword ?? null },
      { label: "Search intent", value: brief?.searchIntent ?? null, wrap: true },
      { label: "Latest change note", value: details.latestChangeNote, wrap: true },
    ],
  };
}
