"use client";

import { BillingSignatureCaptureSheet } from "@/shared/components/billing/BillingSignatureCaptureSheet";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import type { BillingSignature } from "@/shared/types/billing-signature";
import type { EstimateDetail } from "@/shared/types/estimate";

type EstimateSignatureCaptureActionProps = {
  estimate: Pick<
    EstimateDetail,
    "id" | "estimateNumber" | "customerId" | "jobId"
  >;
  signature?: BillingSignature | null;
  canCaptureSignature: boolean;
  northStar?: boolean;
  className?: string;
};

const legacyTriggerClassName =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50";

export function EstimateSignatureCaptureAction({
  estimate,
  signature,
  canCaptureSignature,
  northStar = false,
  className = "",
}: EstimateSignatureCaptureActionProps) {
  if (!canCaptureSignature) {
    return null;
  }

  return (
    <div className={`no-print ${className}`}>
      <BillingSignatureCaptureSheet
        entityType="estimate"
        entityId={estimate.id}
        documentNumber={estimate.estimateNumber}
        customerId={estimate.customerId}
        jobId={estimate.jobId}
        existingSignature={signature}
        triggerClassName={northStar ? dt.secondaryAction : legacyTriggerClassName}
      />
    </div>
  );
}
