import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  AFFILIATE_RULES_TEXT,
  isAffiliateAudienceSize,
  isAffiliatePartnerType,
  type AffiliateApplicationFields,
  type AffiliateApplicationStatus,
} from "@/shared/types/affiliates";

/**
 * Reads and writes for affiliate program applications (migration 213).
 *
 * Every function here uses the service role, because an applicant has no
 * account and the table has no public access at all. This module does not
 * authorise anyone. It is the data layer; the boundary is the Server Action
 * that calls it:
 *   - `saveApplication` after app/actions/affiliates.ts has checked the form
 *     and the rate limit;
 *   - everything else after app/actions/platform-affiliates.ts (or the
 *     platform page) has confirmed a platform admin.
 *
 * Errors are logged by code only. An applicant's name, email address or
 * answers are never written to a log.
 */

type Row = {
  id: string;
  full_name: string;
  email: string;
  business_name: string;
  partner_type: string;
  audience_url: string;
  linkedin_url: string | null;
  audience_size: string;
  audience_description: string;
  promotion_plan: string;
  existing_partnerships: string;
  state: string;
  status: AffiliateApplicationStatus;
  partner_code: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

const ROW_COLUMNS =
  "id, full_name, email, business_name, partner_type, audience_url, linkedin_url, audience_size, audience_description, promotion_plan, existing_partnerships, state, status, partner_code, review_note, reviewed_at, created_at, updated_at";

/** One application as the owner sees it. */
export type AffiliateApplicationRecord = {
  id: string;
  email: string;
  status: AffiliateApplicationStatus;
  fields: AffiliateApplicationFields;
  partnerCode: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AffiliateReviewData = {
  /** False when the table could not be read (for example migration 213 has not been run). */
  available: boolean;
  applications: AffiliateApplicationRecord[];
  approvedCount: number;
};

function logFailure(what: string, error: unknown): void {
  const code = (error as { code?: string } | null)?.code ?? "unknown";
  console.error(`[affiliates] ${what} failed:`, { code });
}

function toRecord(row: Row): AffiliateApplicationRecord {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    fields: {
      fullName: row.full_name,
      businessName: row.business_name,
      partnerType: isAffiliatePartnerType(row.partner_type) ? row.partner_type : "other",
      audienceUrl: row.audience_url,
      linkedinUrl: row.linkedin_url,
      audienceSize: isAffiliateAudienceSize(row.audience_size) ? row.audience_size : "under_500",
      audienceDescription: row.audience_description,
      promotionPlan: row.promotion_plan,
      existingPartnerships: row.existing_partnerships,
      state: row.state,
    },
    partnerCode: row.partner_code,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fieldColumns(fields: AffiliateApplicationFields) {
  return {
    full_name: fields.fullName,
    business_name: fields.businessName,
    partner_type: fields.partnerType,
    audience_url: fields.audienceUrl,
    linkedin_url: fields.linkedinUrl,
    audience_size: fields.audienceSize,
    audience_description: fields.audienceDescription,
    promotion_plan: fields.promotionPlan,
    existing_partnerships: fields.existingPartnerships,
    state: fields.state,
    rules_text: AFFILIATE_RULES_TEXT,
  };
}

export type SaveApplicationOutcome =
  /** A new application is waiting for the owner. */
  | { status: "created" }
  /** This inbox already had one waiting; its answers were replaced. */
  | { status: "updated" }
  | { status: "unavailable" };

/**
 * Stores an application. One inbox has at most one application waiting: a
 * second submission replaces the first one's answers, so pressing the button
 * twice, or sending a corrected form, never puts two rows in the owner's
 * queue. An inbox whose earlier application was already decided may apply
 * again; that is a new row.
 */
export async function saveApplication(fields: AffiliateApplicationFields, email: string): Promise<SaveApplicationOutcome> {
  try {
    const supabase = createServiceRoleClient();

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const refreshed = await supabase
        .from("affiliate_applications")
        .update(fieldColumns(fields))
        .eq("email", email)
        .eq("status", "new")
        .select("id");
      if (refreshed.error) throw refreshed.error;
      if (refreshed.data.length > 0) return { status: "updated" };

      const inserted = await supabase
        .from("affiliate_applications")
        .insert({ ...fieldColumns(fields), email })
        .select("id")
        .single();
      if (!inserted.error) return { status: "created" };
      // 23505: two submissions from the same inbox raced and the other one
      // won. Go round once more, which updates the row it made.
      if (inserted.error.code !== "23505") throw inserted.error;
    }
    return { status: "updated" };
  } catch (error) {
    logFailure("save application", error);
    return { status: "unavailable" };
  }
}

const STATUS_ORDER: Record<AffiliateApplicationStatus, number> = { new: 0, approved: 1, declined: 2 };

/** Every application, the ones waiting for a decision first. Platform admins only (checked by the caller). */
export async function listApplicationsForReview(): Promise<AffiliateReviewData> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("affiliate_applications")
      .select(ROW_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const applications = (data as Row[]).map(toRecord).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    return {
      available: true,
      applications,
      approvedCount: applications.filter((application) => application.status === "approved").length,
    };
  } catch (error) {
    logFailure("list applications", error);
    return { available: false, applications: [], approvedCount: 0 };
  }
}

export type DecisionOutcome =
  | { status: "done"; record: AffiliateApplicationRecord }
  | { status: "not_found" }
  | { status: "code_taken" }
  | { status: "unavailable" };

/**
 * Records the owner's decision. Approving stores the partner's code;
 * declining and "back to waiting" clear it, so a code never belongs to
 * someone who is not an approved partner. Nothing is sent to the applicant
 * and nothing is created in Stripe: both are the owner's to do.
 */
export async function decideApplication(input: {
  id: string;
  reviewerId: string;
  status: AffiliateApplicationStatus;
  partnerCode: string | null;
  reviewNote: string | null;
}): Promise<DecisionOutcome> {
  try {
    const supabase = createServiceRoleClient();
    const decided = input.status !== "new";
    const { data, error } = await supabase
      .from("affiliate_applications")
      .update({
        status: input.status,
        partner_code: input.status === "approved" ? input.partnerCode : null,
        review_note: input.reviewNote,
        reviewed_at: decided ? new Date().toISOString() : null,
        reviewed_by: decided ? input.reviewerId : null,
      })
      .eq("id", input.id)
      .select(ROW_COLUMNS)
      .maybeSingle();
    if (error) {
      // The partner-code index, or (moving back to waiting) the one open
      // application per inbox index.
      if (error.code === "23505") return { status: "code_taken" };
      throw error;
    }
    if (!data) return { status: "not_found" };
    return { status: "done", record: toRecord(data as Row) };
  } catch (error) {
    logFailure("decide application", error);
    return { status: "unavailable" };
  }
}
