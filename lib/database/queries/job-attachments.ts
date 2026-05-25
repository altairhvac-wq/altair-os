import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  JobAttachmentInsert,
  JobAttachmentRow,
} from "@/lib/database/types/core-tables";
import { createSignedUrlsForPaths } from "@/lib/storage/signed-urls";
import type {
  JobAttachment,
  JobAttachmentType,
} from "@/shared/types/job-attachment";
import { isJobAttachmentImage } from "@/shared/types/job-attachment";

type ProfileSummary = {
  full_name: string | null;
  email: string;
};

type JobAttachmentRowWithUploader = JobAttachmentRow & {
  uploader: ProfileSummary | null;
};

function formatProfileName(
  profile: ProfileSummary | null | undefined,
): string | undefined {
  if (!profile) {
    return undefined;
  }

  return profile.full_name?.trim() || profile.email;
}

function mapJobAttachmentRow(row: JobAttachmentRowWithUploader): JobAttachment {
  return {
    id: row.id,
    companyId: row.company_id,
    customerId: row.customer_id ?? undefined,
    jobId: row.job_id,
    uploadedBy: row.uploaded_by ?? undefined,
    uploadedByName: formatProfileName(row.uploader),
    fileName: row.file_name,
    filePath: row.file_path,
    fileType: row.file_type ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    attachmentType: row.attachment_type as JobAttachmentType,
    caption: row.caption ?? undefined,
    createdAt: row.created_at,
  };
}

async function attachSignedUrls(
  attachments: JobAttachment[],
): Promise<JobAttachment[]> {
  const imagePaths = attachments
    .filter((attachment) => isJobAttachmentImage(attachment.mimeType))
    .map((attachment) => attachment.filePath);

  const signedUrls = await createSignedUrlsForPaths(imagePaths);

  return attachments.map((attachment) => ({
    ...attachment,
    signedUrl: signedUrls.get(attachment.filePath),
  }));
}

const JOB_ATTACHMENT_SELECT = `
  *,
  uploader:profiles!job_attachments_uploaded_by_fkey(full_name, email)
`;

export async function listJobAttachmentsForJob(
  companyId: string,
  jobId: string,
): Promise<JobAttachment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_attachments")
    .select(JOB_ATTACHMENT_SELECT)
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listJobAttachmentsForJob] query failed:", {
      companyId,
      jobId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const attachments = ((data ?? []) as JobAttachmentRowWithUploader[]).map(
    mapJobAttachmentRow,
  );

  return attachSignedUrls(attachments);
}

export async function listRecentJobAttachmentsForCustomer(
  companyId: string,
  customerId: string,
  options?: { limit?: number; imagesOnly?: boolean },
): Promise<JobAttachment[]> {
  const supabase = await createClient();
  const limit = options?.limit ?? 6;

  let query = supabase
    .from("job_attachments")
    .select(JOB_ATTACHMENT_SELECT)
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.imagesOnly) {
    query = query.like("mime_type", "image/%");
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listRecentJobAttachmentsForCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const attachments = ((data ?? []) as JobAttachmentRowWithUploader[]).map(
    mapJobAttachmentRow,
  );

  return attachSignedUrls(attachments);
}

export async function createJobAttachment(
  input: JobAttachmentInsert,
): Promise<{ attachment: JobAttachment | null; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_attachments")
    .insert(input)
    .select(JOB_ATTACHMENT_SELECT)
    .single();

  if (error || !data) {
    console.error("[createJobAttachment] insert failed:", {
      companyId: input.company_id,
      jobId: input.job_id,
      code: error?.code,
      message: error?.message,
    });
    return {
      attachment: null,
      error: mapDatabaseError(error ?? { message: "Insert failed." }),
    };
  }

  const [attachment] = await attachSignedUrls([
    mapJobAttachmentRow(data as JobAttachmentRowWithUploader),
  ]);

  return { attachment, error: null };
}

export async function getJobAttachmentById(
  companyId: string,
  attachmentId: string,
): Promise<JobAttachment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_attachments")
    .select(JOB_ATTACHMENT_SELECT)
    .eq("company_id", companyId)
    .eq("id", attachmentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const [attachment] = await attachSignedUrls([
    mapJobAttachmentRow(data as JobAttachmentRowWithUploader),
  ]);

  return attachment;
}
