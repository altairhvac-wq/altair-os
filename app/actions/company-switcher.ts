"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/database/auth";
import { switchDefaultCompany } from "@/lib/database/queries/company-switcher";

export type SwitchCompanyActionResult = {
  error?: string;
  companyId?: string;
};

function revalidateCompanySwitcherPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/setup");
  revalidatePath("/settings");
  revalidatePath("/dispatch");
  revalidatePath("/technician", "layout");
  revalidatePath("/tech", "layout");
}

export async function switchCompanyAction(
  companyId: string,
): Promise<SwitchCompanyActionResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to switch companies." };
  }

  const trimmedCompanyId = companyId.trim();

  if (!trimmedCompanyId) {
    return { error: "Select a company to switch to." };
  }

  const result = await switchDefaultCompany(user.id, trimmedCompanyId);

  if (result.error || !result.companyId) {
    return { error: result.error ?? "Unable to switch companies." };
  }

  revalidateCompanySwitcherPaths();

  return { companyId: result.companyId };
}
