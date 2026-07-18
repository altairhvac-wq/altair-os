import { formatDate } from "@/shared/types/customer";
import type { EstimateDetail } from "@/shared/types/estimate";
import { EstimateSignatureCaptureAction } from "@/shared/components/estimates/EstimateSignatureCaptureAction";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { EstimateStatusActions } from "@/shared/components/estimates/EstimateStatusActions";
import {
  northStarDetailTokens as dt,
} from "@/shared/design-system/north-star/tokens";
import { formatEstimateRelationshipLine } from "@/shared/lib/documents/relationship-labels";
import type { BillingSignature } from "@/shared/types/billing-signature";

type EstimateDetailNorthStarHeaderProps = {
  estimate: EstimateDetail;
  canManageEstimates: boolean;
  canCaptureSignature?: boolean;
  signature?: BillingSignature | null;
  customerEmailBlockReason: string | null;
  lastEmailSentMessage: string | null;
  variant?: "page" | "overlay";
};

function EstimateDetailNorthStarCommandPlate({
  estimate,
  canManageEstimates,
  canCaptureSignature = false,
  signature,
  customerEmailBlockReason,
  lastEmailSentMessage,
  variant = "page",
}: Pick<
  EstimateDetailNorthStarHeaderProps,
  | "estimate"
  | "canManageEstimates"
  | "canCaptureSignature"
  | "signature"
  | "customerEmailBlockReason"
  | "lastEmailSentMessage"
  | "variant"
>) {
  const showCaptureInPlate = canCaptureSignature && variant !== "overlay";
  const showStatusActions = canManageEstimates;

  if (!showCaptureInPlate && !showStatusActions) {
    return null;
  }

  return (
    <div className={`${dt.commandPlate} no-print hidden sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2`}>
      {showCaptureInPlate ? (
        <EstimateSignatureCaptureAction
          estimate={estimate}
          signature={signature}
          canCaptureSignature={canCaptureSignature}
          northStar
        />
      ) : null}
      {showStatusActions ? (
        <EstimateStatusActions
          estimate={estimate}
          canManageEstimates={canManageEstimates}
          customerEmailBlockReason={customerEmailBlockReason}
          lastEmailSentMessage={lastEmailSentMessage}
          northStar
        />
      ) : null}
    </div>
  );
}

export function EstimateDetailNorthStarHeader({
  estimate,
  canManageEstimates,
  canCaptureSignature = false,
  signature,
  customerEmailBlockReason,
  lastEmailSentMessage,
  variant = "page",
}: EstimateDetailNorthStarHeaderProps) {
  const commandPlate = (
    <EstimateDetailNorthStarCommandPlate
      estimate={estimate}
      canManageEstimates={canManageEstimates}
      canCaptureSignature={canCaptureSignature}
      signature={signature}
      customerEmailBlockReason={customerEmailBlockReason}
      lastEmailSentMessage={lastEmailSentMessage}
      variant={variant}
    />
  );

  if (variant === "overlay") {
    return commandPlate;
  }

  return (
    <>
      <div className={`${dt.heroShell} no-print`}>
        <div aria-hidden="true" className={dt.heroAccentRail} />

        <div className="min-w-0">
          <p className={dt.heroEyebrow}>Estimate</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className={dt.heroTitle}>{estimate.estimateNumber}</h1>
            <EstimateStatusBadge status={estimate.status} />
          </div>

          <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 ${dt.heroMeta}`}>
            <span>
              {formatEstimateRelationshipLine({
                jobNumber: estimate.jobNumber,
                customerName: estimate.customerName,
              })}
            </span>
          </div>
          <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 ${dt.heroMeta}`}>
            <span>Created {formatDate(estimate.createdAt)}</span>
            {estimate.validUntil ? (
              <>
                <span className="text-[#8A6324]">·</span>
                <span>Valid until {formatDate(estimate.validUntil)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {commandPlate}
    </>
  );
}
