"use client";

import { BillingSignatureBlock } from "./BillingSignatureBlock";
import { BillingSignatureCaptureSheet } from "./BillingSignatureCaptureSheet";
import type { BillingDocumentStyle } from "@/shared/lib/billing-document-style";
import type { BillingSignatureBlockVariant } from "@/shared/lib/billing-signature-block";
import type { BillingSignature } from "@/shared/types/billing-signature";

export type BillingSignatureCaptureContext = {
  entityId: string;
  documentNumber: string;
  customerId: string;
  jobId?: string | null;
};

type BillingSignatureSectionProps = {
  variant: BillingSignatureBlockVariant;
  signature?: BillingSignature | null;
  companyTimeZone?: string;
  documentStyle?: BillingDocumentStyle;
  className?: string;
  canCaptureSignature?: boolean;
  captureContext?: BillingSignatureCaptureContext;
  /** Tighter layout for estimate documents. */
  compact?: boolean;
  /** Hide signature lines on screen; visible only when printing. */
  hideSignatureOnScreen?: boolean;
  /** Render the capture-signature action beside this section. */
  showCaptureAction?: boolean;
  /** Compact blank lines for print/PDF (estimate documents). */
  printTemplate?: boolean;
};

const captureTriggerClassName =
  "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto";

export function BillingSignatureSection({
  variant,
  signature,
  companyTimeZone,
  documentStyle = "default",
  className = "",
  canCaptureSignature = false,
  captureContext,
  compact = false,
  hideSignatureOnScreen = false,
  showCaptureAction = true,
  printTemplate = false,
}: BillingSignatureSectionProps) {
  const showCapture =
    canCaptureSignature && captureContext != null && showCaptureAction;

  return (
    <>
      <div className={`estimate-signature-block ${className}`}>
        <BillingSignatureBlock
          variant={variant}
          signature={signature}
          companyTimeZone={companyTimeZone}
          documentStyle={documentStyle}
          compact={compact}
          printTemplate={printTemplate}
        />
      </div>

      {showCapture ? (
        <div className="no-print mt-2.5 flex justify-start sm:justify-end print:hidden">
          <BillingSignatureCaptureSheet
            entityType={variant}
            entityId={captureContext.entityId}
            documentNumber={captureContext.documentNumber}
            customerId={captureContext.customerId}
            jobId={captureContext.jobId}
            existingSignature={signature}
            triggerClassName={captureTriggerClassName}
          />
        </div>
      ) : null}
    </>
  );
}
