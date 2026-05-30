"use server";

import { revalidatePath } from "next/cache";
import { assertCompanySettingsAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
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

async function requireDemoDataManagementContext() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." as const };
  }

  const accessError = assertCompanySettingsAccess(context);
  if (accessError) {
    return { error: accessError };
  }

  return { context };
}

export async function getDemoDataStatusAction(): Promise<
  DemoDataStatus | { error: string }
> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  return getDemoDataStatus(context.company.id, context);
}

export async function seedDemoDataAction(): Promise<SeedDemoDataResult> {
  const contextResult = await requireDemoDataManagementContext();
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

export async function clearDemoDataAction(): Promise<ClearDemoDataResult> {
  const contextResult = await requireDemoDataManagementContext();
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
