import { redirect } from "next/navigation";
import { canViewBilling } from "@/lib/database/access-control";
import { shouldShowAlphaComingSoon } from "@/lib/beta/alpha-hardening";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { EstimateDetailRoute } from "@/shared/components/estimates/EstimateDetailRoute";

type InterceptedEstimateDetailPageProps = {
  params: Promise<{ estimateId: string }>;
};

export default async function InterceptedEstimateDetailPage({
  params,
}: InterceptedEstimateDetailPageProps) {
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
        title="Estimates temporarily unavailable"
        description="Estimate details are temporarily unavailable. Check back shortly."
      />
    );
  }

  return (
    <EstimateDetailRoute estimateId={estimateId} presentation="overlay" />
  );
}
