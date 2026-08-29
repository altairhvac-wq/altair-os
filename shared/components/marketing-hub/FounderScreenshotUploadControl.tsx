"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { prepareFounderScreenshotUploadAction } from "@/app/actions/founder-marketing-screenshots";
import { createClient } from "@/lib/supabase/client";
import { FOUNDER_MARKETING_SCREENSHOTS_BUCKET } from "@/lib/storage/founder-marketing-screenshots";
import {
  CONNECTION_UPLOAD_ERROR,
  formatActionError,
  formatConnectionCatchError,
  formatUploadError,
} from "@/shared/lib/operational-errors";
import {
  FOUNDER_MARKETING_SCREENSHOT_ALLOWED_MIME_TYPES,
  FOUNDER_MARKETING_SCREENSHOT_MAX_FILE_SIZE,
} from "@/shared/types/founder-marketing-screenshot";

type FounderScreenshotUploadControlProps = {
  disabled?: boolean;
  northStar?: boolean;
  onUploaded: (publicUrl: string) => void;
};

export function FounderScreenshotUploadControl({
  disabled = false,
  northStar = false,
  onUploaded,
}: FounderScreenshotUploadControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePickFile() {
    if (!disabled && !isPending && !uploadLockRef.current) {
      inputRef.current?.click();
    }
  }

  function validateFile(file: File): string | null {
    if (
      !(
        FOUNDER_MARKETING_SCREENSHOT_ALLOWED_MIME_TYPES as readonly string[]
      ).includes(file.type.toLowerCase())
    ) {
      return "Unsupported file type. Use JPG, PNG, WEBP, or GIF.";
    }

    if (
      file.size <= 0 ||
      file.size > FOUNDER_MARKETING_SCREENSHOT_MAX_FILE_SIZE
    ) {
      return "File must be between 1 byte and 10 MB.";
    }

    return null;
  }

  function uploadFile(file: File) {
    if (disabled || uploadLockRef.current || isPending) {
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    uploadLockRef.current = true;

    startTransition(async () => {
      try {
        const uploadId = crypto.randomUUID();
        const target = await prepareFounderScreenshotUploadAction({
          uploadId,
          fileName: file.name,
        });

        if (target.error || !target.storagePath || !target.publicUrl) {
          setError(
            formatActionError(
              target.error,
              "Could not prepare upload. Try again.",
            ),
          );
          return;
        }

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from(FOUNDER_MARKETING_SCREENSHOTS_BUCKET)
          .upload(target.storagePath, file, {
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          setError(formatUploadError());
          return;
        }

        onUploaded(target.publicUrl);
      } catch {
        setError(formatConnectionCatchError(CONNECTION_UPLOAD_ERROR));
      } finally {
        uploadLockRef.current = false;
      }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || disabled || isPending || uploadLockRef.current) {
      return;
    }

    uploadFile(file);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={FOUNDER_MARKETING_SCREENSHOT_ALLOWED_MIME_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isPending}
      />
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={handlePickFile}
        className="admin-btn-primary inline-flex items-center gap-2"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="h-4 w-4" aria-hidden="true" />
        )}
        {isPending ? "Uploading…" : "Upload screenshot"}
      </button>
      <p
        className={`text-xs leading-relaxed ${
          northStar ? "text-[#6B6255]" : "text-slate-500"
        }`}
      >
        Pick a product screenshot from your computer. It uploads immediately
        and attaches here as a public image URL. JPG, PNG, WEBP, or GIF up to
        10 MB.
      </p>
      {error ? (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
