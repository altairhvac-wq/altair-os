"use client";

import { useEffect, useState } from "react";
import { Package, X } from "lucide-react";
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianMaterialForm } from "./TechnicianMaterialForm";

type TechnicianMaterialSheetProps = {
  jobId: string;
  jobNumber?: string;
  serviceItems: ServiceItem[];
  onClose: () => void;
  onSaved?: () => void;
};

export function TechnicianMaterialSheet({
  jobId,
  jobNumber,
  serviceItems,
  onClose,
  onSaved,
}: TechnicianMaterialSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
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
  }, [isSubmitting, onClose]);

  function handleSaved() {
    onSaved?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="technician-material-sheet-title"
    >
      <button
        type="button"
        aria-label="Close material form"
        onClick={onClose}
        disabled={isSubmitting}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl">
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 ring-1 ring-cyan-600/15">
            <Package className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="technician-material-sheet-title"
              className="text-base font-bold text-slate-900"
            >
              Log material
            </h2>
            <p className="text-sm text-slate-500">
              Record parts or supplies used on site
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
          data-no-pull-refresh
        >
          <TechnicianMaterialForm
            jobId={jobId}
            jobNumber={jobNumber}
            serviceItems={serviceItems}
            onSuccess={handleSaved}
            onCancel={onClose}
            onSubmittingChange={setIsSubmitting}
          />
        </div>

        <footer className="flex shrink-0 gap-3 border-t border-slate-100 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="technician-material-form"
            disabled={isSubmitting}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-cyan-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Log material"}
          </button>
        </footer>
      </div>
    </div>
  );
}
