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
  const closeDisabled = isSubmitting || showSuccess;

  function handleSaved() {
    setShowSuccess(true);
    onSaved?.();
    window.setTimeout(() => {
      onClose();
    }, 700);
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
          <MobileSheetSuccess
            title="Receipt saved"
            subtitle={
              jobNumber ? `Linked to ${jobNumber}` : "Ready for review"
            }
          />
        ) : (
          <>
            <MobileSheetBody>
              <TechnicianExpenseForm
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
