import type { EstimateDetail } from "@/shared/types/estimate";
import { EstimateSignatureCaptureAction } from "@/shared/components/estimates/EstimateSignatureCaptureAction";
import { EstimateStatusBadge } from "@/shared/components/estimates/EstimateStatusBadge";
import { EstimateStatusActions } from "@/shared/components/estimates/EstimateStatusActions";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
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
    <div className="no-print flex flex-wrap items-center justify-end gap-2">
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

  // Dates / customer live on the printable document + side rail — keep header
  // to identity (number + status) and actions only.
  return (
    <section className="no-print space-y-2">
      <SectionHeader title="Estimate" />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-altair-ink-on-paper sm:text-xl">
                {estimate.estimateNumber}
              </h1>
              <EstimateStatusBadge status={estimate.status} />
            </div>
          </div>
          <div className="hidden sm:block">{commandPlate}</div>
        </div>
      </div>
    </section>
  );
}
