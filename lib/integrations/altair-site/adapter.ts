import "server-only";

import {
  getSitePageById,
  listPublishedSlugsForCompany,
  publishSitePage,
} from "@/lib/database/queries/marketing-site-pages";
import type {
  FirstPartyAdapter,
  FirstPartyPublishInput,
  FirstPartyPublishOutcome,
} from "@/lib/integrations/port";
import {
  assertPublishableSitePage,
  buildArticleStructuredData,
  canonicalUrlFor,
  slugify,
  uniqueSlug,
} from "@/shared/types/site-page";
import { getAltairSiteConfig } from "./env";

/**
 * The Altair website adapter — the only first-party publisher.
 *
 * ====================== WHAT MAKES THIS DIFFERENT ======================
 * Every other adapter hands content to somebody else's API and cannot take
 * it back. This one writes a row in our own database, and the "publish" is
 * a page becoming readable by anonymous visitors under migration 187's RLS
 * policy. That difference is why the port gave it a named method instead of
 * widening `publish`: the arguments differ (SEO fields, an author, a change
 * note), and so does what a failure means.
 *
 * What is IDENTICAL, deliberately, is everything around it. The same kill
 * switch, the same recorded human approval, the same delivery ledger and the
 * same claim protocol. A first-party destination is not a shortcut past the
 * publishing controls; it is a different transport underneath them.
 *
 * ====================== IT THROWS ======================
 * Same contract as `publish`. The dispatcher's catch settles the delivery
 * `failed`; a returned union would be ignorable, and an ignored failure
 * strands the ledger row `in_flight`.
 */

class AltairSiteError extends Error {
  readonly code: string;
  constructor(code: string, detail?: string) {
    super(detail ? `Altair site publish failed (${code}): ${detail}` : `Altair site publish failed (${code})`);
    this.name = "AltairSiteError";
    this.code = code;
  }
}

export const altairSiteAdapter: FirstPartyAdapter = {
  provider: "altair_site",
  kind: "first_party",

  async publishFirstParty(
    input: FirstPartyPublishInput,
  ): Promise<FirstPartyPublishOutcome> {
    const config = getAltairSiteConfig();

    // -------------------------------------------------------- 1. the slug
    // A slug supplied by the package wins; otherwise it is derived from the
    // title. Either way it must survive `uniqueSlug` against the slugs
    // already published, so a second article with the same title lands at
    // its own address rather than overwriting the first.
    // A page is a titled thing. `PublishPackage.title` is nullable because
    // some providers render only a body, so the absence is refused here
    // rather than defaulted — an untitled article has no headline, no meta
    // title and nothing to derive a slug from.
    const title = input.package.title?.trim();
    if (!title) {
      throw new AltairSiteError(
        "no_title",
        "a site page needs a title and this package has none",
      );
    }

    const desired =
      (input.seo.slug && input.seo.slug.trim()) || slugify(title);

    if (!desired) {
      throw new AltairSiteError(
        "no_usable_slug",
        "the title produced no usable URL segment",
      );
    }

    const publishedSlugs = await listPublishedSlugsForCompany(
      input.post.companyId,
    );

    // The page THIS package already owns keeps its slug — a revision must
    // not be pushed to a new address, or the original URL goes stale and the
    // two compete. Only a genuinely new page needs disambiguating.
    const ownSlug = publishedSlugs.includes(desired) ? desired : null;
    const taken = new Set(publishedSlugs);
    const slug = ownSlug ?? uniqueSlug(desired, taken);

    if (!slug) {
      throw new AltairSiteError(
        "slug_exhausted",
        "too many pages compete for this slug",
      );
    }

    // ----------------------------------------------------- 2. the metadata
    const canonicalUrl = canonicalUrlFor(config.siteOrigin, slug);
    if (!canonicalUrl) {
      throw new AltairSiteError("invalid_site_origin");
    }

    const metaTitle = input.seo.metaTitle?.trim() || title.slice(0, 70);
    // Required to publish, and NOT derived from the body: a description
    // auto-cut from an article opening reads like a truncated sentence in
    // a search result. The package supplies one or the page stays a draft.
    const metaDescription = input.seo.metaDescription?.trim();
    if (!metaDescription) {
      throw new AltairSiteError(
        "no_meta_description",
        "a published page needs a meta description and this package has none",
      );
    }

    const draft = {
      slug,
      title,
      metaTitle,
      metaDescription,
      // Always derived, never taken from the package: a canonical is the one
      // field where accepting an upstream value would let a generator point
      // this page's ranking at an address we do not control.
      canonicalUrl,
      bodyMarkdown: input.package.body,
      internalLinks: [...input.internalLinks],
      keywords: [...input.seo.keywords],
    };

    // -------------------------------------------------- 3. the publishable
    // gate. Thin bodies, missing metadata, dead internal links and canonical
    // mismatches are all refused HERE, before anything becomes public.
    const verdict = assertPublishableSitePage({
      draft,
      siteOrigin: config.siteOrigin,
      // A page may link to any published page INCLUDING one it is revising,
      // so its own slug counts as existing.
      existingSlugs: new Set([...publishedSlugs, slug]),
    });

    if (!verdict.ok) {
      throw new AltairSiteError(verdict.code, verdict.detail);
    }

    // ------------------------------------------------------- 4. the write
    const structuredData = buildArticleStructuredData({
      title: draft.title,
      metaDescription,
      canonicalUrl,
      publishedAt: input.nowIso,
      updatedAt: input.nowIso,
      publisherName: config.publisherName,
    });

    const written = await publishSitePage({
      companyId: input.post.companyId,
      contentPackageId: input.contentPackageId,
      slug,
      title: draft.title,
      metaTitle,
      metaDescription,
      canonicalUrl,
      bodyMarkdown: draft.bodyMarkdown,
      structuredData,
      internalLinks: draft.internalLinks,
      keywords: draft.keywords,
      publishedBy: input.publishedBy,
      nowIso: input.nowIso,
      changeNote: input.changeNote,
    });

    if (written.error || !written.page) {
      throw new AltairSiteError("write_failed", written.error);
    }

    const page = written.page;

    // ---------------------------------------------------- 5. the readback
    // The same discipline the YouTube adapter applies, and for the same
    // reason: a write that succeeded is not a publish that is live. Here the
    // question is whether the row actually reads back as `published` with
    // the address and canonical we intended — a CHECK constraint or a
    // partial write could leave it otherwise, and recording success for a
    // page nobody can reach would be trusted by every later reconciliation.
    const readback = await getSitePageById(page.id);

    if (!readback) {
      throw new AltairSiteError(
        "readback_missing",
        "the page could not be read back after writing",
      );
    }
    if (readback.pageState !== "published") {
      throw new AltairSiteError("readback_not_published", readback.pageState);
    }
    if (readback.slug !== slug || readback.canonicalUrl !== canonicalUrl) {
      throw new AltairSiteError("readback_address_mismatch");
    }

    return {
      outcome: "posted",
      providerPostId: readback.id,
      providerPermalink: canonicalUrl,
      created: written.created === true,
      revision: readback.revision,
      providerResult: {
        slug: readback.slug,
        canonicalUrl: readback.canonicalUrl,
        pageState: readback.pageState,
        revision: readback.revision,
        created: written.created === true,
      },
    };
  },
};
