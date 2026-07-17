"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileImage, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createJobAttachmentAction,
  prepareJobAttachmentUploadAction,
} from "@/app/actions/job-attachments";
import {
  CONNECTION_UPLOAD_ERROR,
  formatActionError,
  formatConnectionCatchError,
  formatUploadError,
} from "@/shared/lib/operational-errors";
import { COMPANY_FILES_BUCKET } from "@/lib/storage/company-files";
import {
  JOB_ATTACHMENT_ALLOWED_MIME_TYPES,
  JOB_ATTACHMENT_MAX_FILE_SIZE,
  JOB_ATTACHMENT_TYPE_OPTIONS,
  type JobAttachmentType,
} from "@/shared/types/job-attachment";

type JobAttachmentUploadBoxProps = {
  jobId: string;
  defaultAttachmentType?: JobAttachmentType;
  compact?: boolean;
  showTypeSelector?: boolean;
  captureEnvironment?: boolean;
  onUploaded?: () => void;
  onPendingChange?: (isPending: boolean) => void;
};

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

export function JobAttachmentUploadBox({
  jobId,
  defaultAttachmentType = "general",
  compact = false,
  showTypeSelector = true,
  captureEnvironment = false,
  onUploaded,
  onPendingChange,
}: JobAttachmentUploadBoxProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<JobAttachmentType>(
    defaultAttachmentType,
  );

  useEffect(() => {
    onPendingChange?.(isPending);

    return () => {
      onPendingChange?.(false);
    };
  }, [isPending, onPendingChange]);

  function handlePickFile() {
    if (!isPending && !uploadLockRef.current) {
      inputRef.current?.click();
    }
  }

  function validateFile(file: File): string | null {
    if (
      !(JOB_ATTACHMENT_ALLOWED_MIME_TYPES as readonly string[]).includes(
        file.type.toLowerCase(),
      )
    ) {
      return "Unsupported file type. Use JPG, PNG, WEBP, HEIC, or PDF.";
    }

    if (file.size <= 0 || file.size > JOB_ATTACHMENT_MAX_FILE_SIZE) {
      return "File must be between 1 byte and 10 MB.";
    }

    return null;
  }

  function uploadFile(file: File) {
    if (uploadLockRef.current || isPending) {
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setRetryFile(null);
      return;
    }

    setError(null);
    uploadLockRef.current = true;

    startTransition(async () => {
      try {
        const attachmentId = crypto.randomUUID();

        const target = await prepareJobAttachmentUploadAction({
          jobId,
          attachmentId,
          fileName: file.name,
        });

        if (target.error || !target.storagePath) {
          setRetryFile(file);
          setError(
            formatActionError(target.error, "Could not prepare upload. Try again."),
          );
          return;
        }

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from(COMPANY_FILES_BUCKET)
          .upload(target.storagePath, file, {
            upsert: false,
            contentType: file.type,
          });

        if (uploadError) {
          setRetryFile(file);
          setError(formatUploadError());
          return;
        }

        const result = await createJobAttachmentAction({
          jobId,
          attachmentId,
          fileName: file.name,
          filePath: target.storagePath,
          mimeType: file.type,
          fileSize: file.size,
          attachmentType,
        });

        if (result.error) {
          await supabase.storage
            .from(COMPANY_FILES_BUCKET)
            .remove([target.storagePath]);
          setRetryFile(file);
          setError(formatActionError(result.error, formatUploadError()));
          return;
        }

        setRetryFile(null);
        onUploaded?.();
        router.refresh();
      } catch {
        setRetryFile(file);
        setError(formatConnectionCatchError(CONNECTION_UPLOAD_ERROR));
      } finally {
        uploadLockRef.current = false;
      }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || isPending || uploadLockRef.current) {
      return;
    }

    uploadFile(file);
  }

  function handleRetry() {
    if (isPending || uploadLockRef.current) {
      return;
    }

    if (retryFile) {
      uploadFile(retryFile);
      return;
    }

    handlePickFile();
  }

  return (
    <div className="space-y-3">
      {showTypeSelector ? (
        <div>
          <label htmlFor={`attachment-type-${jobId}`} className="mb-1.5 block text-xs font-semibold text-slate-600">
            Attachment type
          </label>
          <select
            id={`attachment-type-${jobId}`}
            value={attachmentType}
            onChange={(event) =>
              setAttachmentType(event.target.value as JobAttachmentType)
            }
            disabled={isPending}
            className={selectClass}
          >
            {JOB_ATTACHMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div
        className={`rounded-xl border-2 border-dashed border-slate-200 bg-white text-center transition-colors hover:border-cyan-300 hover:bg-cyan-50/30 ${
          compact ? "px-4 py-5" : "px-6 py-8"
        } ${isPending ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
        onClick={handlePickFile}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handlePickFile();
          }
        }}
        role="button"
        tabIndex={0}
        aria-busy={isPending}
      >
        <input
          ref={inputRef}
          type="file"
          accept={JOB_ATTACHMENT_ALLOWED_MIME_TYPES.join(",")}
          capture={captureEnvironment ? "environment" : undefined}
          className="hidden"
          onChange={handleFileChange}
          disabled={isPending}
        />

        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
          ) : (
            <Upload className="h-5 w-5 text-cyan-600" />
          )}
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-800">
          {isPending
            ? "Uploading..."
            : captureEnvironment
              ? "Tap to take or upload photo"
              : "Tap to upload photo or file"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {retryFile && !isPending
            ? `${retryFile.name} ready to retry`
            : "JPG, PNG, WEBP, HEIC, or PDF up to 10 MB"}
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            handlePickFile();
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
        >
          <FileImage className="h-3.5 w-3.5" />
          Choose file
        </button>
      </div>

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRetry}
            className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retryFile ? "Retry upload" : "Try again"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
