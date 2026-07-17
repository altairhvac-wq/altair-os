"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetFooter,
  MobileSheetFooterActions,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
  MobileSheetSuccess,
} from "@/shared/components/ui/mobile-sheet";
import { TechnicianExpenseForm } from "./TechnicianExpenseForm";

type TechnicianExpenseSheetProps = {
  jobId?: string;
  jobNumber?: string;
  onClose: () => void;
  onSaved?: () => void;
};

const TITLE_ID = "technician-expense-sheet-title";

export function TechnicianExpenseSheet({
  jobId,
  jobNumber,
  onClose,
  onSaved,
}: TechnicianExpenseSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const closeDisabled = isSubmitting;

  function handleSaved() {
    setShowSuccess(true);
    onSaved?.();
  }

  function handleAddAnother() {
    setFormKey((current) => current + 1);
    setShowSuccess(false);
  }

  return (
    <MobileSheet
      onClose={onClose}
      closeDisabled={closeDisabled}
      ariaLabelledBy={TITLE_ID}
    >
      <MobileSheetPanel>
        <MobileSheetHeader
          titleId={TITLE_ID}
          title="Snap receipt"
          subtitle="Photo, amount, and move on"
          onClose={onClose}
          closeDisabled={closeDisabled}
          icon={
            <MobileSheetHeaderIcon className="bg-amber-50 ring-1 ring-amber-600/15">
              <Receipt className="h-5 w-5 text-amber-600" />
            </MobileSheetHeaderIcon>
          }
        />

        {showSuccess ? (
          <>
            <MobileSheetSuccess
              title="Receipt saved"
              subtitle={
                jobNumber ? `Linked to ${jobNumber}` : "Ready for review"
              }
            />
            <MobileSheetFooter>
              <div className="grid w-full grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAddAnother}
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  Add another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-12 touch-manipulation items-center justify-center rounded-xl bg-cyan-600 px-3 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-700 active:bg-cyan-800"
                >
                  Done
                </button>
              </div>
            </MobileSheetFooter>
          </>
        ) : (
          <>
            <MobileSheetBody>
              <TechnicianExpenseForm
                key={formKey}
                jobId={jobId}
                jobNumber={jobNumber}
                onSuccess={handleSaved}
                onCancel={onClose}
                onSubmittingChange={setIsSubmitting}
              />
            </MobileSheetBody>
            <MobileSheetFooter>
              <MobileSheetFooterActions
                onCancel={onClose}
                submitLabel="Save receipt"
                submittingLabel="Saving..."
                submitForm="technician-expense-form"
                isSubmitting={isSubmitting}
              />
            </MobileSheetFooter>
          </>
        )}
      </MobileSheetPanel>
    </MobileSheet>
  );
}
