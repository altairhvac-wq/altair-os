"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { assertCompanySettingsAccess } from "@/lib/database/access-control";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { createBetaFeedbackReport } from "@/lib/database/queries/beta-feedback-reports";
import { listCompanyIntegrationRequests } from "@/lib/database/queries/integration-requests";
import { sendFeedbackAlertEmail } from "@/lib/email/feedback-alert";
import {
  INTEGRATION_REQUEST_DAILY_LIMIT,
  INTEGRATION_REQUEST_PAGE_URL,
  buildIntegrationRequestMessage,
  normalizeIntegrationRequest,
} from "@/shared/types/customer-integrations";

/**
 * "I would use this one" on Settings > Integrations.
 *
 * A public entry point like every Server Action. It resolves the signed-in
 * person and their company itself and checks they may open company settings
 * (owner or admin) before anything is written. The company is never taken
 * from the form, and neither are the names: the browser sends keys, and only
 * keys in the catalog survive `normalizeIntegrationRequest`.
 *
 * ============ WHERE A REQUEST GOES ============
 * One row in `beta_feedback_reports`, the table behind the in-app Feedback
 * button, written with the person's own session under that table's
 * insert-only policy. The founder reads it at /platform/bugs and gets the
 * same alert email a Feedback report sends. That email goes to the Altair
 * support inbox only. Nothing here emails or messages a customer.
 *
 * ============ WHAT IT DOES NOT PROMISE ============
 * The reply is "we got it", never "it is coming". Nothing on the page or in
 * this action commits Altair to building anything.
 */

export type IntegrationRequestActionResult = {
  error?: string;
  /** Keys that are now on record for this company (this request's). */
  requestedKeys?: string[];
};

/**
 * @param expectedCompanyId the company the page was loaded for. It is never
 *   used to decide where the request is filed (that is always the signed-in
 *   company); it only lets the action refuse when the two differ, which
 *   happens when an owner of two companies switches company in another tab
 *   and then presses Send here.
 */
export async function requestIntegrationsAction(
  input: { keys: string[]; note: string },
  expectedCompanyId: string,
): Promise<IntegrationRequestActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to send a request." };
  }

  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const accessError = assertCompanySettingsAccess(context);
  if (accessError) {
    return { error: "Only an owner or admin can send this request." };
  }

  const companyId = context.company.id;
  if (expectedCompanyId !== companyId) {
    return {
      error:
        "You switched company in another tab. Reload this page and send again.",
    };
  }

  const request = normalizeIntegrationRequest(input ?? { keys: [], note: "" });
  const existing = await listCompanyIntegrationRequests(
    companyId,
    new Date().toISOString(),
  );

  // Already on record: asking again adds nothing, so those keys are dropped
  // rather than stored (and emailed) a second time.
  const newKeys = request.keys.filter((key) => !existing.requestedAt[key]);

  if (newKeys.length === 0 && !request.note) {
    if (request.keys.length > 0) {
      // Someone else in the office asked first. Re-read the page so the
      // boxes this person ticked turn into "You asked for this".
      revalidatePath("/settings/integrations");
      return {
        error: "Those are already on your list. We have your request.",
      };
    }

    return { error: "Tick at least one, or tell us what you need in the box." };
  }

  if (existing.sentInLastDay >= INTEGRATION_REQUEST_DAILY_LIMIT) {
    return {
      error:
        "You have sent several requests today and we have all of them. You can add more tomorrow.",
    };
  }

  const message = buildIntegrationRequestMessage({
    keys: newKeys,
    note: request.note,
  });
  const userEmail = user.email?.trim() || null;
  const headersList = await headers();

  const { error } = await createBetaFeedbackReport({
    userId: user.id,
    userEmail,
    companyId,
    userRole: context.role,
    pageUrl: INTEGRATION_REQUEST_PAGE_URL,
    severity: "low",
    message,
    userAgent: headersList.get("user-agent"),
  });

  if (error) {
    console.error("[requestIntegrationsAction] could not store request:", {
      companyId,
      message: error,
    });
    return { error: "We could not save that. Please try again." };
  }

  // Tell the founder, after the response, exactly as a Feedback report does.
  // A mail outage never turns a saved request into an error for the customer.
  after(async () => {
    try {
      const result = await sendFeedbackAlertEmail({
        kind: "integration_request",
        severity: "low",
        message,
        pageUrl: INTEGRATION_REQUEST_PAGE_URL,
        companyName: context.company.name,
        reporterEmail: userEmail,
        reporterRole: context.role,
      });
      if (!result.ok) {
        console.warn("[requestIntegrationsAction] alert email not sent", {
          reason: result.reason,
        });
      }
    } catch (alertError) {
      console.error("[requestIntegrationsAction] alert email failed", {
        message: alertError instanceof Error ? alertError.message : "unknown",
      });
    }
  });

  revalidatePath("/settings/integrations");

  return { requestedKeys: newKeys };
}
