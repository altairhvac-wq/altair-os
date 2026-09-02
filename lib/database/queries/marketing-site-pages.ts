import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient as createReadClient } from "@/lib/supabase/server";
import type { SitePageState } from "@/shared/types/site-page";
import type { SitePublishingDetails } from "@/shared/types/site-publishing-details";

/**
 * Reads and writes for the Altair site's pages (migration 187).
 *
 * ============ TWO CLIENTS, ON PURPOSE ============
 * The PUBLIC read uses the ordinary anon-key client and relies on RLS: the
 * `anyone can read published site pages` policy is what makes a draft
 * invisible, and reading the public page through the service role would
 * bypass the one control that keeps unreleased copy off the internet. Every
 * WRITE uses the service role, because publishing is authorized in the action
 * that calls it and no browser may write here at all.
 */

type SitePageRow = {
  id: string;
  company_id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  body_markdown: string;
  structured_data: Record<string, unknown> | null;
  internal_links: string[] | null;
  keywords: string[] | null;
  content_package_id: string | null;
  page_state: SitePageState;
  published_at: string | null;
  revision: number;
  created_by: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SitePage = {
  id: string;
  companyId: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  bodyMarkdown: string;
  structuredData: Record<string, unknown>;
  internalLinks: string[];
  keywords: string[];
  contentPackageId: string | null;
  pageState: SitePageState;
  publishedAt: string | null;
  revision: number;
  createdBy: string | null;
  publishedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

const PAGE_SELECT =
  "id, company_id, slug, title, meta_title, meta_description, canonical_url, body_markdown, structured_data, internal_links, keywords, content_package_id, page_state, published_at, revision, created_by, published_by, created_at, updated_at";

type AnyClient = ReturnType<typeof createServiceRoleClient>;

function sitePagesTable(client: AnyClient) {
  // marketing_site_pages: migration 187 — wire into Database types on next gen types run
  return (
    client as AnyClient & {
      from(table: "marketing_site_pages"): ReturnType<AnyClient["from"]>;
    }
  ).from("marketing_site_pages");
}

function revisionsTable(client: AnyClient) {
  // marketing_site_page_revisions: migration 187 — wire into Database types on next gen types run
  return (
    client as AnyClient & {
      from(table: "marketing_site_page_revisions"): ReturnType<AnyClient["from"]>;
    }
  ).from("marketing_site_page_revisions");
}

function toPage(row: SitePageRow): SitePage {
  return {
    id: row.id,
    companyId: row.company_id,
    slug: row.slug,
    title: row.title,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    bodyMarkdown: row.body_markdown,
    structuredData: row.structured_data ?? {},
    internalLinks: row.internal_links ?? [],
    keywords: row.keywords ?? [],
    contentPackageId: row.content_package_id,
    pageState: row.page_state,
    publishedAt: row.published_at,
    revision: row.revision,
    createdBy: row.created_by,
    publishedBy: row.published_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* --------------------------------------------------------------- public */

/**
 * One published page by slug, read as an anonymous visitor would.
 *
 * Uses the RLS-bound client deliberately: if the `published` policy ever
 * regressed, this read would start returning drafts, and a verifier can
 * prove the policy by calling this rather than by reading SQL.
 */
export async function getPublishedSitePageBySlug(
  slug: string,
): Promise<SitePage | null> {
  const supabase = await createReadClient();
  const { data, error } = await sitePagesTable(supabase as unknown as AnyClient)
    .select(PAGE_SELECT)
    .eq("slug", slug)
    .eq("page_state", "published")
    .maybeSingle();

  if (error) {
    console.error("[getPublishedSitePageBySlug] read failed:", {
      slug,
      code: error.code,
    });
    return null;
  }

  return data ? toPage(data as SitePageRow) : null;
}

/** Every published page, for the sitemap and for internal-link validation. */
export async function listPublishedSitePages(): Promise<SitePage[]> {
  const supabase = await createReadClient();
  const { data, error } = await sitePagesTable(supabase as unknown as AnyClient)
    .select(PAGE_SELECT)
    .eq("page_state", "published")
    .order("published_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[listPublishedSitePages] read failed:", { code: error.code });
    return [];
  }

  return (data ?? []).map((row: unknown) => toPage(row as SitePageRow));
}

/* -------------------------------------------------------------- internal */

/** Published slugs for one company — the internal-link validation set. */
export async function listPublishedSlugsForCompany(
  companyId: string,
): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await sitePagesTable(supabase)
    .select("slug")
    .eq("company_id", companyId)
    .eq("page_state", "published")
    .limit(1000);

  if (error) {
    console.error("[listPublishedSlugsForCompany] read failed:", {
      companyId,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row: unknown) => (row as { slug: string }).slug);
}

export async function getSitePageForPackage(input: {
  companyId: string;
  contentPackageId: string;
}): Promise<SitePage | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await sitePagesTable(supabase)
    .select(PAGE_SELECT)
    .eq("company_id", input.companyId)
    .eq("content_package_id", input.contentPackageId)
    .maybeSingle();

  if (error) {
    console.error("[getSitePageForPackage] read failed:", { code: error.code });
    return null;
  }

  return data ? toPage(data as SitePageRow) : null;
}

export async function getSitePageById(id: string): Promise<SitePage | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await sitePagesTable(supabase)
    .select(PAGE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data ? toPage(data as SitePageRow) : null;
}

export type PublishSitePageInput = {
  companyId: string;
  contentPackageId: string | null;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  bodyMarkdown: string;
  structuredData: Record<string, unknown>;
  internalLinks: string[];
  keywords: string[];
  publishedBy: string;
  nowIso: string;
  /** Recorded on the revision so a change to a live URL says why. */
  changeNote: string | null;
};

/**
 * Publish a page, or publish a REVISION of one that already exists.
 *
 * ============ WHY THIS IS AN UPDATE, NOT AN INSERT ============
 * The slug is the identity (migration 187's `unique (company_id, slug)`), and
 * a published slug is an address that may already be linked to and indexed.
 * A second publish of the same content must therefore land on the SAME row —
 * a retry that minted a new page would leave the first one live at its own
 * URL, and the two would compete for the same search results. That is the
 * first-party equivalent of the duplicate post 143's constraint prevents.
 *
 * The revision counter is bumped and a snapshot appended on every publish, so
 * the fact that a live page changed is recoverable afterwards.
 */
export async function publishSitePage(
  input: PublishSitePageInput,
): Promise<{ page?: SitePage; created?: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const { data: existingRow, error: lookupError } = await sitePagesTable(supabase)
    .select(PAGE_SELECT)
    .eq("company_id", input.companyId)
    .eq("slug", input.slug)
    .maybeSingle();

  if (lookupError) {
    return {
      error: mapDatabaseError(lookupError) ?? "Could not look up the page.",
    };
  }

  const existing = existingRow ? toPage(existingRow as SitePageRow) : null;

  // A slug already owned by a DIFFERENT package is a collision, not a
  // revision. Overwriting it would silently replace one article with another
  // at an address the first one still expects to hold.
  if (
    existing &&
    input.contentPackageId &&
    existing.contentPackageId &&
    existing.contentPackageId !== input.contentPackageId
  ) {
    return {
      error:
        "That slug already belongs to a different content package. Choose another slug.",
    };
  }

  const revision = existing ? existing.revision + 1 : 1;

  const payload = {
    company_id: input.companyId,
    content_package_id: input.contentPackageId,
    slug: input.slug,
    title: input.title,
    meta_title: input.metaTitle,
    meta_description: input.metaDescription,
    canonical_url: input.canonicalUrl,
    body_markdown: input.bodyMarkdown,
    structured_data: input.structuredData,
    internal_links: input.internalLinks,
    keywords: input.keywords,
    page_state: "published" as const,
    published_at: existing?.publishedAt ?? input.nowIso,
    revision,
    published_by: input.publishedBy,
  };

  const write = existing
    ? await sitePagesTable(supabase)
        .update(payload)
        .eq("id", existing.id)
        .select(PAGE_SELECT)
        .single()
    : await sitePagesTable(supabase)
        .insert({ ...payload, created_by: input.publishedBy })
        .select(PAGE_SELECT)
        .single();

  if (write.error || !write.data) {
    console.error("[publishSitePage] write failed:", {
      companyId: input.companyId,
      slug: input.slug,
      code: write.error?.code,
    });
    return {
      error: mapDatabaseError(write.error) ?? "Could not publish the page.",
    };
  }

  const page = toPage(write.data as SitePageRow);

  // The audit trail. Appended AFTER the page write so a revision can never
  // describe a state the page never reached; a failure here is logged and
  // does not un-publish a live page.
  const revisionWrite = await revisionsTable(supabase).insert({
    company_id: input.companyId,
    page_id: page.id,
    revision: page.revision,
    title: page.title,
    slug: page.slug,
    meta_title: page.metaTitle,
    meta_description: page.metaDescription,
    canonical_url: page.canonicalUrl,
    body_markdown: page.bodyMarkdown,
    structured_data: page.structuredData,
    change_note: input.changeNote,
    published_by: input.publishedBy,
  });

  if (revisionWrite.error) {
    console.error("[publishSitePage] revision not recorded:", {
      pageId: page.id,
      revision: page.revision,
      code: revisionWrite.error.code,
    });
  }

  return { page, created: existing === null };
}

/* ------------------------------------------- the Marketing editor panel */

/**
 * Everything the Marketing editor shows about ONE website post's
 * publication, assembled from rows that already exist.
 *
 * ============ THE JOIN IS THE PACKAGE, NOT THE TITLE ============
 * A post reaches its page through `marketing_posts.content_package_id` ->
 * `marketing_site_pages.content_package_id`. That column existed on the post
 * row since migration 182 and was dropped by the mapper, which is why this
 * looked unlinkable and why the temptation was to match on title or slug.
 * Matching on either is a guess: two posts can share a title, a slug can be
 * disambiguated to `-2`, and neither is a key.
 *
 * A post with no package has no page, and says so.
 *
 * ============ COMPANY SCOPING ============
 * Every read is filtered on the caller's `companyId`, on top of the service
 * role's own lack of RLS. A page belonging to another company cannot be
 * reached even by passing its package id, because the package id is only
 * ever taken from a post this company owns.
 */
export async function getSitePublishingDetailsForPost(input: {
  companyId: string;
  marketingPostId: string;
  contentPackageId: string | null;
}): Promise<SitePublishingDetails> {
  const supabase = createServiceRoleClient();

  const empty: SitePublishingDetails = {
    page: null,
    delivery: null,
    brief: null,
    latestChangeNote: null,
  };

  // The delivery is keyed by the POST, so it exists even when a publish
  // failed before a page was ever written — which is exactly the state worth
  // showing rather than an empty card.
  const deliveryRead = await deliveriesForSite(supabase)
    .select("delivery_state, settled_at, failure_detail, provider_result")
    .eq("company_id", input.companyId)
    .eq("marketing_post_id", input.marketingPostId)
    .eq("provider", "altair_site")
    .maybeSingle();

  const deliveryRow = deliveryRead.data as
    | {
        delivery_state: string;
        settled_at: string | null;
        failure_detail: string | null;
        provider_result: Record<string, unknown> | null;
      }
    | null;

  const result = deliveryRow?.provider_result ?? null;
  const asString = (v: unknown) => (typeof v === "string" ? v : null);
  const asNumber = (v: unknown) => (typeof v === "number" ? v : null);

  const delivery: SitePublishingDetails["delivery"] = deliveryRow
    ? {
        state: deliveryRow.delivery_state,
        settledAt: deliveryRow.settled_at,
        failureDetail: deliveryRow.failure_detail,
        verified: result
          ? {
              slug: asString(result.slug),
              pageState: asString(result.pageState),
              canonicalUrl: asString(result.canonicalUrl),
              revision: asNumber(result.revision),
              verifiedAt: asString(result.verifiedAt),
            }
          : null,
      }
    : null;

  if (!input.contentPackageId) {
    return { ...empty, delivery };
  }

  const pageRead = await sitePagesTable(supabase)
    .select(PAGE_SELECT)
    .eq("company_id", input.companyId)
    .eq("content_package_id", input.contentPackageId)
    .maybeSingle();

  const page = pageRead.data ? toPage(pageRead.data as SitePageRow) : null;

  // The brief is the package's own jsonb. Read defensively: it is written by
  // whatever produced the package, so nothing here may assume a shape.
  const packageRead = await contentPackagesForSite(supabase)
    .select("brief")
    .eq("company_id", input.companyId)
    .eq("id", input.contentPackageId)
    .maybeSingle();

  const briefRaw =
    (packageRead.data as { brief?: Record<string, unknown> } | null)?.brief ??
    null;

  const brief = briefRaw
    ? {
        primaryKeyword: asString(briefRaw.primaryKeyword),
        searchIntent: asString(briefRaw.searchIntent),
      }
    : null;

  let latestChangeNote: string | null = null;
  if (page) {
    const revisionRead = await revisionsTable(supabase)
      .select("change_note")
      .eq("company_id", input.companyId)
      .eq("page_id", page.id)
      .order("revision", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestChangeNote =
      (revisionRead.data as { change_note: string | null } | null)
        ?.change_note ?? null;
  }

  return {
    page: page
      ? {
          id: page.id,
          slug: page.slug,
          state: page.pageState,
          revision: page.revision,
          canonicalUrl: page.canonicalUrl,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
          publishedAt: page.publishedAt,
          updatedAt: page.updatedAt,
        }
      : null,
    delivery,
    brief,
    latestChangeNote,
  };
}

function deliveriesForSite(client: AnyClient) {
  // marketing_channel_deliveries: migration 143 — wire into Database types on next gen types run
  return (
    client as AnyClient & {
      from(table: "marketing_channel_deliveries"): ReturnType<AnyClient["from"]>;
    }
  ).from("marketing_channel_deliveries");
}

function contentPackagesForSite(client: AnyClient) {
  // marketing_content_packages: migration 182 — wire into Database types on next gen types run
  return (
    client as AnyClient & {
      from(table: "marketing_content_packages"): ReturnType<AnyClient["from"]>;
    }
  ).from("marketing_content_packages");
}
