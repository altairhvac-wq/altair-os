"use client";

import { useEffect } from "react";
import { Receipt, X } from "lucide-react";
import { TechnicianExpenseForm } from "./TechnicianExpenseForm";

type TechnicianExpenseSheetProps = {
  jobId?: string;
  jobNumber?: string;
  onClose: () => void;
  onSaved?: () => void;
};

export function TechnicianExpenseSheet({
  jobId,
  jobNumber,
  onClose,
  onSaved,
}: TechnicianExpenseSheetProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function handleSaved() {
    onSaved?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="technician-expense-sheet-title"
    >
      <button
        type="button"
        aria-label="Close receipt form"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-600/15">
            <Receipt className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="technician-expense-sheet-title"
              className="text-base font-bold text-slate-900"
            >
              Snap receipt
            </h2>
            <p className="text-sm text-slate-500">
              Photo, amount, and move on
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <TechnicianExpenseForm
            jobId={jobId}
            jobNumber={jobNumber}
            onSuccess={handleSaved}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
