import "server-only";

import { selectInChunks } from "@/lib/database/queries/chunked-in";
import { billingPolicyAllowsAppShell } from "@/lib/saas-billing/app-access-policy";
import { resolveCompanyBillingAccess } from "@/lib/saas-billing/resolver";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  DIRECTORY_CLAIM_LIMIT,
  isValidListingSlug,
  type DirectoryOwnListing,
  type DirectoryPublicListing,
} from "@/shared/types/directory";
import { normalizeNetworkTradeType } from "@/shared/types/network";

/**
 * Linking a public directory listing to an Altair workspace (migration 211).
 *
 * ============ WHAT A LINK DOES ============
 * A linked listing whose workspace has application access is shown on the
 * public site as an "Altair member" and is listed ahead of non-members. It
 * changes nothing else: the listing's details still go through the owner's
 * review, and the lister's manage link still works.
 *
 * ============ WHO DECIDES ============
 * This is the data layer. It trusts its arguments. The Server Actions in
 * app/actions/directory-claim.ts are the boundary: they establish who is
 * signed in, which workspace is active, that the person is an owner or admin
 * of it, and the email they sign in with. `contactEmail` here must be that
 * verified sign-in email, never a value from a form.
 *
 * ============ "ACTIVE" HAS ONE DEFINITION ============
 * `workspaceIsActive` asks the same billing resolver and the same rule the
 * app shell uses to let a company in. The answer is stored on the listing as
 * `member_active`, and `refreshDirectoryMemberFlags` re-asks once a day, so a
 * workspace whose trial ends or whose payment lapses loses the badge and the
 * ranking within a day.
 *
 * Errors are logged by code only: no email, business name or workspace id.
 */

function logFailure(what: string, error: unknown): void {
  const code = (error as { code?: string } | null)?.code ?? "unknown";
  console.error(`[directory-claims] ${what} failed:`, { code });
}

/**
 * True when the database does not have migration 211 yet (the new columns
 * are unknown). The application is deployed before the migration is run, so
 * for that stretch every function here answers "nothing is linked" quietly
 * instead of reporting a fault.
 */
function isNotInstalled(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42703" || code === "PGRST204";
}

/** True when this workspace is currently allowed into the application. */
export async function workspaceIsActive(companyId: string): Promise<boolean> {
  const access = await resolveCompanyBillingAccess(companyId);
  return billingPolicyAllowsAppShell(access);
}

const OWN_COLUMNS =
  "slug, business_name, trade_type, city, state, postal_code, service_area, phone, website, description, accepts_sub_work, published_at, contact_email, claimed_company_id, member_active";

type OwnRow = {
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
  published_at: string | null;
  contact_email: string;
  claimed_company_id: string | null;
  member_active: boolean;
};

/** The public details only. The lister's email and the workspace id stop here. */
function toPublic(row: OwnRow): DirectoryPublicListing {
  return {
    slug: row.slug,
    businessName: row.business_name,
    tradeType: normalizeNetworkTradeType(row.trade_type),
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    serviceArea: row.service_area,
    phone: row.phone,
    website: row.website && row.website.startsWith("https://") ? row.website : null,
    description: row.description,
    acceptsSubWork: row.accepts_sub_work,
    publishedAt: row.published_at,
    isMember: row.claimed_company_id !== null && row.member_active,
  };
}

/**
 * The published listings that belong to the person looking at Community:
 * the ones confirmed with the email they sign in with, and the ones already
 * linked to the workspace they are in. Each comes back with how it relates to
 * that workspace, as yes/no facts. Neither the email nor any workspace id is
 * returned.
 */
export async function findOwnListings(viewerEmail: string | null, companyId: string): Promise<DirectoryOwnListing[]> {
  try {
    const supabase = createServiceRoleClient();
    const [byEmail, byWorkspace] = await Promise.all([
      viewerEmail
        ? supabase
            .from("directory_listings")
            .select(OWN_COLUMNS)
            .eq("contact_email", viewerEmail)
            .eq("status", "published")
            .order("published_at", { ascending: true })
            .limit(10)
        : Promise.resolve({ data: [] as OwnRow[], error: null }),
      supabase
        .from("directory_listings")
        .select(OWN_COLUMNS)
        .eq("claimed_company_id", companyId)
        .eq("status", "published")
        .order("published_at", { ascending: true })
        .limit(10),
    ]);
    if (byEmail.error) throw byEmail.error;
    if (byWorkspace.error) throw byWorkspace.error;

    const seen = new Set<string>();
    const own: DirectoryOwnListing[] = [];
    for (const row of [...((byWorkspace.data ?? []) as OwnRow[]), ...((byEmail.data ?? []) as OwnRow[])]) {
      if (seen.has(row.slug) || !isValidListingSlug(row.slug)) continue;
      seen.add(row.slug);
      const linked = row.claimed_company_id === null ? "none" : row.claimed_company_id === companyId ? "this" : "other";
      own.push({
        listing: toPublic(row),
        linked,
        emailMatches: viewerEmail !== null && row.contact_email === viewerEmail,
        badgeShowing: linked === "this" && row.member_active,
      });
    }
    return own;
  } catch (error) {
    if (isNotInstalled(error)) return findOwnListingsBeforeMigration(viewerEmail);
    logFailure("own listing lookup", error);
    return [];
  }
}

/** Before migration 211: a member's own listings by email only, none linked. */
async function findOwnListingsBeforeMigration(viewerEmail: string | null): Promise<DirectoryOwnListing[]> {
  if (!viewerEmail) return [];
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("directory_listings")
      .select(
        "slug, business_name, trade_type, city, state, postal_code, service_area, phone, website, description, accepts_sub_work, published_at",
      )
      .eq("contact_email", viewerEmail)
      .eq("status", "published")
      .limit(10);
    if (error) throw error;
    return (data ?? [])
      .filter((row) => isValidListingSlug(row.slug))
      .map((row) => ({
        listing: toPublic({ ...row, contact_email: viewerEmail, claimed_company_id: null, member_active: false }),
        linked: "none" as const,
        emailMatches: true,
        badgeShowing: false,
      }));
  } catch (error) {
    logFailure("own listing lookup", error);
    return [];
  }
}

/**
 * For the lister's manage page: is this listing linked to a workspace, and is
 * the badge showing? Null when it cannot be told (including before migration
 * 211), which the page treats as "not linked".
 */
export async function getListingLinkState(listingId: string): Promise<{ linked: boolean; badgeShowing: boolean } | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("directory_listings")
      .select("claimed_company_id, member_active")
      .eq("id", listingId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const linked = data.claimed_company_id !== null;
    return { linked, badgeShowing: linked && data.member_active };
  } catch (error) {
    if (!isNotInstalled(error)) logFailure("link state read", error);
    return null;
  }
}

/**
 * Slugs of published listings linked to any of these workspaces. Community
 * uses it to avoid showing one business twice: once as a member with a
 * visible profile and again as a public listing.
 */
export async function listSlugsLinkedToCompanies(companyIds: readonly string[]): Promise<string[]> {
  if (companyIds.length === 0) return [];
  try {
    const supabase = createServiceRoleClient();
    // One id per visible Community profile, so the list grows with the
    // network: asked in chunks, never as one oversized request.
    const { data, error } = await selectInChunks<{ slug: string }>(companyIds, (chunk) =>
      supabase.from("directory_listings").select("slug").in("claimed_company_id", chunk).eq("status", "published").limit(500),
    );
    if (error) throw error;
    return data.map((row) => row.slug).filter(isValidListingSlug);
  } catch (error) {
    if (!isNotInstalled(error)) logFailure("linked slug lookup", error);
    return [];
  }
}

export type LinkOutcome =
  /** Linked now. `badgeShowing` is false when the workspace is not active. */
  | { status: "linked"; badgeShowing: boolean }
  | { status: "already"; badgeShowing: boolean }
  /** Not published, not found, or not confirmed with this person's email. One answer for all three. */
  | { status: "not_yours" }
  | { status: "linked_elsewhere" }
  | { status: "limit" }
  | { status: "unavailable" };

/**
 * Links a published listing to a workspace. The listing must have been
 * confirmed with `contactEmail`, and must not be linked already; both are
 * part of the UPDATE's own condition, so two people pressing the button at
 * the same moment cannot both win.
 */
export async function linkListingToCompany(slug: string, contactEmail: string, companyId: string): Promise<LinkOutcome> {
  if (!isValidListingSlug(slug)) return { status: "not_yours" };
  try {
    const supabase = createServiceRoleClient();

    const held = await supabase
      .from("directory_listings")
      .select("slug", { count: "exact", head: true })
      .eq("claimed_company_id", companyId)
      .neq("status", "removed");
    if (held.error) throw held.error;

    const active = await workspaceIsActive(companyId);

    if ((held.count ?? 0) < DIRECTORY_CLAIM_LIMIT) {
      const updated = await supabase
        .from("directory_listings")
        .update({ claimed_company_id: companyId, claimed_at: new Date().toISOString(), member_active: active })
        .eq("slug", slug)
        .eq("status", "published")
        .eq("contact_email", contactEmail)
        .is("claimed_company_id", null)
        .select("id");
      if (updated.error) throw updated.error;
      if (updated.data.length > 0) return { status: "linked", badgeShowing: active };
    }

    // Nothing changed: say why, without telling a stranger anything about a
    // listing that is not theirs.
    const current = await supabase
      .from("directory_listings")
      .select("claimed_company_id, member_active")
      .eq("slug", slug)
      .eq("status", "published")
      .eq("contact_email", contactEmail)
      .maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) return { status: "not_yours" };
    if (current.data.claimed_company_id === companyId) return { status: "already", badgeShowing: current.data.member_active };
    if (current.data.claimed_company_id !== null) return { status: "linked_elsewhere" };
    return { status: "limit" };
  } catch (error) {
    logFailure("link", error);
    return { status: "unavailable" };
  }
}

export type UnlinkOutcome = "unlinked" | "not_linked" | "unavailable";

/** Removes the link. Only a listing linked to THIS workspace is touched. */
export async function unlinkListingFromCompany(slug: string, companyId: string): Promise<UnlinkOutcome> {
  if (!isValidListingSlug(slug)) return "not_linked";
  try {
    const supabase = createServiceRoleClient();
    const updated = await supabase
      .from("directory_listings")
      .update({ claimed_company_id: null, claimed_at: null, member_active: false })
      .eq("slug", slug)
      .eq("claimed_company_id", companyId)
      .select("id");
    if (updated.error) throw updated.error;
    return updated.data.length > 0 ? "unlinked" : "not_linked";
  } catch (error) {
    logFailure("unlink", error);
    return "unavailable";
  }
}

export type MemberFlagRefreshResult = {
  /** False until migration 211 is applied; the run then has nothing to do and is not a failure. */
  installed: boolean;
  /** Linked listings looked at. */
  checked: number;
  /** Listings whose badge was turned on or off. */
  changed: number;
  errors: string[];
};

const REFRESH_LIMIT = 1000;

/**
 * The daily re-check: for every linked listing, is its workspace still
 * active? Only rows whose answer changed are written. A workspace that could
 * not be checked keeps yesterday's answer and is counted as an error, so an
 * outage in the billing read never strips every badge at once.
 */
export async function refreshDirectoryMemberFlags(): Promise<MemberFlagRefreshResult> {
  const result: MemberFlagRefreshResult = { installed: true, checked: 0, changed: 0, errors: [] };
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("directory_listings")
      .select("id, claimed_company_id, member_active")
      .not("claimed_company_id", "is", null)
      .neq("status", "removed")
      .limit(REFRESH_LIMIT);
    if (error) throw error;

    const rows = (data ?? []) as { id: string; claimed_company_id: string | null; member_active: boolean }[];
    result.checked = rows.length;

    const activeByCompany = new Map<string, boolean>();
    let failedCompanies = 0;
    for (const companyId of new Set(rows.map((row) => row.claimed_company_id).filter((id): id is string => id !== null))) {
      try {
        activeByCompany.set(companyId, await workspaceIsActive(companyId));
      } catch {
        failedCompanies += 1;
      }
    }
    if (failedCompanies > 0) {
      result.errors.push(`${failedCompanies} linked ${failedCompanies === 1 ? "workspace" : "workspaces"} could not be checked`);
    }

    for (const wanted of [true, false]) {
      const ids = rows
        .filter((row) => row.claimed_company_id !== null && activeByCompany.get(row.claimed_company_id) === wanted && row.member_active !== wanted)
        .map((row) => row.id);
      if (ids.length === 0) continue;
      const updated = await selectInChunks<{ id: string }>(ids, (chunk) =>
        supabase.from("directory_listings").update({ member_active: wanted }).in("id", chunk).select("id"),
      );
      if (updated.error) result.errors.push("directory member flags could not be written");
      // Chunks that did go through are counted even when another one failed.
      result.changed += updated.data.length;
    }
  } catch (error) {
    if (isNotInstalled(error)) {
      result.installed = false;
      return result;
    }
    logFailure("member flag refresh", error);
    result.errors.push("directory member flags could not be read");
  }
  return result;
}
