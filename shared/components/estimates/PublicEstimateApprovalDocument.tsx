import type { ReactNode } from "react";
import type { PublicEstimateApprovalView } from "@/shared/types/public-estimate-approval";
import { EstimateDocumentSection } from "@/shared/components/billing/EstimateDocumentSection";

type PublicEstimateApprovalDocumentProps = {
  view: PublicEstimateApprovalView;
  afterCustomer?: ReactNode;
};

export function PublicEstimateApprovalDocument({
  view,
  afterCustomer,
}: PublicEstimateApprovalDocumentProps) {
  const company = view.company;
  const estimate = view.estimate;

  if (!company || !estimate) {
    return null;
  }

  return (
    <EstimateDocumentSection
      estimate={estimate}
      company={company}
      showStatusBadge={false}
      showSignature={false}
      showFooter
      customerSectionLabel="Prepared for"
      showApprovalGuidance
      afterCustomer={afterCustomer}
    />
  );
}
