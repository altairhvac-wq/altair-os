"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listExpensesForJob } from "@/lib/database/queries/expenses";
import { listJobAttachmentsForJob } from "@/lib/database/queries/job-attachments";
import { listJobMaterialsForJob } from "@/lib/database/queries/job-materials";
import { getJobById } from "@/lib/database/queries/jobs";
import type { Expense } from "@/shared/types/expense";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { JobMaterial } from "@/shared/types/job-material";

export type TechnicianJobWorkHistoryResult = {
  error?: string;
  attachments?: JobAttachment[];
  materials?: JobMaterial[];
  expenses?: Expense[];
};

async function assertTechnicianJobReadAccess(jobId: string): Promise<{
  error?: string;
  companyId?: string;
}> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const trimmedJobId = jobId.trim();
  if (!trimmedJobId) {
    return { error: "Job not found." };
  }

  const job = await getJobById(context.company.id, trimmedJobId);

  if (!job) {
    return { error: "Job not found." };
  }

  if (context.permissions.dispatchJobs || context.permissions.manageBilling) {
    return { companyId: context.company.id };
  }

  if (!context.permissions.viewAssignedJobs) {
    return { error: "You do not have permission to view this job." };
  }

  if (job.assignedTechnicianId !== context.user.id) {
    return { error: "You can only view work history on jobs assigned to you." };
  }

  return { companyId: context.company.id };
}

export async function getTechnicianJobWorkHistoryAction(
  jobId: string,
): Promise<TechnicianJobWorkHistoryResult> {
  const access = await assertTechnicianJobReadAccess(jobId);

  if (access.error || !access.companyId) {
    return { error: access.error ?? "Job not found." };
  }

  const [attachments, materials, expenses] = await Promise.all([
    listJobAttachmentsForJob(access.companyId, jobId.trim()),
    listJobMaterialsForJob(access.companyId, jobId.trim()),
    listExpensesForJob(access.companyId, jobId.trim()),
  ]);

  return {
    attachments,
    materials,
    expenses,
  };
}
