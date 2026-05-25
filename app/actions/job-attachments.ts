"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createJobAttachment,
  getJobAttachmentById,
} from "@/lib/database/queries/job-attachments";
import { getJobById } from "@/lib/database/queries/jobs";
import { recordJobAttachmentUploadedActivity } from "@/lib/database/services/job-activity";
import { buildJobAttachmentStoragePath } from "@/lib/storage/company-files";
import type {
  JobAttachment,
  JobAttachmentType,
} from "@/shared/types/job-attachment";
import {
  JOB_ATTACHMENT_ALLOWED_MIME_TYPES,
  JOB_ATTACHMENT_MAX_FILE_SIZE,
} from "@/shared/types/job-attachment";

export type JobAttachmentActionResult = {
  error?: string;
  attachment?: JobAttachment;
};

export type JobAttachmentUploadTargetResult = {
  error?: string;
  attachmentId?: string;
  storagePath?: string;
};

function revalidateAttachmentPaths(input: {
  jobId: string;
  customerId?: string | null;
}) {
  revalidatePath(`/jobs/${input.jobId}`);
  if (input.customerId) {
    revalidatePath(`/customers/${input.customerId}`);
  }
  revalidatePath("/technician");
}

async function assertAttachmentWritePermission(input: {
  jobId: string;
}): Promise<{
  error?: string;
  jobNumber?: string;
  customerId?: string;
}> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const job = await getJobById(context.company.id, input.jobId);

  if (!job) {
    return { error: "Job not found." };
  }

  if (context.permissions.dispatchJobs) {
    return {
      jobNumber: job.jobNumber,
      customerId: job.customerId,
    };
  }

  if (!context.permissions.viewAssignedJobs) {
    return { error: "You do not have permission to upload attachments." };
  }

  if (job.assignedTechnicianId !== context.user.id) {
    return {
      error: "You can only upload attachments on jobs assigned to you.",
    };
  }

  return {
    jobNumber: job.jobNumber,
    customerId: job.customerId,
  };
}

function isAllowedMimeType(mimeType: string): boolean {
  return (JOB_ATTACHMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(
    mimeType.toLowerCase(),
  );
}

export async function prepareJobAttachmentUploadAction(input: {
  jobId: string;
  attachmentId: string;
  fileName: string;
}): Promise<JobAttachmentUploadTargetResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const permission = await assertAttachmentWritePermission({
    jobId: input.jobId,
  });

  if (permission.error) {
    return { error: permission.error };
  }

  if (!input.fileName.trim()) {
    return { error: "File name is required." };
  }

  const storagePath = buildJobAttachmentStoragePath({
    companyId: context.company.id,
    jobId: input.jobId,
    attachmentId: input.attachmentId,
    fileName: input.fileName,
  });

  return {
    attachmentId: input.attachmentId,
    storagePath,
  };
}

export async function createJobAttachmentAction(input: {
  jobId: string;
  attachmentId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  attachmentType: JobAttachmentType;
  caption?: string;
}): Promise<JobAttachmentActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const permission = await assertAttachmentWritePermission({
    jobId: input.jobId,
  });

  if (permission.error) {
    return { error: permission.error };
  }

  if (!input.fileName.trim()) {
    return { error: "File name is required." };
  }

  if (!input.filePath.trim()) {
    return { error: "File path is required." };
  }

  if (!isAllowedMimeType(input.mimeType)) {
    return { error: "This file type is not supported." };
  }

  if (input.fileSize <= 0 || input.fileSize > JOB_ATTACHMENT_MAX_FILE_SIZE) {
    return { error: "File must be between 1 byte and 10 MB." };
  }

  const expectedPath = buildJobAttachmentStoragePath({
    companyId: context.company.id,
    jobId: input.jobId,
    attachmentId: input.attachmentId,
    fileName: input.fileName,
  });

  if (input.filePath !== expectedPath) {
    return { error: "Invalid storage path for this attachment." };
  }

  const existing = await getJobAttachmentById(
    context.company.id,
    input.attachmentId,
  );

  if (existing) {
    return { error: "This attachment has already been registered." };
  }

  const fileType = input.mimeType.startsWith("image/")
    ? "image"
    : input.mimeType === "application/pdf"
      ? "pdf"
      : "file";

  const { attachment, error } = await createJobAttachment({
    id: input.attachmentId,
    company_id: context.company.id,
    customer_id: permission.customerId ?? null,
    job_id: input.jobId,
    uploaded_by: context.user.id,
    file_name: input.fileName.trim(),
    file_path: input.filePath,
    file_type: fileType,
    mime_type: input.mimeType.toLowerCase(),
    file_size: input.fileSize,
    attachment_type: input.attachmentType,
    caption: input.caption?.trim() || null,
  });

  if (error || !attachment) {
    return { error: error ?? "Failed to save attachment." };
  }

  await recordJobAttachmentUploadedActivity({
    companyId: context.company.id,
    jobId: input.jobId,
    actorId: context.user.id,
    customerId: permission.customerId,
    jobNumber: permission.jobNumber,
    attachmentType: input.attachmentType,
    fileName: input.fileName.trim(),
  });

  revalidateAttachmentPaths({
    jobId: input.jobId,
    customerId: permission.customerId,
  });

  return { attachment };
}
