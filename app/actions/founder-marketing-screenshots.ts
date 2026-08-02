"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  FOUNDER_MARKETING_SCREENSHOTS_BUCKET,
  buildFounderMarketingScreenshotPublicUrl,
  buildFounderMarketingScreenshotStoragePath,
} from "@/lib/storage/founder-marketing-screenshots";
import { getSupabaseEnv } from "@/lib/supabase/env";

export type FounderScreenshotUploadTargetResult = {
  error?: string;
  uploadId?: string;
  storagePath?: string;
  publicUrl?: string;
  bucket?: string;
};

export async function prepareFounderScreenshotUploadAction(input: {
  uploadId: string;
  fileName: string;
}): Promise<FounderScreenshotUploadTargetResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!canAccessPlatformAdmin(context.user)) {
    return {
      error: "You do not have permission to upload founder screenshots.",
    };
  }

  const uploadId = input.uploadId.trim();
  if (!uploadId) {
    return { error: "Upload id is required." };
  }

  if (!input.fileName.trim()) {
    return { error: "File name is required." };
  }

  const storagePath = buildFounderMarketingScreenshotStoragePath({
    uploadId,
    fileName: input.fileName,
  });
  const { url } = getSupabaseEnv();
  const publicUrl = buildFounderMarketingScreenshotPublicUrl({
    supabaseUrl: url,
    storagePath,
  });

  return {
    uploadId,
    storagePath,
    publicUrl,
    bucket: FOUNDER_MARKETING_SCREENSHOTS_BUCKET,
  };
}
