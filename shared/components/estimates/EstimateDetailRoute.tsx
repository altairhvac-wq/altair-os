import { notFound } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listEstimateActivitiesForEstimate } from "@/lib/database/queries/estimate-activities";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { getInvoiceByEstimateId } from "@/lib/database/queries/invoices";
import { getBillingSignatureForEntity } from "@/lib/database/queries/billing-signatures";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
import { EstimateDetailHeaderActions } from "./EstimateDetailHeaderActions";
import { EstimateDetailOverlayShell } from "./EstimateDetailOverlayShell";
import { EstimateDetailPageView } from "./EstimateDetailPageView";
import { EstimateStatusBadge } from "./EstimateStatusBadge";

type EstimateDetailRouteProps = {
  estimateId: string;
  presentation?: "page" | "overlay";
};

export async function EstimateDetailRoute({
  estimateId,
  presentation = "page",
}: EstimateDetailRouteProps) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    notFound();
  }

  const [estimate, activities, linkedInvoice, signature] = await Promise.all([
    getEstimateById(companyContext.company.id, estimateId),
    listEstimateActivitiesForEstimate(companyContext.company.id, estimateId),
    getInvoiceByEstimateId(companyContext.company.id, estimateId),
    getBillingSignatureForEntity(
      companyContext.company.id,
      "estimate",
      estimateId,
    ),
  ]);

  if (!estimate) {
    notFound();
  }

  const canManageEstimates = companyContext.permissions.manageBilling;
  const company = mapCompanyRowToBillingContact(companyContext.company);

  const detailView = (
    <EstimateDetailPageView
      estimate={estimate}
      activities={activities}
      linkedInvoice={linkedInvoice}
      company={company}
      companyTimeZone={companyContext.company.timezone}
      canManageEstimates={canManageEstimates}
      signature={signature}
      presentation={presentation}
    />
  );

  if (presentation === "overlay") {
    return (
      <EstimateDetailOverlayShell
        title={estimate.estimateNumber}
        subtitle={estimate.customerName}
        headerAside={<EstimateStatusBadge status={estimate.status} />}
        headerTrailing={
          <EstimateDetailHeaderActions
            estimateId={estimate.id}
            estimateNumber={estimate.estimateNumber}
            customerId={estimate.customerId}
            jobId={estimate.jobId ?? null}
            canManageEstimates={canManageEstimates}
            signature={signature}
          />
        }
      >
        {detailView}
      </EstimateDetailOverlayShell>
    );
  }

  return detailView;
}
