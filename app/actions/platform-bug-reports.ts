"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { updatePlatformBugReportStatus } from "@/lib/database/services/platform-admin";
import type { BetaFeedbackStatus } from "@/shared/types/beta-feedback";

export type PlatformBugReportActionResult = {
  error?: string;
  success?: string;
};

const VALID_STATUSES = new Set<BetaFeedbackStatus>([
  "open",
  "reviewing",
  "fixed",
  "ignored",
]);

function revalidatePlatformBugReportPaths() {
  revalidatePath("/platform");
  revalidatePath("/platform/bugs");
}

export async function updatePlatformBugReportStatusAction(
  reportId: string,
  status: BetaFeedbackStatus,
): Promise<PlatformBugReportActionResult> {
  const user = await getCurrentUser();

  if (!user || !canAccessPlatformAdmin(user)) {
    return { error: "You do not have permission to update bug reports." };
  }

  if (!VALID_STATUSES.has(status)) {
    return { error: "Invalid bug report status." };
  }

  const { error } = await updatePlatformBugReportStatus(reportId, status);

  if (error) {
    return { error };
  }

  revalidatePlatformBugReportPaths();
  return { success: "Bug report status updated." };
}
