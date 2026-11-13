import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  DIRECTORY_CONSENT_TEXT,
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_RESERVED_SLUGS,
  buildListingSlug,
  changedListingFields,
  isDirectoryReportReason,
  isValidListingSlug,
  validateListingInput,
  type DirectoryFieldKey,
  type DirectoryListingFields,
  type DirectoryListingStatus,
  type DirectoryPublicListing,
  type DirectoryReportReason,
  type DirectorySearch,
} from "@/shared/types/directory";
import { normalizeNetworkTradeType } from "@/shared/types/network";

/**
 * Reads and writes for the public contractor directory (migration 210).
 *
 * ============ TWO KINDS OF CALLER ============
 * PUBLIC READS (`searchPublicListings`, `getPublicListing`,
 * `listPublishedListingPaths`) go through the database functions, which
 * return only the public columns of published listings. Nothing here can
 * widen that: a private column is not in what the function returns.
 *
 * EVERYTHING ELSE reads or writes rows directly with the service role, and
 * must only be called after the caller has been authorised:
 *   - a lister, by the signed link from their email (lib/directory/links.ts);
 *   - the owner, by the platform-admin check in the Server Action.
 * This module does not check either. It is the data layer; the actions in
 * app/actions/directory.ts and app/actions/platform-directory.ts are the
 * boundary.
 *
 * Errors are logged by code only. A lister's email address, business name or
 * phone number is never written to a log.
 */

type Row = {
  id: string;
  slug: string;
  business_name: string;
  trade_type: string;
  city: string;
  state: string;
  postal_code: string | null;
  service_area: string;
  phone: string;
  website: string | null;
  description: string;
  accepts_sub_work: boolean;
  contact_email: string;
  status: DirectoryListingStatus;
  pending_changes: Record<string, unknown> | null;
  email_confirmed_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const ROW_COLUMNS =
  "id, slug, business_name, trade_type, city, state, postal_code, service_area, phone, website, description, accepts_sub_work, contact_email, status, pending_changes, email_confirmed_at, reviewed_at, review_note, published_at, created_at, updated_at";

/** A stored listing as the lister and the owner see it. Includes the private email. */
export type DirectoryListingRecord = {
  id: string;
  slug: string;
  status: DirectoryListingStatus;
  fields: DirectoryListingFields;
  /** A proposed edit to a published listing, already validated; null when there is none. */
  pendingFields: DirectoryListingFields | null;
  pendingChangedKeys: DirectoryFieldKey[];
  contactEmail: string;
  reviewNote: string | null;
  emailConfirmedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function logFailure(what: string, error: unknown): void {
  const code = (error as { code?: string } | null)?.code ?? "unknown";
  console.error(`[directory] ${what} failed:`, { code });
}

function rowFields(row: Pick<Row, "business_name" | "trade_type" | "city" | "state" | "postal_code" | "service_area" | "phone" | "website" | "description" | "accepts_sub_work">): DirectoryListingFields {
  return {
    businessName: row.business_name,
    tradeType: normalizeNetworkTradeType(row.trade_type),
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    serviceArea: row.service_area,
    phone: row.phone,
    website: row.website,
    description: row.description,
    acceptsSubWork: row.accepts_sub_work,
  };
}

function fieldColumns(fields: DirectoryListingFields) {
  return {
    business_name: fields.businessName,
    trade_type: fields.tradeType,
    city: fields.city,
    state: fields.state,
    postal_code: fields.postalCode,
    service_area: fields.serviceArea,
    phone: fields.phone,
    website: fields.website,
    description: fields.description,
    accepts_sub_work: fields.acceptsSubWork,
  };
}

function toRecord(row: Row): DirectoryListingRecord {
  const fields = rowFields(row);
  // A stored pending change is validated again on the way out: it is shown to
  // the owner and may be published, so it gets the same check as a new form.
  let pendingFields: DirectoryListingFields | null = null;
  if (row.pending_changes) {
    const checked = validateListingInput(row.pending_changes);
    if (checked.ok) pendingFields = checked.fields;
  }
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    fields,
    pendingFields,
    pendingChangedKeys: pendingFields ? changedListingFields(fields, pendingFields) : [],
    contactEmail: row.contact_email,
    reviewNote: row.review_note,
    emailConfirmedAt: row.email_confirmed_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ------------------------------------------------------------------ public reads

type PublicRow = {
  slug?: unknown;
  business_name?: unknown;
  trade_type?: unknown;
  city?: unknown;
  state?: unknown;
  postal_code?: unknown;
  service_area?: unknown;
  phone?: unknown;
  website?: unknown;
  description?: unknown;
  accepts_sub_work?: unknown;
  published_at?: unknown;
  is_member?: unknown;
};

const text = (value: unknown): string => (typeof value === "string" ? value : "");

function toPublicListing(row: PublicRow): DirectoryPublicListing | null {
  if (!isValidListingSlug(row.slug) || !text(row.business_name)) return null;
  return {
    slug: row.slug,
    businessName: text(row.business_name),
    tradeType: normalizeNetworkTradeType(text(row.trade_type)),
    city: text(row.city),
    state: text(row.state),
    postalCode: typeof row.postal_code === "string" ? row.postal_code : null,
    serviceArea: text(row.service_area),
    phone: text(row.phone),
    website: typeof row.website === "string" && row.website.startsWith("https://") ? row.website : null,
    description: text(row.description),
    acceptsSubWork: row.accepts_sub_work === true,
    publishedAt: typeof row.published_at === "string" ? row.published_at : null,
    // Absent before migration 211 is applied, which reads as "not a member".
    isMember: row.is_member === true,
  };
}

export type DirectorySearchResult = {
  listings: DirectoryPublicListing[];
  total: number;
  /** False when the directory could not be read (migration 210 missing, or an outage). */
  available: boolean;
};

export async function searchPublicListings(search: DirectorySearch): Promise<DirectorySearchResult> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("directory_search_listings", {
      p_trade: search.trade,
      p_state: search.state,
      p_place: search.place,
      p_sub_only: search.subOnly,
      p_limit: DIRECTORY_PAGE_SIZE,
      p_offset: (search.page - 1) * DIRECTORY_PAGE_SIZE,
    });
    if (error) throw error;
    const result = (data ?? {}) as { total?: unknown; rows?: unknown };
    const rows = Array.isArray(result.rows) ? (result.rows as PublicRow[]) : [];
    return {
      listings: rows.map(toPublicListing).filter((listing): listing is DirectoryPublicListing => listing !== null),
      total: Number.isFinite(Number(result.total)) ? Number(result.total) : 0,
      available: true,
    };
  } catch (error) {
    logFailure("search", error);
    return { listings: [], total: 0, available: false };
  }
}

/** One published listing, with its id for server-side use (filing a report). Null when not published. */
export async function getPublicListing(
  slug: string,
): Promise<{ listing: DirectoryPublicListing; id: string; updatedAt: string | null } | null> {
  if (!isValidListingSlug(slug)) return null;
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("directory_public_listing", { p_slug: slug });
    if (error) throw error;
    if (!data || typeof data !== "object") return null;
    const row = data as PublicRow & { id?: unknown; updated_at?: unknown };
    const listing = toPublicListing(row);
    if (!listing || typeof row.id !== "string") return null;
    return { listing, id: row.id, updatedAt: typeof row.updated_at === "string" ? row.updated_at : null };
  } catch (error) {
    logFailure("public listing read", error);
    return null;
  }
}

/**
 * Public listings for the signed-in Community directory: the same published
 * listings, through the same function, so a member sees exactly what the
 * public page shows and nothing more. The first page only; `total` says how
 * many there are so the screen can point to the full public search.
 */
export async function listListingsForCommunity(): Promise<{ listings: DirectoryPublicListing[]; total: number }> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("directory_search_listings", { p_limit: 50, p_offset: 0 });
    if (error) throw error;
    const result = (data ?? {}) as { total?: unknown; rows?: unknown };
    const rows = Array.isArray(result.rows) ? (result.rows as PublicRow[]) : [];
    return {
      listings: rows.map(toPublicListing).filter((listing): listing is DirectoryPublicListing => listing !== null),
      total: Number.isFinite(Number(result.total)) ? Number(result.total) : 0,
    };
  } catch (error) {
    logFailure("community list", error);
    return { listings: [], total: 0 };
  }
}

export async function listPublishedListingPaths(): Promise<{ slug: string; updatedAt: string | null }[]> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("directory_published_paths");
    if (error) throw error;
    const rows = Array.isArray(data) ? (data as { slug?: unknown; updated_at?: unknown }[]) : [];
    return rows
      .filter((row): row is { slug: string; updated_at?: unknown } => isValidListingSlug(row.slug))
      .map((row) => ({ slug: row.slug, updatedAt: typeof row.updated_at === "string" ? row.updated_at : null }));
  } catch (error) {
    logFailure("published paths read", error);
    return [];
  }
}

// ------------------------------------------------------------------ the lister

export type CreateListingOutcome =
  /** A new or refreshed listing is waiting for its email to be confirmed. */
  | { status: "created"; id: string }
  /** This inbox already has this business waiting for review or live. */
  | { status: "exists"; id: string; listingStatus: DirectoryListingStatus }
  | { status: "unavailable" };

/**
 * Stores a submitted listing as `pending_email`. `fields` and `contactEmail`
 * must already be validated. The same business from the same inbox does not
 * make a second row: one still waiting for its email is refreshed with the
 * new details, and one already confirmed is reported as existing.
 */
export async function createListing(fields: DirectoryListingFields, contactEmail: string): Promise<CreateListingOutcome> {
  try {
    const supabase = createServiceRoleClient();

    const existing = await supabase
      .from("directory_listings")
      .select("id, status")
      .eq("contact_email", contactEmail)
      .ilike("business_name", fields.businessName.replace(/[\\%_]/g, (char) => `\\${char}`))
      .in("status", ["pending_email", "pending_review", "published"])
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) {
      if (existing.data.status !== "pending_email") {
        return { status: "exists", id: existing.data.id, listingStatus: existing.data.status };
      }
      const refreshed = await supabase
        .from("directory_listings")
        .update({ ...fieldColumns(fields), consent_text: DIRECTORY_CONSENT_TEXT })
        .eq("id", existing.data.id)
        .eq("status", "pending_email");
      if (refreshed.error) throw refreshed.error;
      return { status: "created", id: existing.data.id };
    }

    const base = buildListingSlug(fields.businessName, fields.city, fields.state);
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base.slice(0, 90)}-${attempt}`;
      if (DIRECTORY_RESERVED_SLUGS.includes(candidate)) continue;
      const inserted = await supabase
        .from("directory_listings")
        .insert({
          ...fieldColumns(fields),
          slug: candidate,
          contact_email: contactEmail,
          consent_text: DIRECTORY_CONSENT_TEXT,
        })
        .select("id")
        .single();
      if (!inserted.error) return { status: "created", id: inserted.data.id };
      // 23505: the slug is taken (try the next), or two submissions of the
      // same business raced (the other one won; report it as created).
      if (inserted.error.code !== "23505") throw inserted.error;
      if (/one_per_inbox/.test(inserted.error.message ?? "")) {
        const other = await supabase
          .from("directory_listings")
          .select("id")
          .eq("contact_email", contactEmail)
          .ilike("business_name", fields.businessName.replace(/[\\%_]/g, (char) => `\\${char}`))
          .in("status", ["pending_email", "pending_review", "published"])
          .maybeSingle();
        if (other.data) return { status: "created", id: other.data.id };
      }
    }
    return { status: "unavailable" };
  } catch (error) {
    logFailure("create", error);
    return { status: "unavailable" };
  }
}

export async function getListingRecord(id: string): Promise<DirectoryListingRecord | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from("directory_listings").select(ROW_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toRecord(data as Row) : null;
  } catch (error) {
    logFailure("record read", error);
    return null;
  }
}

export type ListingChangeOutcome = "done" | "not_found" | "not_allowed" | "unavailable";

export type ConfirmEmailOutcome = "confirmed" | "already" | "not_found" | "not_allowed" | "unavailable";

/**
 * pending_email -> pending_review. "confirmed" only the first time, so the
 * owner is told about a new listing once; pressing the button again later is
 * "already".
 */
export async function confirmListingEmail(id: string): Promise<ConfirmEmailOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const updated = await supabase
      .from("directory_listings")
      .update({ status: "pending_review", email_confirmed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending_email")
      .select("id");
    if (updated.error) throw updated.error;
    if (updated.data.length > 0) return "confirmed";
    const current = await supabase.from("directory_listings").select("status").eq("id", id).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) return "not_found";
    return current.data.status === "removed" ? "not_allowed" : "already";
  } catch (error) {
    logFailure("email confirm", error);
    return "unavailable";
  }
}

export type SaveEditOutcome =
  /** The change is live in the row (the listing was not public yet). */
  | { status: "saved" }
  /** The listing is public: the change waits for the owner; the live listing is unchanged. */
  | { status: "awaiting_review" }
  | { status: "no_change" }
  | { status: "not_found" | "not_allowed" | "unavailable" };

/**
 * Saves a lister's edit. `fields` must already be validated.
 *
 * Not public yet (waiting for email or review, or declined): the row is
 * updated in place, and a declined listing goes back to the review queue.
 * Public: the edit is stored as `pending_changes` and the page keeps showing
 * what was approved until the owner approves the change.
 */
export async function saveListingEdit(id: string, fields: DirectoryListingFields): Promise<SaveEditOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const current = await supabase.from("directory_listings").select(ROW_COLUMNS).eq("id", id).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) return { status: "not_found" };
    const row = current.data as Row;
    if (row.status === "removed") return { status: "not_allowed" };

    const live = rowFields(row);
    const changed = changedListingFields(live, fields);

    if (row.status === "published") {
      const next = changed.length === 0 ? null : (fields as unknown as Record<string, unknown>);
      if (next === null && row.pending_changes === null) return { status: "no_change" };
      const updated = await supabase
        .from("directory_listings")
        .update({ pending_changes: next })
        .eq("id", id)
        .eq("status", "published");
      if (updated.error) throw updated.error;
      return next === null ? { status: "no_change" } : { status: "awaiting_review" };
    }

    if (changed.length === 0 && row.status !== "rejected") return { status: "no_change" };
    const updated = await supabase
      .from("directory_listings")
      .update({
        ...fieldColumns(fields),
        pending_changes: null,
        // A declined listing that has been corrected is looked at again.
        ...(row.status === "rejected" ? { status: "pending_review" as const, review_note: null } : {}),
      })
      .eq("id", id)
      .eq("status", row.status);
    if (updated.error) throw updated.error;
    return { status: "saved" };
  } catch (error) {
    logFailure("edit save", error);
    return { status: "unavailable" };
  }
}

/** Takes a listing down. The lister's own choice, so it is immediate. */
export async function removeListing(id: string): Promise<ListingChangeOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const updated = await supabase
      .from("directory_listings")
      .update({ status: "removed", removed_at: new Date().toISOString(), pending_changes: null })
      .eq("id", id)
      .neq("status", "removed")
      .select("id");
    if (updated.error) throw updated.error;
    if (updated.data.length > 0) return "done";
    const current = await supabase.from("directory_listings").select("id").eq("id", id).maybeSingle();
    return current.data ? "done" : "not_found";
  } catch (error) {
    logFailure("remove", error);
    return "unavailable";
  }
}

/** Listings that belong to this inbox and still exist, for "email me my manage link". */
export async function findListingsForEmail(contactEmail: string): Promise<{ id: string; businessName: string; status: DirectoryListingStatus }[]> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("directory_listings")
      .select("id, business_name, status")
      .eq("contact_email", contactEmail)
      .neq("status", "removed")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, businessName: row.business_name, status: row.status }));
  } catch (error) {
    logFailure("lookup by email", error);
    return [];
  }
}

export async function createListingReport(listingId: string, reason: DirectoryReportReason, note: string): Promise<boolean> {
  if (!isDirectoryReportReason(reason)) return false;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("directory_listing_reports").insert({ listing_id: listingId, reason, note });
    if (error) throw error;
    return true;
  } catch (error) {
    logFailure("report", error);
    return false;
  }
}

// ------------------------------------------------------------------ the owner

export type DirectoryReviewItem = DirectoryListingRecord & {
  openReports: { id: string; reason: DirectoryReportReason; note: string; createdAt: string }[];
};

export type DirectoryReviewData = {
  /** Null when the directory tables are not there yet (migration 210 not applied). */
  items: DirectoryReviewItem[] | null;
  counts: Record<DirectoryListingStatus, number>;
};

const EMPTY_COUNTS: Record<DirectoryListingStatus, number> = {
  pending_email: 0,
  pending_review: 0,
  published: 0,
  rejected: 0,
  removed: 0,
};

/** Everything the review screen shows: every listing that still exists, with its open reports. */
export async function listListingsForReview(): Promise<DirectoryReviewData> {
  try {
    const supabase = createServiceRoleClient();
    const [listings, reports] = await Promise.all([
      supabase.from("directory_listings").select(ROW_COLUMNS).order("created_at", { ascending: false }).limit(500),
      supabase
        .from("directory_listing_reports")
        .select("id, listing_id, reason, note, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (listings.error) throw listings.error;
    if (reports.error) throw reports.error;

    const counts = { ...EMPTY_COUNTS };
    const byListing = new Map<string, DirectoryReviewItem["openReports"]>();
    for (const report of reports.data ?? []) {
      const list = byListing.get(report.listing_id) ?? [];
      list.push({ id: report.id, reason: report.reason, note: report.note, createdAt: report.created_at });
      byListing.set(report.listing_id, list);
    }
    const items = (listings.data as Row[]).map((row) => {
      counts[row.status] += 1;
      return { ...toRecord(row), openReports: byListing.get(row.id) ?? [] };
    });
    return { items, counts };
  } catch (error) {
    logFailure("review list", error);
    return { items: null, counts: { ...EMPTY_COUNTS } };
  }
}

export type ReviewOutcome =
  | { status: "done"; record: DirectoryListingRecord }
  | { status: "not_found" | "not_allowed" | "unavailable" };

async function reload(id: string): Promise<ReviewOutcome> {
  const record = await getListingRecord(id);
  return record ? { status: "done", record } : { status: "unavailable" };
}

/** pending_review (or a declined listing) -> published. */
export async function approveListing(id: string, reviewerId: string): Promise<ReviewOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const updated = await supabase
      .from("directory_listings")
      .update({ status: "published", published_at: now, reviewed_at: now, reviewed_by: reviewerId, review_note: null })
      .eq("id", id)
      .in("status", ["pending_review", "rejected"])
      .not("email_confirmed_at", "is", null)
      .select("id");
    if (updated.error) throw updated.error;
    if (updated.data.length === 0) {
      const current = await supabase.from("directory_listings").select("id").eq("id", id).maybeSingle();
      return { status: current.data ? "not_allowed" : "not_found" };
    }
    return reload(id);
  } catch (error) {
    logFailure("approve", error);
    return { status: "unavailable" };
  }
}

/** Declines a listing that is waiting, with an optional note for the lister. */
export async function rejectListing(id: string, reviewerId: string, note: string | null): Promise<ReviewOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const updated = await supabase
      .from("directory_listings")
      .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: reviewerId, review_note: note })
      .eq("id", id)
      .eq("status", "pending_review")
      .select("id");
    if (updated.error) throw updated.error;
    if (updated.data.length === 0) {
      const current = await supabase.from("directory_listings").select("id").eq("id", id).maybeSingle();
      return { status: current.data ? "not_allowed" : "not_found" };
    }
    return reload(id);
  } catch (error) {
    logFailure("reject", error);
    return { status: "unavailable" };
  }
}

/** Publishes a waiting edit: the pending fields become the live ones. */
export async function approveListingChanges(id: string, reviewerId: string): Promise<ReviewOutcome> {
  try {
    const record = await getListingRecord(id);
    if (!record) return { status: "not_found" };
    if (record.status !== "published" || !record.pendingFields) return { status: "not_allowed" };
    const supabase = createServiceRoleClient();
    const updated = await supabase
      .from("directory_listings")
      .update({
        ...fieldColumns(record.pendingFields),
        pending_changes: null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq("id", id)
      .eq("status", "published")
      .select("id");
    if (updated.error) throw updated.error;
    if (updated.data.length === 0) return { status: "not_allowed" };
    return reload(id);
  } catch (error) {
    logFailure("approve changes", error);
    return { status: "unavailable" };
  }
}

/** Discards a waiting edit. The live listing is untouched. */
export async function discardListingChanges(id: string, reviewerId: string): Promise<ReviewOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const updated = await supabase
      .from("directory_listings")
      .update({ pending_changes: null, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
      .eq("id", id)
      .eq("status", "published")
      .select("id");
    if (updated.error) throw updated.error;
    if (updated.data.length === 0) return { status: "not_allowed" };
    return reload(id);
  } catch (error) {
    logFailure("discard changes", error);
    return { status: "unavailable" };
  }
}

/** The owner takes a listing down. */
export async function removeListingAsOwner(id: string, reviewerId: string, note: string | null): Promise<ReviewOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const updated = await supabase
      .from("directory_listings")
      .update({ status: "removed", removed_at: now, reviewed_at: now, reviewed_by: reviewerId, review_note: note, pending_changes: null })
      .eq("id", id)
      .neq("status", "removed")
      .select("id");
    if (updated.error) throw updated.error;
    if (updated.data.length === 0) return { status: "not_found" };
    return reload(id);
  } catch (error) {
    logFailure("owner remove", error);
    return { status: "unavailable" };
  }
}

export async function resolveListingReports(listingId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("directory_listing_reports")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("listing_id", listingId)
      .eq("status", "open");
    if (error) throw error;
    return true;
  } catch (error) {
    logFailure("resolve reports", error);
    return false;
  }
}
