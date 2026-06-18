import type { ReactNode } from "react";
import type { PublicEstimateApprovalView } from "@/shared/types/public-estimate-approval";
import { EstimateDocumentSection } from "@/shared/components/billing/EstimateDocumentSection";

type PublicEstimateApprovalDocumentProps = {
  view: PublicEstimateApprovalView;
  /** Customer actions (approve, signature) rendered outside the printable document. */
  customerActions?: ReactNode;
};

export function PublicEstimateApprovalDocument({
  view,
  customerActions,
}: PublicEstimateApprovalDocumentProps) {
  const company = view.company;
  const estimate = view.estimate;

  if (!company || !estimate) {
    return null;
  }

  return (
    <>
      <EstimateDocumentSection
        estimate={estimate}
        company={company}
        showStatusBadge={false}
        customerSectionLabel="Prepared for"
        documentAudience="customer"
        layoutVariant="public"
      />

      {customerActions ? (
        <div
          className="estimate-customer-actions mt-3 min-w-0 print:hidden"
          data-estimate-customer-actions
        >
          {customerActions}
        </div>
      ) : null}
    </>
  );
}
