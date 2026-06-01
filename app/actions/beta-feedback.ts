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
  const headersList = await headers();
  const userAgent = headersList.get("user-agent");

  const { error } = await createBetaFeedbackReport({
    userId: user.id,
    userEmail: user.email?.trim() || context?.user.email?.trim() || null,
    companyId: context?.company.id ?? null,
    userRole: context?.role ?? null,
    pageUrl,
    severity: data.severity,
    message,
    expectedBehavior,
    userAgent,
  });

  if (error) {
    return { error: error ?? "Could not send bug report. Please try again." };
  }

  return { success: "Thanks — bug report sent." };
}
