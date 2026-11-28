import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  INTEGRATION_REQUEST_PAGE_URL,
  NO_INTEGRATION_REQUESTS,
  summarizeIntegrationRequests,
  type CompanyIntegrationRequests,
} from "@/shared/types/customer-integrations";

/**
 * What a company has asked for on Settings > Integrations.
 *
 * ============ WHY THE SERVICE ROLE ============
 * Requests live in `beta_feedback_reports`, which a signed-in person may
 * insert into and never read (migration 059: no SELECT policy, on purpose,
 * because the table also holds other people's bug reports). So the read-back
 * uses the service role, and the wall is this function:
 *
 *   - the caller passes the company id from the ACTIVE COMPANY CONTEXT, after
 *     its own settings-access check (the page and the action both do);
 *   - the query is pinned to that company AND to the integration-request
 *     marker;
 *   - nothing about the person leaves this function: the author's id is read
 *     only to apply the rule below, and what is returned is integration keys
 *     and dates.
 *
 * ============ WHY THE AUTHOR IS CHECKED ============
 * The marker is a `page_url`, and `page_url` is whatever the writer says it
 * is: any member of the company can insert a feedback row carrying it (the
 * Feedback action, or the table's insert policy directly). Without a check, a
 * technician could make the owner's page say "You asked for this" for every
 * line, and use up the company's daily sends. So a row counts only when the
 * person who wrote it is an ACTIVE OWNER OR ADMIN of this company today,
 * the same people `requestIntegrationsAction` accepts. The roster is read
 * here with the service role, never taken from the row's own `user_role`
 * text, which the writer also controls.
 *
 * A read failure returns "nothing asked for yet". The page then shows every
 * box unticked, which is the worst case of a duplicate request, never a
 * leak and never an error page.
 */

/** Far more than one company sends; keeps the read bounded. */
const REQUEST_ROW_LIMIT = 200;

/** Owners and admins of one company. Bounded well above any real roster. */
const SETTINGS_ROSTER_LIMIT = 200;

export async function listCompanyIntegrationRequests(
  companyId: string,
  nowIso: string,
): Promise<CompanyIntegrationRequests> {
  try {
    const supabase = createServiceRoleClient();

    const [reports, roster] = await Promise.all([
      supabase
        .from("beta_feedback_reports")
        .select("message, created_at, user_id")
        .eq("company_id", companyId)
        .eq("page_url", INTEGRATION_REQUEST_PAGE_URL)
        .order("created_at", { ascending: false })
        .limit(REQUEST_ROW_LIMIT),
      supabase
        .from("company_memberships")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("status", "active")
        .in("role", ["owner", "admin"])
        .limit(SETTINGS_ROSTER_LIMIT),
    ]);

    if (reports.error || roster.error) {
      console.error("[listCompanyIntegrationRequests] query failed:", {
        companyId,
        code: reports.error?.code ?? roster.error?.code,
        message: reports.error?.message ?? roster.error?.message,
      });
      return NO_INTEGRATION_REQUESTS;
    }

    const mayRequest = new Set(
      (roster.data ?? [])
        .map((member) => member.user_id)
        .filter((userId): userId is string => typeof userId === "string"),
    );

    return summarizeIntegrationRequests(
      (reports.data ?? [])
        .filter((row) => row.user_id !== null && mayRequest.has(row.user_id))
        .map((row) => ({
          message: row.message,
          createdAt: row.created_at,
        })),
      nowIso,
    );
  } catch (error) {
    console.error("[listCompanyIntegrationRequests] failed:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NO_INTEGRATION_REQUESTS;
  }
}
