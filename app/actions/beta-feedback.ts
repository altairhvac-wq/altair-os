"use server";

import { headers } from "next/headers";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { createBetaFeedbackReport } from "@/lib/database/queries/beta-feedback-reports";
import type { BetaFeedbackReportFormData } from "@/shared/types/beta-feedback";
import {
  BETA_FEEDBACK_EXPECTED_BEHAVIOR_MAX_LENGTH,
  BETA_FEEDBACK_MESSAGE_MAX_LENGTH,
} from "@/shared/types/beta-feedback";

export type BetaFeedbackActionResult = {
  error?: string;
  success?: string;
};

function trimToMax(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

/**
 * Submits a beta bug report for the signed-in user.
 * Identity fields (user_id, email, company_id, role) are resolved server-side only.
 */
export async function submitBetaFeedbackReportAction(
  data: BetaFeedbackReportFormData,
): Promise<BetaFeedbackActionResult> {
  if (!isBetaBugReportEnabled()) {
    return { error: "Bug reporting is not available right now." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to send a bug report." };
  }

  const message = trimToMax(data.message, BETA_FEEDBACK_MESSAGE_MAX_LENGTH);

  if (!message) {
    return { error: "Please describe what went wrong." };
  }

  const pageUrl = data.pageUrl.trim();

  if (!pageUrl) {
    return { error: "Page URL is required." };
  }

  const expectedBehavior = data.expectedBehavior
    ? trimToMax(
        data.expectedBehavior,
        BETA_FEEDBACK_EXPECTED_BEHAVIOR_MAX_LENGTH,
      )
    : undefined;

  const context = await getActiveCompanyContext();
  const companyId = context?.company.id ?? null;
  const userRole = context?.role ?? null;
  const userEmail = user.email?.trim() || null;

  const headersList = await headers();
  const userAgent = headersList.get("user-agent");

  const { error, errorCode } = await createBetaFeedbackReport({
    userId: user.id,
    userEmail,
    companyId,
    userRole,
    pageUrl,
    severity: data.severity,
    message,
    expectedBehavior,
    userAgent,
  });

  if (error) {
    console.error("[submitBetaFeedbackReportAction] failed:", {
      userExists: true,
      userId: user.id,
      resolvedCompanyId: companyId,
      resolvedRole: userRole,
      code: errorCode,
      message: error,
    });
    return { error: error ?? "Could not send bug report. Please try again." };
  }

  return { success: "Thanks — bug report sent." };
}
