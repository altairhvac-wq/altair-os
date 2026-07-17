import { createClient } from "@/lib/supabase/server";
import { isMissingDatabaseColumnError, mapDatabaseError } from "@/lib/database/errors";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  isOnboardingDismissedForCompany,
  setOnboardingDismissedInPreferences,
} from "@/shared/lib/onboarding-dismiss-settings";

export function getOnboardingDismissedFromContext(
  context: ActiveCompanyContext,
): boolean {
  return isOnboardingDismissedForCompany(
    context.profile.preferences,
    context.company.id,
  );
}

export async function setOnboardingChecklistDismissed(
  context: ActiveCompanyContext,
  dismissed: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const companyId = context.company.id;
  const nextPreferences = setOnboardingDismissedInPreferences(
    context.profile.preferences,
    companyId,
    dismissed ? new Date().toISOString() : null,
  );

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: nextPreferences })
    .eq("id", context.user.id);

  if (error) {
    if (isMissingDatabaseColumnError(error)) {
      console.warn(
        "[setOnboardingChecklistDismissed] preferences column missing; apply migration 117",
        {
          userId: context.user.id,
          companyId,
          code: error.code,
          message: error.message,
        },
      );
      return {
        error:
          "Setup preference could not be saved yet. Refresh after the latest update, or try again shortly.",
      };
    }

    console.error("[setOnboardingChecklistDismissed] update failed:", {
      userId: context.user.id,
      companyId,
      code: error.code,
      message: error.message,
    });
    return { error: mapDatabaseError(error) };
  }

  context.profile.preferences = nextPreferences;
  return { error: null };
}
