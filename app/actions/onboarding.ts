"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { setOnboardingChecklistDismissed } from "@/lib/database/queries/onboarding-dismiss";

export type OnboardingDismissActionResult = {
  error?: string;
};

async function requireActiveCompany() {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: "No active company workspace." as const };
  }
  return { context };
}

export async function dismissOnboardingChecklistAction(): Promise<OnboardingDismissActionResult> {
  const result = await requireActiveCompany();
  if ("error" in result) {
    return { error: result.error };
  }

  const { error } = await setOnboardingChecklistDismissed(result.context, true);
  if (error) {
    return { error };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return {};
}

export async function resumeOnboardingChecklistAction(): Promise<OnboardingDismissActionResult> {
  const result = await requireActiveCompany();
  if ("error" in result) {
    return { error: result.error };
  }

  const { error } = await setOnboardingChecklistDismissed(result.context, false);
  if (error) {
    return { error };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return {};
}
