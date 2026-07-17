"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  FileText,
  Package,
  Receipt,
  StickyNote,
} from "lucide-react";
import { getTechnicianJobWorkHistoryAction } from "@/app/actions/technician-job-work-history";
import {
  formatExpenseAmount,
  formatExpenseCategory,
  isExpenseReceiptImageFile,
  type Expense,
} from "@/shared/types/expense";
import {
  isJobAttachmentImage,
  type JobAttachment,
} from "@/shared/types/job-attachment";
import {
  formatJobMaterialQuantity,
  type JobMaterial,
} from "@/shared/types/job-material";
import {
  technicianFieldJobDetailsClass,
  technicianFieldJobDetailsSummaryClass,
  technicianFieldSectionLabelClass,
} from "./technician-field-styles";

type TechnicianJobWorkHistoryProps = {
  jobId: string;
  notes?: string;
  description?: string;
};

export function TechnicianJobWorkHistory({
  jobId,
  notes,
  description,
}: TechnicianJobWorkHistoryProps) {
  const [attachments, setAttachments] = useState<JobAttachment[]>([]);
  const [materials, setMaterials] = useState<JobMaterial[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trimmedNotes = notes?.trim() ?? "";
  const trimmedDescription = description?.trim() ?? "";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await getTechnicianJobWorkHistoryAction(jobId);
      if (cancelled) {
        return;
      }

      if (result.error) {
        setError(result.error);
        setAttachments([]);
        setMaterials([]);
        setExpenses([]);
        setIsLoading(false);
        return;
      }

      setError(null);
      setAttachments(result.attachments ?? []);
      setMaterials(result.materials ?? []);
      setExpenses(result.expenses ?? []);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const receiptExpenses = expenses.filter(
    (expense) => expense.receiptStatus === "attached" || expense.amount != null,
  );
  const hasLoggedWork =
    attachments.length > 0 || materials.length > 0 || receiptExpenses.length > 0;
  const hasNotes = Boolean(trimmedNotes || trimmedDescription);

  if (!isLoading && !error && !hasLoggedWork && !hasNotes) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className={technicianFieldSectionLabelClass}>On this job</h3>

      {isLoading ? (
        <p className="px-0.5 text-sm text-slate-500">Loading work history…</p>
      ) : null}

      {error ? (
        <p className="px-0.5 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      {!isLoading && !error && hasLoggedWork ? (
        <div className="space-y-2">
          {attachments.length > 0 ? (
            <details className={technicianFieldJobDetailsClass} open>
              <summary className={technicianFieldJobDetailsSummaryClass}>
                <Camera className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                Photos ({attachments.length})
              </summary>
              <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
                {attachments.slice(0, 9).map((attachment) => {
                  const isImage = isJobAttachmentImage(attachment.mimeType);
                  return (
                    <div
                      key={attachment.id}
                      className="aspect-square overflow-hidden rounded-lg bg-slate-100"
                    >
                      {isImage && attachment.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachment.signedUrl}
                          alt={attachment.caption ?? attachment.fileName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[10px] font-medium text-slate-500">
                          {attachment.fileName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}

          {materials.length > 0 ? (
            <details className={technicianFieldJobDetailsClass} open>
              <summary className={technicianFieldJobDetailsSummaryClass}>
                <Package className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
                Materials ({materials.length})
              </summary>
              <ul className="space-y-1.5 px-3 pb-3">
                {materials.map((material) => (
                  <li
                    key={material.id}
                    className="flex items-baseline justify-between gap-2 text-sm text-slate-800"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {material.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-500">
                      ×{formatJobMaterialQuantity(material.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {receiptExpenses.length > 0 ? (
            <details className={technicianFieldJobDetailsClass} open>
              <summary className={technicianFieldJobDetailsSummaryClass}>
                <Receipt className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                Receipts ({receiptExpenses.length})
              </summary>
              <ul className="space-y-2 px-3 pb-3">
                {receiptExpenses.map((expense) => {
                  const showThumb =
                    expense.receiptSignedUrl &&
                    isExpenseReceiptImageFile(expense.receiptFileName);
                  return (
                    <li
                      key={expense.id}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      {showThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={expense.receiptSignedUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md object-cover bg-slate-100"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50">
                          <Receipt className="h-4 w-4 text-amber-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">
                          {expense.merchant || formatExpenseCategory(expense.category)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatExpenseAmount(expense.amount)}
                          {" · "}
                          {formatExpenseCategory(expense.category)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {hasNotes ? (
        <div className="space-y-2">
          {trimmedNotes ? (
            <details className={technicianFieldJobDetailsClass} open>
              <summary className={technicianFieldJobDetailsSummaryClass}>
                <StickyNote className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                Office notes
              </summary>
              <p className="px-3 pb-3 text-sm leading-snug text-slate-700">
                {trimmedNotes}
              </p>
            </details>
          ) : null}
          {trimmedDescription ? (
            <details className={technicianFieldJobDetailsClass} open>
              <summary className={technicianFieldJobDetailsSummaryClass}>
                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                Summary
              </summary>
              <p className="px-3 pb-3 text-sm leading-snug text-slate-800">
                {trimmedDescription}
              </p>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
