import { sanitizeStorageFileName } from "@/lib/storage/company-files";

export const FOUNDER_MARKETING_SCREENSHOTS_BUCKET =
  "founder-marketing-screenshots";

export function buildFounderMarketingScreenshotStoragePath(input: {
  uploadId: string;
  fileName: string;
}): string {
  const safeName = sanitizeStorageFileName(input.fileName);

  return ["screenshots", input.uploadId, safeName].join("/");
}

export function buildFounderMarketingScreenshotPublicUrl(input: {
  supabaseUrl: string;
  storagePath: string;
}): string {
  const base = input.supabaseUrl.replace(/\/+$/, "");
  const encodedPath = input.storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/storage/v1/object/public/${FOUNDER_MARKETING_SCREENSHOTS_BUCKET}/${encodedPath}`;
}
