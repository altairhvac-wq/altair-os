"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, FileImage, Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  attachExpenseReceiptAction,
  prepareExpenseReceiptUploadAction,
} from "@/app/actions/expenses";
import { formatActionError, formatUploadError } from "@/shared/lib/operational-errors";
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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const activeFile = selectedFile ?? localFile;
  const displayFileName = activeFile?.name ?? null;
  const showImagePreview =
    activeFile != null && isImageMimeType(activeFile.type) && previewUrl != null;

  useEffect(() => {
    if (!activeFile || !isImageMimeType(activeFile.type)) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(activeFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeFile]);

  function handlePickFile() {
    if (!isPending) {
      inputRef.current?.click();
    }
  }

  function handleClearFile(event: React.MouseEvent) {
    event.stopPropagation();
    setLocalFile(null);
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError(null);

    if (!file) {
      return;
    }

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (expenseId) {
      startTransition(async () => {
        const target = await prepareExpenseReceiptUploadAction({
          expenseId,
          fileName: file.name,
        });

        if (target.error || !target.storagePath) {
          setError(formatActionError(target.error, "Could not prepare upload. Try again."));
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
          setError(formatActionError(result.error, formatUploadError()));
          return;
        }

        if (result.expense) {
          onExpenseUpdated?.(result.expense);
        }

        setLocalFile(file);
        onUploaded?.();
        router.refresh();
      });
      return;
    }

    setLocalFile(file);
    onFileSelected?.(file);
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
              {captureEnvironment
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
            onClick={handlePickFile}
            className="text-sm font-semibold text-cyan-700 hover:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
