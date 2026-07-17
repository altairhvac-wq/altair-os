"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
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
import type { ServiceItem } from "@/shared/types/service-item";
import { TechnicianEstimateForm } from "./TechnicianEstimateForm";

type TechnicianEstimateSheetProps = {
  jobId: string;
  jobNumber: string;
  customerName: string;
  jobType?: string;
  jobTitle?: string;
  /** When set, continues the existing draft instead of creating a new estimate. */
  estimateId?: string;
  serviceItems: ServiceItem[];
  defaultTaxRate: number;
  aiFeaturesEnabled?: boolean;
  canDraftDescription?: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const TITLE_ID = "technician-estimate-sheet-title";

export function TechnicianEstimateSheet({
  jobId,
  jobNumber,
  customerName,
  jobType,
  jobTitle,
  estimateId,
  serviceItems,
  defaultTaxRate,
  aiFeaturesEnabled = false,
  canDraftDescription = true,
  onClose,
  onSaved,
}: TechnicianEstimateSheetProps) {
  const isContinuingDraft = Boolean(estimateId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedEstimateNumber, setSavedEstimateNumber] = useState<string | null>(
    null,
  );
  const closeDisabled = isSubmitting || showSuccess;

  function handleSaved(estimateNumber: string) {
    setSavedEstimateNumber(estimateNumber);
    setShowSuccess(true);
    onSaved?.();
    window.setTimeout(() => {
      onClose();
    }, 900);
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
          title={isContinuingDraft ? "Finish estimate" : "Create estimate"}
          subtitle={
            isContinuingDraft
              ? "Continue this draft for office review"
              : "Draft quote for office review"
          }
          onClose={onClose}
          closeDisabled={closeDisabled}
          icon={
            <MobileSheetHeaderIcon className="bg-indigo-50 ring-1 ring-indigo-600/15">
              <Calculator className="h-5 w-5 text-indigo-600" />
            </MobileSheetHeaderIcon>
          }
        />

        {showSuccess ? (
          <MobileSheetSuccess
            title="Draft estimate saved"
            subtitle={
              savedEstimateNumber
                ? `${savedEstimateNumber} · Office can review and send`
                : "Office can review and send"
            }
          />
        ) : (
          <>
            <MobileSheetBody>
              <TechnicianEstimateForm
                key={estimateId ?? "create"}
                jobId={jobId}
                jobNumber={jobNumber}
                customerName={customerName}
                jobType={jobType}
                jobTitle={jobTitle}
                estimateId={estimateId}
                serviceItems={serviceItems}
                defaultTaxRate={defaultTaxRate}
                aiFeaturesEnabled={aiFeaturesEnabled}
                canDraftDescription={canDraftDescription}
                onSuccess={handleSaved}
                onCancel={onClose}
                onSubmittingChange={setIsSubmitting}
              />
            </MobileSheetBody>
            <MobileSheetFooter>
              <MobileSheetFooterActions
                onCancel={onClose}
                submitLabel="Save draft"
                submittingLabel="Saving..."
                submitForm="technician-estimate-form"
                isSubmitting={isSubmitting}
              />
            </MobileSheetFooter>
          </>
        )}
      </MobileSheetPanel>
    </MobileSheet>
  );
}
