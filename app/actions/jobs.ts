"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { createJob } from "@/lib/database/queries/jobs";
import type { Job, JobFormData } from "@/shared/types/job";

export type CreateJobActionResult = {
  error?: string;
  job?: Job;
};

export async function createJobAction(
  data: JobFormData,
): Promise<CreateJobActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to create jobs." };
  }

  const { job, error } = await createJob(context.company.id, data);

  if (error || !job) {
    return { error: error ?? "Failed to create job." };
  }

  revalidatePath("/jobs");
  return { job };
}
