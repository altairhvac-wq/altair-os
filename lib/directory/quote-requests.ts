import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import { formatPhone } from "@/shared/types/directory";
import type { QuoteRequestFields } from "@/shared/types/directory-quote";

/**
 * Quote requests from a listing page (migration 216).
 *
 * Who receives one: only a PUBLISHED listing, at its private contact email.
 * When the listing is linked to a workspace that is currently active
 * (`member_active`, kept up to date by the daily billing run, migration 211),
 * the request also becomes a lead in that workspace. The visitor's details
 * never reach a public page and never another business.
 *
 * Everything here uses the service role: the visitor has no account, and the
 * action that calls this is the boundary (rate limits, trap field, checks).
 */

export type QuoteTarget = {
  id: string;
  slug: string;
  businessName: string;
  phone: string;
  contactEmail: string;
  acceptsSubWork: boolean;
  /** The linked workspace when it is active; null otherwise. Never shown to the visitor. */
  memberCompanyId: string | null;
};

function logFailure(step: string, error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : String(error);
  console.error(`[directory-quotes] ${step} failed:`, message);
}

export async function getQuoteTarget(slug: string): Promise<QuoteTarget | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("directory_listings")
      .select("id, slug, business_name, phone, contact_email, accepts_sub_work, status, claimed_company_id, member_active")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as {
      id: string;
      slug: string;
      business_name: string;
      phone: string;
      contact_email: string;
      accepts_sub_work: boolean;
      claimed_company_id: string | null;
      member_active: boolean | null;
    };
    return {
      id: row.id,
      slug: row.slug,
      businessName: row.business_name,
      phone: row.phone,
      contactEmail: row.contact_email,
      acceptsSubWork: row.accepts_sub_work,
      memberCompanyId: row.claimed_company_id && row.member_active ? row.claimed_company_id : null,
    };
  } catch (error) {
    logFailure("target", error);
    return null;
  }
}

/** Stores the request before anything is sent, so nothing is lost if the email fails. */
export async function saveQuoteRequest(listingId: string, fields: QuoteRequestFields): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("directory_quote_requests")
      .insert({
        listing_id: listingId,
        kind: fields.kind,
        sender_name: fields.name,
        sender_phone: fields.phone,
        sender_email: fields.email,
        sender_company: fields.company,
        place: fields.place,
        timing: fields.timing,
        details: fields.details,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  } catch (error) {
    logFailure("save", error);
    return null;
  }
}

export async function markQuoteRequestNotSent(id: string): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("directory_quote_requests").update({ status: "not_sent" }).eq("id", id);
    if (error) throw error;
  } catch (error) {
    logFailure("mark-not-sent", error);
  }
}

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? { first: parts[0], last: parts.slice(1).join(" ") } : { first: parts[0] ?? name, last: "" };
}

/** The lead notes: what was asked, in the words typed, with where it came from. */
export function buildDirectoryLeadNotes(fields: QuoteRequestFields): string {
  return [
    fields.kind === "sub" ? "Sub work offered through your directory listing on altair-op.com." : "Quote request from your directory listing on altair-op.com.",
    "",
    fields.details,
    "",
    ...(fields.place ? [`Where: ${fields.place}`] : []),
    `${fields.kind === "sub" ? "Timing" : "Best time to call"}: ${fields.timing}`,
    `Phone: ${formatPhone(fields.phone)}`,
  ].join("\n");
}

/**
 * The request as a new lead in the member's workspace. A failure here never
 * stops the email: the business still gets the request.
 */
export async function createDirectoryLead(companyId: string, requestId: string, fields: QuoteRequestFields): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();
    const { first, last } = splitName(fields.name);
    const { data, error } = await supabase
      .from("leads")
      .insert({
        company_id: companyId,
        created_by: null,
        first_name: first,
        last_name: last,
        company_name: fields.company,
        email: fields.email ?? "",
        phone: fields.phone,
        source: "directory",
        status: "new",
        notes: buildDirectoryLeadNotes(fields),
      })
      .select("id")
      .single();
    if (error) throw error;
    const leadId = (data as { id: string }).id;

    const activity = await supabase.from("lead_activities").insert({
      company_id: companyId,
      lead_id: leadId,
      activity_type: "lead_created",
      created_by: null,
      note: null,
      metadata: { source: "directory", directoryQuoteRequestId: requestId, kind: fields.kind },
    });
    if (activity.error) logFailure("lead-activity", activity.error);

    const link = await supabase.from("directory_quote_requests").update({ lead_id: leadId }).eq("id", requestId);
    if (link.error) logFailure("lead-link", link.error);
    return leadId;
  } catch (error) {
    logFailure("lead", error);
    return null;
  }
}
