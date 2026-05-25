export const COMPANY_FILES_BUCKET = "company-files";

export const SIGNED_URL_TTL_SECONDS = 3600;

export function sanitizeStorageFileName(fileName: string): string {
  const trimmed = fileName.trim();

  if (!trimmed) {
    return "file";
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
}

export function buildJobAttachmentStoragePath(input: {
  companyId: string;
  jobId: string;
  attachmentId: string;
  fileName: string;
}): string {
  const safeName = sanitizeStorageFileName(input.fileName);

  return [
    "company",
    input.companyId,
    "jobs",
    input.jobId,
    input.attachmentId,
    safeName,
  ].join("/");
}

export function buildExpenseReceiptStoragePath(input: {
  companyId: string;
  expenseId: string;
  fileName: string;
}): string {
  const safeName = sanitizeStorageFileName(input.fileName);

  return [
    "company",
    input.companyId,
    "expenses",
    input.expenseId,
    safeName,
  ].join("/");
}
