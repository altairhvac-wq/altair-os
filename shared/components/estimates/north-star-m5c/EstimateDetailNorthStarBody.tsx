import type { EstimateDetail } from "@/shared/types/estimate";
import type { InvoiceDetail } from "@/shared/types/invoice";
import type { EstimateActivity } from "@/shared/types/estimate-activity";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";
import type { BillingSignature } from "@/shared/types/billing-signature";
import { EstimateActivityTimeline } from "@/shared/components/estimates/EstimateActivityTimeline";
import { NorthStarAdminEstimateDocument } from "./NorthStarAdminEstimateDocument";
import { EstimateSignatureCaptureAction } from "@/shared/components/estimates/EstimateSignatureCaptureAction";
import { EstimateStatusActions } from "@/shared/components/estimates/EstimateStatusActions";
import { FocusedDocumentOverlayFooter } from "@/shared/components/layout/FocusedDocumentOverlay";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { EstimateDetailNorthStarHeader } from "./EstimateDetailNorthStarHeader";
import { EstimateDetailNorthStarSideRail } from "./EstimateDetailNorthStarSideRail";

type EstimateDetailNorthStarBodyProps = {
  estimate: EstimateDetail;
  activities: EstimateActivity[];
  linkedInvoice?: InvoiceDetail | null;
  company: BillingCompanyContact;
  companyTimeZone: string;
  canManageEstimates: boolean;
  canManageCustomers: boolean;
  canCaptureSignature: boolean;
  signature?: BillingSignature | null;
  customerEmailBlockReason: string | null;
  lastEmailSentMessage: string | null;
  presentation: "page" | "overlay";
};

function MobileStickyActions({
  estimate,
  canManageEstimates,
  customerEmailBlockReason,
  lastEmailSentMessage,
  variant,
}: {
  estimate: EstimateDetail;
  canManageEstimates: boolean;
  customerEmailBlockReason: string | null;
  lastEmailSentMessage: string | null;
  variant: "sticky" | "overlay-footer";
}) {
  if (!canManageEstimates) {
    return null;
  }

  const actions = (
    <EstimateStatusActions
      estimate={estimate}
      canManageEstimates={canManageEstimates}
      customerEmailBlockReason={customerEmailBlockReason}
      lastEmailSentMessage={lastEmailSentMessage}
      variant={variant}
      northStar
    />
  );

  if (variant === "overlay-footer") {
    return <FocusedDocumentOverlayFooter>{actions}</FocusedDocumentOverlayFooter>;
  }

  return actions;
}

export function EstimateDetailNorthStarBody({
  estimate,
  activities,
  linkedInvoice,
  company,
  companyTimeZone,
  canManageEstimates,
  canManageCustomers,
  canCaptureSignature,
  signature,
  customerEmailBlockReason,
  lastEmailSentMessage,
  presentation,
}: EstimateDetailNorthStarBodyProps) {
  const isOverlay = presentation === "overlay";

  const documentSection = (
    <NorthStarAdminEstimateDocument
      estimate={estimate}
      company={company}
      signature={signature}
      companyTimeZone={companyTimeZone}
      logoUrl={company.logoUrl}
    />
  );

  const activitySection = (
    <div className="no-print">
      <EstimateActivityTimeline activities={activities} northStar />
    </div>
  );

  const sideRail = (
    <EstimateDetailNorthStarSideRail
      estimate={estimate}
      linkedInvoice={linkedInvoice}
      canManageCustomers={canManageCustomers}
    />
  );

  const workspace = (
    <>
      <div className="flex flex-col gap-2.5 lg:hidden">
        <div className="no-print space-y-2.5">{sideRail}</div>
        {documentSection}
        {activitySection}
      </div>

      <div className={`hidden lg:grid ${dt.workspaceGrid}`}>
        <div className={dt.workspaceMain}>
          {documentSection}
          {activitySection}
        </div>
        <aside className={dt.workspaceSide}>{sideRail}</aside>
      </div>
    </>
  );

  return (
    <>
      <EstimateDetailNorthStarHeader
        estimate={estimate}
        canManageEstimates={canManageEstimates}
        canCaptureSignature={canCaptureSignature}
        signature={signature}
        customerEmailBlockReason={customerEmailBlockReason}
        lastEmailSentMessage={lastEmailSentMessage}
        variant={isOverlay ? "overlay" : "page"}
      />

      {workspace}

      {canCaptureSignature ? (
        <EstimateSignatureCaptureAction
          estimate={estimate}
          signature={signature}
          canCaptureSignature={canCaptureSignature}
          northStar
          className="no-print sm:hidden"
        />
      ) : null}

      <MobileStickyActions
        estimate={estimate}
        canManageEstimates={canManageEstimates}
        customerEmailBlockReason={customerEmailBlockReason}
        lastEmailSentMessage={lastEmailSentMessage}
        variant={isOverlay ? "overlay-footer" : "sticky"}
      />
    </>
  );
}
