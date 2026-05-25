import { notFound, redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { listEstimateActivitiesForEstimate } from "@/lib/database/queries/estimate-activities";
import { getEstimateById } from "@/lib/database/queries/estimates";
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

  const [estimate, activities] = await Promise.all([
    getEstimateById(companyContext.company.id, estimateId),
    listEstimateActivitiesForEstimate(companyContext.company.id, estimateId),
  ]);

  if (!estimate) {
    notFound();
  }

  return (
    <EstimateDetailPageView
      estimate={estimate}
      activities={activities}
      canManageEstimates={companyContext.permissions.manageBilling}
    />
  );
}
