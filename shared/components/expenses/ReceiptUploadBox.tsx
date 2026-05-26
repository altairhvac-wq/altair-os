"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileImage, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  attachExpenseReceiptAction,
  prepareExpenseReceiptUploadAction,
} from "@/app/actions/expenses";
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
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  const displayFileName = selectedFile?.name ?? localFileName;

  function handlePickFile() {
    if (!isPending) {
      inputRef.current?.click();
    }
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
          setError(target.error ?? "Could not prepare upload.");
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
          setError(uploadError.message || "Upload failed.");
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
          setError(result.error);
          return;
        }

        if (result.expense) {
          onExpenseUpdated?.(result.expense);
        }

        setLocalFileName(file.name);
        onUploaded?.();
        router.refresh();
      });
      return;
    }

    onFileSelected?.(file);
    setLocalFileName(file.name);
  }

  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center transition-colors hover:border-cyan-300 hover:bg-cyan-50/30 ${
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
          accept={EXPENSE_RECEIPT_ALLOWED_MIME_TYPES.join(",")}
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
            ? "Uploading receipt..."
            : displayFileName
              ? displayFileName
              : "Drop receipt here or tap to browse"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {captureEnvironment
            ? "Tap to open camera or choose a file · up to 10 MB"
            : "PNG, JPG, WEBP, HEIC, or PDF up to 10 MB"}
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
