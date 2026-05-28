"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  assignJobToTechnician,
  unassignJobFromTechnician,
} from "@/lib/database/queries/dispatch";
import type { DispatchJob } from "@/shared/types/dispatch";

export type AssignJobActionResult = {
  error?: string;
  job?: DispatchJob;
};

export type UnassignJobActionResult = {
  error?: string;
  job?: DispatchJob;
};

export async function assignJobAction(
  jobId: string,
  technicianId: string,
): Promise<AssignJobActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to assign jobs." };
  }

  const { job, error } = await assignJobToTechnician(
    context.company.id,
    jobId,
    technicianId,
    context.user.id,
  );

  if (error || !job) {
    return { error: error ?? "Failed to assign job." };
  }

  console.log("[assignJobAction] assignment returned", {
    jobId,
    technicianId,
    status: job.status,
  });

  revalidatePath("/dispatch");
  revalidatePath("/jobs");
  revalidatePath("/technician");
  revalidatePath(`/jobs/${jobId}`);

  return { job };
}

export async function unassignJobAction(
  jobId: string,
): Promise<UnassignJobActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to assign jobs." };
  }

  const { job, error } = await unassignJobFromTechnician(
    context.company.id,
    jobId,
    context.user.id,
  );

  if (error || !job) {
    return { error: error ?? "Failed to unassign job." };
  }

  revalidatePath("/dispatch");
  revalidatePath("/jobs");
  revalidatePath("/technician");
  revalidatePath(`/jobs/${jobId}`);

  return { job };
}
