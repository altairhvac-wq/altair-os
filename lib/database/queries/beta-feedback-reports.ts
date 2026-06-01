import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { BetaFeedbackReportInsert } from "@/lib/database/types/core-tables";
import type {
  BetaFeedbackReportFormData,
  BetaFeedbackSeverity,
} from "@/shared/types/beta-feedback";

const VALID_SEVERITIES = new Set<BetaFeedbackSeverity>([
  "low",
  "medium",
  "high",
  "blocking",
]);

type CreateBetaFeedbackReportInput = BetaFeedbackReportFormData & {
  userId: string;
  userEmail: string | null;
  companyId: string | null;
  userRole: string | null;
  userAgent: string | null;
};

function normalizeSeverity(severity: BetaFeedbackSeverity): BetaFeedbackSeverity {
  return VALID_SEVERITIES.has(severity) ? severity : "medium";
}

function isInsertPolicyFailure(error: { message?: string; code?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";

  return (
    error.code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("row level security")
  );
}

function buildInsertPayload(
  input: CreateBetaFeedbackReportInput,
): BetaFeedbackReportInsert {
  return {
    company_id: input.companyId,
    user_id: input.userId,
    user_email: input.userEmail,
    user_role: input.userRole,
    page_url: input.pageUrl.trim(),
    severity: normalizeSeverity(input.severity),
    message: input.message.trim(),
    expected_behavior: input.expectedBehavior?.trim() || null,
    user_agent: input.userAgent,
    status: "open",
  };
}

/**
 * Insert-only beta bug reports via the authenticated Supabase session.
 * Do not chain `.select()` — there is no SELECT policy for authenticated users.
 */
async function insertBetaFeedbackReport(
  input: CreateBetaFeedbackReportInput,
): Promise<{ error: { message?: string; code?: string } | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("beta_feedback_reports")
    .insert(buildInsertPayload(input));

  return { error };
}

export async function createBetaFeedbackReport(
  input: CreateBetaFeedbackReportInput,
): Promise<{ error: string | null; errorCode?: string }> {
  let { error } = await insertBetaFeedbackReport(input);

  if (error && input.companyId && isInsertPolicyFailure(error)) {
    console.warn("[createBetaFeedbackReport] retrying without company_id:", {
      userId: input.userId,
      companyId: input.companyId,
      code: error.code,
      message: error.message,
    });
    ({ error } = await insertBetaFeedbackReport({ ...input, companyId: null }));
  }

  if (error) {
    console.error("[createBetaFeedbackReport] insert failed:", {
      userExists: Boolean(input.userId),
      userId: input.userId,
      companyId: input.companyId,
      userRole: input.userRole,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error), errorCode: error.code };
  }

  return { error: null };
}
