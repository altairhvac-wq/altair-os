import { notFound, redirect } from "next/navigation";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { listEstimateActivitiesForEstimate } from "@/lib/database/queries/estimate-activities";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { getInvoiceByEstimateId } from "@/lib/database/queries/invoices";
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

  if (shouldShowAlphaComingSoon("/estimates")) {
    return (
      <ComingSoonView
        title="Estimates coming soon"
        description="Estimate details are temporarily unavailable during the internal alpha rollout."
      />
    );
  }

  const [estimate, activities, linkedInvoice] = await Promise.all([
    getEstimateById(companyContext.company.id, estimateId),
    listEstimateActivitiesForEstimate(companyContext.company.id, estimateId),
    getInvoiceByEstimateId(companyContext.company.id, estimateId),
  ]);

  if (!estimate) {
    notFound();
  }

  return (
    <EstimateDetailPageView
      estimate={estimate}
      activities={activities}
      linkedInvoice={linkedInvoice}
      canManageEstimates={companyContext.permissions.manageBilling}
    />
  );
}
