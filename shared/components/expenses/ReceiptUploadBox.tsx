"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, FileImage, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  attachExpenseReceiptAction,
  prepareExpenseReceiptUploadAction,
} from "@/app/actions/expenses";
import {
  CONNECTION_UPLOAD_ERROR,
  formatActionError,
  formatConnectionCatchError,
  formatUploadError,
} from "@/shared/lib/operational-errors";
import { COMPANY_FILES_BUCKET } from "@/lib/storage/company-files";
import {
  EXPENSE_RECEIPT_ALLOWED_MIME_TYPES,
  EXPENSE_RECEIPT_MAX_FILE_SIZE,
  type Expense,
} from "@/shared/types/expense";

type ReceiptUploadBoxProps = {
  compact?: boolean;
  captureEnvironment?: boolean;
  expenseId?: string;
  selectedFile?: File | null;
  onFileSelected?: (file: File | null) => void;
  onUploaded?: () => void;
  onExpenseUpdated?: (expense: Expense) => void;
};

function isImageMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("image/");
}

export function ReceiptUploadBox({
  compact = false,
  captureEnvironment = false,
  expenseId,
  selectedFile,
  onFileSelected,
  onUploaded,
  onExpenseUpdated,
}: ReceiptUploadBoxProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadLockRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [retryFile, setRetryFile] = useState<File | null>(null);

  const activeFile = selectedFile ?? localFile ?? retryFile;
  const displayFileName = activeFile?.name ?? null;
  const previewUrl = useMemo(() => {
    if (!activeFile || !isImageMimeType(activeFile.type)) {
      return null;
    }

    return URL.createObjectURL(activeFile);
  }, [activeFile]);
  const showImagePreview = previewUrl != null;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handlePickFile() {
    if (!isPending && !uploadLockRef.current) {
      inputRef.current?.click();
    }
  }

  function handleClearFile(event: React.MouseEvent) {
    event.stopPropagation();
    setLocalFile(null);
    setRetryFile(null);
    setError(null);
    onFileSelected?.(null);
  }

  function validateFile(file: File): string | null {
    if (
      !(EXPENSE_RECEIPT_ALLOWED_MIME_TYPES as readonly string[]).includes(
        file.type.toLowerCase(),
      )
    ) {
      return "Unsupported file type. Use JPG, PNG, WEBP, HEIC, or PDF.";
    }

    if (file.size <= 0 || file.size > EXPENSE_RECEIPT_MAX_FILE_SIZE) {
      return "File must be between 1 byte and 10 MB.";
    }

    return null;
  }

  function uploadToExpense(file: File) {
    if (!expenseId || uploadLockRef.current || isPending) {
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
        const target = await prepareExpenseReceiptUploadAction({
          expenseId,
          fileName: file.name,
        });

        if (target.error || !target.storagePath) {
          setRetryFile(file);
          setLocalFile(file);
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
          setLocalFile(file);
          setError(formatUploadError());
          return;
        }

        const result = await attachExpenseReceiptAction({
          expenseId,
          fileName: file.name,
          storagePath: target.storagePath,
          mimeType: file.type,
          fileSize: file.size,
        });

        if (result.error) {
          await supabase.storage
            .from(COMPANY_FILES_BUCKET)
            .remove([target.storagePath]);
          setRetryFile(file);
          setLocalFile(file);
          setError(formatActionError(result.error, formatUploadError()));
          return;
        }

        if (result.expense) {
          onExpenseUpdated?.(result.expense);
        }

        setRetryFile(null);
        setLocalFile(file);
        onUploaded?.();
        router.refresh();
      } catch {
        setRetryFile(file);
        setLocalFile(file);
        setError(formatConnectionCatchError(CONNECTION_UPLOAD_ERROR));
      } finally {
        uploadLockRef.current = false;
      }
    });
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError(null);

    if (!file || isPending || uploadLockRef.current) {
      return;
    }

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (expenseId) {
      uploadToExpense(file);
      return;
    }

    setRetryFile(null);
    setLocalFile(file);
    onFileSelected?.(file);
  }

  function handleRetry() {
    if (isPending || uploadLockRef.current) {
      return;
    }

    if (expenseId && retryFile) {
      uploadToExpense(retryFile);
      return;
    }

    handlePickFile();
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative overflow-hidden rounded-xl border-2 border-dashed text-center transition-colors ${
          showImagePreview
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/30"
        } ${compact ? "min-h-[140px]" : "min-h-[180px]"} ${
          isPending ? "pointer-events-none opacity-70" : "cursor-pointer"
        }`}
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
        aria-label={
          displayFileName
            ? `Receipt selected: ${displayFileName}. Tap to replace.`
            : captureEnvironment
              ? "Tap to take a receipt photo"
              : "Tap to upload a receipt"
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept={EXPENSE_RECEIPT_ALLOWED_MIME_TYPES.join(",")}
          capture={captureEnvironment ? "environment" : undefined}
          className="hidden"
          onChange={handleFileChange}
          disabled={isPending}
        />

        {showImagePreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-h-48 w-full object-contain"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-900/70 to-transparent px-3 pb-3 pt-8">
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-white">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                {displayFileName}
              </span>
              {!expenseId ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleClearFile}
                  className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white transition-colors hover:bg-white/30"
                  aria-label="Remove receipt"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className={compact ? "px-4 py-5" : "px-6 py-8"}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
              {isPending ? (
                <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
              ) : captureEnvironment ? (
                <Camera className="h-6 w-6 text-cyan-600" />
              ) : (
                <Upload className="h-6 w-6 text-cyan-600" />
              )}
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              {isPending
                ? "Uploading receipt..."
                : displayFileName
                  ? displayFileName
                  : captureEnvironment
                    ? "Tap to snap receipt"
                    : "Drop receipt here or tap to browse"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {retryFile && expenseId && !isPending
                ? "Receipt ready to retry"
                : captureEnvironment
                  ? "Opens camera first · JPG, PNG, PDF up to 10 MB"
                  : "PNG, JPG, WEBP, HEIC, or PDF up to 10 MB"}
            </p>
            {!displayFileName ? (
              <button
                type="button"
                disabled={isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  handlePickFile();
                }}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                {captureEnvironment ? (
                  <>
                    <Camera className="h-4 w-4" />
                    Open camera
                  </>
                ) : (
                  <>
                    <FileImage className="h-4 w-4" />
                    Choose file
                  </>
                )}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-red-600" role="alert" aria-live="polite">
            {error}
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleRetry}
            className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retryFile && expenseId ? "Retry upload" : "Try again"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
