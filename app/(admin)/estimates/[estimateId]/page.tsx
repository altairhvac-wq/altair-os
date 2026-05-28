import { notFound, redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { listEstimateActivitiesForEstimate } from "@/lib/database/queries/estimate-activities";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { getInvoiceByEstimateId } from "@/lib/database/queries/invoices";
import { getBillingSignatureForEntity } from "@/lib/database/queries/billing-signatures";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
import { EstimateDetailPageView } from "@/shared/components/estimates/EstimateDetailPageView";

type EstimateDetailPageProps = {
  params: Promise<{ estimateId: string }>;
};

export default async function EstimateDetailPage({
  params,
}: EstimateDetailPageProps) {
  const { estimateId } = await params;
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canViewBilling(companyContext)) {
    return (
      <UnauthorizedAccessView description="Estimate records are limited to billing and admin roles." />
    );
  }

  if (shouldShowAlphaComingSoon("/estimates")) {
    return (
      <ComingSoonView
        title="Estimates coming soon"
        description="Estimate details are temporarily unavailable during the internal alpha rollout."
      />
    );
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

  return (
    <EstimateDetailPageView
      estimate={estimate}
      activities={activities}
      linkedInvoice={linkedInvoice}
      company={mapCompanyRowToBillingContact(companyContext.company)}
      companyTimeZone={companyContext.company.timezone}
      canManageEstimates={companyContext.permissions.manageBilling}
      signature={signature}
    />
  );
}
