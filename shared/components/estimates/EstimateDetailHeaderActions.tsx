"use client";

import { Printer } from "lucide-react";
import { BillingSignatureCaptureSheet } from "@/shared/components/billing/BillingSignatureCaptureSheet";
import type { BillingSignature } from "@/shared/types/billing-signature";

type EstimateDetailHeaderActionsProps = {
  estimateId: string;
  estimateNumber: string;
  customerId: string;
  jobId: string | null;
  canManageEstimates: boolean;
  signature?: BillingSignature | null;
};

export function EstimateDetailHeaderActions({
  estimateId,
  estimateNumber,
  customerId,
  jobId,
  canManageEstimates,
  signature,
}: EstimateDetailHeaderActionsProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <>
      {canManageEstimates ? (
        <BillingSignatureCaptureSheet
          entityType="estimate"
          entityId={estimateId}
          documentNumber={estimateNumber}
          customerId={customerId}
          jobId={jobId}
          existingSignature={signature}
        />
      ) : null}
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Print</span>
      </button>
    </>
  );
}
