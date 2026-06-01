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

export async function createBetaFeedbackReport(
  input: CreateBetaFeedbackReportInput,
): Promise<{ reportId: string | null; error: string | null }> {
  const supabase = await createClient();

  const insert: BetaFeedbackReportInsert = {
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

  const { data, error } = await supabase
    .from("beta_feedback_reports")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    console.error("[createBetaFeedbackReport] insert failed:", {
      userId: input.userId,
      companyId: input.companyId,
      code: error.code,
      message: error.message,
    });
    return { reportId: null, error: mapDatabaseError(error) };
  }

  return { reportId: data?.id ?? null, error: null };
}
