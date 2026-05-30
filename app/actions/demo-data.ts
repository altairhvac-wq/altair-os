"use server";

import { revalidatePath } from "next/cache";
import { assertDemoDataManagementAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  clearCompanyDemoData,
  getDemoDataStatus,
} from "@/lib/database/queries/demo-data";
import { seedCompanyDemoData } from "@/lib/database/services/demo-data-seeder";
import type {
  ClearDemoDataResult,
  DemoDataStatus,
  SeedDemoDataResult,
} from "@/shared/types/demo-data";

const NO_ACTIVE_COMPANY_MESSAGE = "No active company workspace.";

type DemoDataContextResult =
  | { error: string }
  | { context: ActiveCompanyContext };

async function resolveDemoDataManagementContext(
  companyId: string,
): Promise<ActiveCompanyContext | null> {
  const trimmedCompanyId = companyId.trim();
  const activeContext = await getActiveCompanyContext();

  if (
    activeContext &&
    activeContext.company.id.trim().toLowerCase() ===
      trimmedCompanyId.toLowerCase()
  ) {
    return activeContext;
  }

  return getActiveCompanyContext({ companyId: trimmedCompanyId });
}

async function requireDemoDataManagementContext(
  companyId: string,
  action: "seed" | "clear" = "seed",
): Promise<DemoDataContextResult> {
  const trimmedCompanyId = companyId.trim();

  if (!trimmedCompanyId) {
    return { error: "Company workspace is required." as const };
  }

  const context = await resolveDemoDataManagementContext(trimmedCompanyId);

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const accessError = assertDemoDataManagementAccess(
    context,
    trimmedCompanyId,
    action,
  );
  if (accessError) {
    console.error("[requireDemoDataManagementContext] demo data access denied", {
      userId: context.user.id,
      requestedCompanyId: trimmedCompanyId,
      activeCompanyId: context.company.id,
      membershipCompanyId: context.membership.company_id,
      membershipRole: context.membership.role,
      membershipStatus: context.membership.status,
    });
    return { error: accessError };
  }

  return { context };
}

export async function getDemoDataStatusAction(
  companyId: string,
): Promise<DemoDataStatus | { error: string }> {
  const contextResult = await requireDemoDataManagementContext(companyId);
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  return getDemoDataStatus(contextResult.context.company.id, contextResult.context);
}

export async function seedDemoDataAction(
  companyId: string,
): Promise<SeedDemoDataResult> {
  const contextResult = await requireDemoDataManagementContext(companyId);
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const result = await seedCompanyDemoData(contextResult.context);
  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/customers");
  revalidatePath("/jobs");
  revalidatePath("/dispatch");
  revalidatePath("/estimates");
  revalidatePath("/invoices");
  revalidatePath("/reports");
  revalidatePath("/time");
  revalidatePath("/technician");

  return { seededAt: result.seededAt };
}

export async function clearDemoDataAction(
  companyId: string,
): Promise<ClearDemoDataResult> {
  const contextResult = await requireDemoDataManagementContext(companyId, "clear");
  if ("error" in contextResult) {
    return { error: contextResult.error };
  }

  const status = await getDemoDataStatus(
    contextResult.context.company.id,
    contextResult.context,
  );

  if (!status.hasDemoData) {
    return { error: "No demo data is loaded for this company." };
  }

  const { error } = await clearCompanyDemoData(contextResult.context.company.id);
  if (error) {
    return { error };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/customers");
  revalidatePath("/jobs");
  revalidatePath("/dispatch");
  revalidatePath("/estimates");
  revalidatePath("/invoices");
  revalidatePath("/reports");
  revalidatePath("/time");
  revalidatePath("/technician");

  return {};
}
