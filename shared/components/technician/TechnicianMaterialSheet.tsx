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
          <MobileSheetSuccess
            title="Material logged"
            subtitle="Saved to this job"
          />
        ) : (
          <>
            <MobileSheetBody>
              <TechnicianMaterialForm
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
