export type JobAttachmentType =
  | "general"
  | "before"
  | "after"
  | "diagnostic"
  | "equipment";

export type JobAttachment = {
  id: string;
  companyId: string;
  customerId?: string;
  jobId: string;
  uploadedBy?: string;
  uploadedByName?: string;
  fileName: string;
  filePath: string;
  fileType?: string;
  mimeType?: string;
  fileSize?: number;
  attachmentType: JobAttachmentType;
  caption?: string;
  signedUrl?: string;
  createdAt: string;
};

export type JobAttachmentFormData = {
  attachmentType: JobAttachmentType;
  caption?: string;
};

export const JOB_ATTACHMENT_TYPE_OPTIONS: {
  value: JobAttachmentType;
  label: string;
}[] = [
  { value: "general", label: "General" },
  { value: "before", label: "Before" },
  { value: "after", label: "After" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "equipment", label: "Equipment" },
];

export const JOB_ATTACHMENT_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const JOB_ATTACHMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const JOB_ATTACHMENT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export function formatJobAttachmentType(type: JobAttachmentType): string {
  return (
    JOB_ATTACHMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
    type
  );
}

export function isJobAttachmentImage(mimeType?: string): boolean {
  if (!mimeType) {
    return false;
  }

  return JOB_ATTACHMENT_IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

export function formatJobAttachmentFileSize(bytes?: number): string | null {
  if (bytes == null || bytes <= 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
