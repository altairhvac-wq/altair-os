"use client";

import { useState } from "react";
import { ExternalLink, FileText, ImageIcon, Receipt } from "lucide-react";
import {
  formatExpenseDate,
  formatReceiptStatus,
  isExpenseReceiptImageFile,
  type Expense,
} from "@/shared/types/expense";
import { ReceiptUploadBox } from "./ReceiptUploadBox";
import {
  AltairDialog,
  AltairDialogBody,
  AltairDialogClose,
  AltairDialogContent,
  AltairDialogHeader,
  AltairDialogTitle,
} from "@/shared/design-system/dialog";

type ExpenseReceiptPreviewProps = {
  expense: Expense;
  onExpenseUpdated?: (expense: Expense) => void;
  showUploadWhenMissing?: boolean;
  compact?: boolean;
  northStar?: boolean;
};

export function ExpenseReceiptPreview({
  expense,
  onExpenseUpdated,
  showUploadWhenMissing = true,
  compact = false,
  northStar = false,
}: ExpenseReceiptPreviewProps) {
  const [showModal, setShowModal] = useState(false);
  const hasReceipt =
    expense.receiptStatus === "attached" && Boolean(expense.receiptSignedUrl);

  if (!hasReceipt) {
    return (
      <div className="space-y-3">
        <div
          className={`flex items-center gap-3 rounded-xl border border-dashed text-left ${
            northStar
              ? "border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] text-[#64748B]"
              : "border-slate-200 bg-white text-slate-500"
          } ${compact ? "px-3 py-4" : "px-4 py-6"}`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm ${
              northStar ? "bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]" : "bg-white"
            }`}
          >
            <Receipt
              className={`h-5 w-5 ${
                northStar ? "text-[#8A6324]" : "text-slate-400"
              }`}
            />
          </div>
          <div>
            <p
              className={`text-sm font-semibold ${
                northStar ? "text-[#17130E]" : "text-slate-700"
              }`}
            >
              No receipt attached
            </p>
            <p className={`text-xs ${northStar ? "text-[#64748B]" : "text-slate-500"}`}>
              {formatReceiptStatus(expense.receiptStatus)}
            </p>
          </div>
        </div>
        {showUploadWhenMissing ? (
          <ReceiptUploadBox
            compact
            expenseId={expense.id}
            onExpenseUpdated={onExpenseUpdated}
          />
        ) : null}
      </div>
    );
  }

  const isImage = isExpenseReceiptImageFile(expense.receiptFileName);
  const uploadedLabel = formatExpenseDate(expense.createdAt);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`group w-full overflow-hidden rounded-xl border text-left transition-colors ${
          northStar
            ? "border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] hover:border-[rgba(201,164,77,0.35)] hover:ring-2 hover:ring-[rgba(201,164,77,0.18)]"
            : "border-slate-200 bg-white hover:border-cyan-300 hover:ring-2 hover:ring-cyan-500/15"
        } ${compact ? "" : "shadow-sm"}`}
      >
        <div
          className={`relative ${
            northStar ? "bg-[#EFE4CB]" : "bg-slate-100"
          } ${compact ? "aspect-[5/3]" : "aspect-[4/3]"}`}
        >
          {isImage && expense.receiptSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={expense.receiptSignedUrl}
              alt={expense.receiptFileName ?? "Receipt"}
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
              <FileText
                className={`h-8 w-8 ${
                  northStar ? "text-[#8A6324]" : "text-slate-400"
                }`}
              />
              <span
                className={`text-xs font-semibold ${
                  northStar ? "text-[#4F4638]" : "text-slate-600"
                }`}
              >
                {expense.receiptFileName ?? "Receipt file"}
              </span>
            </div>
          )}
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 shadow-sm ring-1 ring-emerald-600/15">
            <ImageIcon className="h-3 w-3" />
            Tap to preview
          </span>
        </div>
        <div className="space-y-0.5 px-3 py-2.5">
          <p
            className={`truncate text-sm font-semibold ${
              northStar ? "text-[#17130E]" : "text-slate-900"
            }`}
          >
            {expense.receiptFileName ?? "Receipt attached"}
          </p>
          <p className={`text-xs ${northStar ? "text-[#64748B]" : "text-slate-500"}`}>
            Uploaded {uploadedLabel}
          </p>
        </div>
      </button>

      <ExpenseReceiptPreviewModal
        expense={expense}
        isImage={isImage}
        open={showModal}
        onClose={() => setShowModal(false)}
        northStar={northStar}
      />
    </>
  );
}

type ExpenseReceiptPreviewModalProps = {
  expense: Expense;
  isImage: boolean;
  open: boolean;
  onClose: () => void;
  northStar?: boolean;
};

function ExpenseReceiptPreviewModal({
  expense,
  isImage,
  open,
  onClose,
  northStar = false,
}: ExpenseReceiptPreviewModalProps) {
  return (
    <AltairDialog open={open} onOpenChange={onClose}>
      <AltairDialogContent
        size="lg"
        className={
          northStar ? "border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]" : undefined
        }
      >
        <AltairDialogHeader
          className={northStar ? "border-[rgba(138,99,36,0.12)]" : undefined}
        >
          <div className="min-w-0 flex-1">
            <AltairDialogTitle
              className={`truncate ${northStar ? "text-[#17130E]" : "text-slate-900"}`}
            >
              {expense.receiptFileName ?? "Receipt preview"}
            </AltairDialogTitle>
            <p className={`text-xs ${northStar ? "text-[#64748B]" : "text-slate-500"}`}>
              {expense.expenseNumber} · Uploaded {formatExpenseDate(expense.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {expense.receiptSignedUrl ? (
              <a
                href={expense.receiptSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  northStar
                    ? "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD]"
                    : "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                }
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            ) : null}
            <AltairDialogClose
              className={
                northStar
                  ? "text-[#64748B] hover:bg-[#EFE4CB] hover:text-[#17130E]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }
            />
          </div>
        </AltairDialogHeader>

        <AltairDialogBody className={northStar ? "bg-[#FBF7EF]" : "bg-white"}>
          {isImage && expense.receiptSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={expense.receiptSignedUrl}
              alt={expense.receiptFileName ?? "Receipt"}
              className="mx-auto max-h-[70vh] w-full rounded-lg border border-slate-200 bg-white object-contain"
            />
          ) : expense.receiptSignedUrl ? (
            <div
              className={`flex flex-col items-center justify-center gap-4 rounded-xl border px-6 py-12 text-center ${
                northStar
                  ? "border-[rgba(138,99,36,0.12)] bg-[#FFF9EA]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <FileText
                className={`h-12 w-12 ${
                  northStar ? "text-[#8A6324]" : "text-slate-400"
                }`}
              />
              <div>
                <p
                  className={`text-sm font-semibold ${
                    northStar ? "text-[#17130E]" : "text-slate-900"
                  }`}
                >
                  {expense.receiptFileName ?? "Receipt file"}
                </p>
                <p className={`mt-1 text-xs ${northStar ? "text-[#64748B]" : "text-slate-500"}`}>
                  PDF or non-image receipt — open in a new tab to view.
                </p>
              </div>
              <a
                href={expense.receiptSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  northStar
                    ? "inline-flex items-center gap-2 rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-4 py-2.5 text-sm font-semibold text-[#17130E] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028]"
                    : "inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
                }
              >
                <ExternalLink className="h-4 w-4" />
                Open receipt
              </a>
            </div>
          ) : null}
        </AltairDialogBody>
      </AltairDialogContent>
    </AltairDialog>
  );
}
