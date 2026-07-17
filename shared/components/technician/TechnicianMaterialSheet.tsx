"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import type { ServiceItem } from "@/shared/types/service-item";
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
import { TechnicianMaterialForm } from "./TechnicianMaterialForm";

type TechnicianMaterialSheetProps = {
  jobId: string;
  jobNumber?: string;
  serviceItems: ServiceItem[];
  onClose: () => void;
  onSaved?: () => void;
};

const TITLE_ID = "technician-material-sheet-title";

export function TechnicianMaterialSheet({
  jobId,
  jobNumber,
  serviceItems,
  onClose,
  onSaved,
}: TechnicianMaterialSheetProps) {
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
          title="Log material"
          subtitle="Record parts or supplies used on site"
          onClose={onClose}
          closeDisabled={closeDisabled}
          icon={
            <MobileSheetHeaderIcon className="bg-cyan-50 ring-1 ring-cyan-600/15">
              <Package className="h-5 w-5 text-cyan-600" />
            </MobileSheetHeaderIcon>
          }
        />

        {showSuccess ? (
          <>
            <MobileSheetSuccess
              title="Material logged"
              subtitle="Saved to this job"
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
              <TechnicianMaterialForm
                key={formKey}
                jobId={jobId}
                jobNumber={jobNumber}
                serviceItems={serviceItems}
                onSuccess={handleSaved}
                onCancel={onClose}
                onSubmittingChange={setIsSubmitting}
              />
            </MobileSheetBody>
            <MobileSheetFooter>
              <MobileSheetFooterActions
                onCancel={onClose}
                submitLabel="Log material"
                submittingLabel="Saving..."
                submitForm="technician-material-form"
                isSubmitting={isSubmitting}
              />
            </MobileSheetFooter>
          </>
        )}
      </MobileSheetPanel>
    </MobileSheet>
  );
}
