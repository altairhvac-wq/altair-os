import { notFound } from "next/navigation";
import { canCaptureBillingSignature } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listEstimateActivitiesForEstimate } from "@/lib/database/queries/estimate-activities";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { getInvoiceByEstimateId } from "@/lib/database/queries/invoices";
import { getBillingSignatureForEntity } from "@/lib/database/queries/billing-signatures";
import { getJobById } from "@/lib/database/queries/jobs";
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
  let canCaptureSignature = canManageEstimates;

  if (!canCaptureSignature && estimate.jobId) {
    const job = await getJobById(companyContext.company.id, estimate.jobId);
    canCaptureSignature = canCaptureBillingSignature(
      companyContext,
      "estimate",
      job,
    );
  }

  const company = mapCompanyRowToBillingContact(companyContext.company);

  const detailView = (
    <EstimateDetailPageView
      estimate={estimate}
      activities={activities}
      linkedInvoice={linkedInvoice}
      company={company}
      companyTimeZone={companyContext.company.timezone}
      canManageEstimates={canManageEstimates}
      canManageCustomers={companyContext.permissions.manageCustomers}
      canCaptureSignature={canCaptureSignature}
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
        headerTrailing={<EstimateDetailHeaderActions />}
      >
        {detailView}
      </EstimateDetailOverlayShell>
    );
  }

  return detailView;
}
