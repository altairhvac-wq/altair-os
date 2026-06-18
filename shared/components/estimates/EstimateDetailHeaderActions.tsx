"use client";

import { Printer } from "lucide-react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { EstimateSignatureCaptureAction } from "@/shared/components/estimates/EstimateSignatureCaptureAction";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import type { BillingSignature } from "@/shared/types/billing-signature";
import type { EstimateDetail } from "@/shared/types/estimate";

type EstimateDetailHeaderActionsProps = {
  estimate: Pick<
    EstimateDetail,
    "id" | "estimateNumber" | "customerId" | "jobId"
  >;
  canCaptureSignature?: boolean;
  signature?: BillingSignature | null;
};

export function EstimateDetailHeaderActions({
  estimate,
  canCaptureSignature = false,
  signature,
}: EstimateDetailHeaderActionsProps) {
  const northStar = isNorthStarShellEnabled();

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <EstimateSignatureCaptureAction
        estimate={estimate}
        signature={signature}
        canCaptureSignature={canCaptureSignature}
        northStar={northStar}
      />
      <button
        type="button"
        onClick={handlePrint}
        className={
          northStar
            ? dt.tertiaryAction
            : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        }
      >
        <Printer className="h-4 w-4" />
        <span className="hidden sm:inline">Print</span>
      </button>
    </div>
  );
}
