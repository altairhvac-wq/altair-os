import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { DashboardNorthStarLoadingState } from "@/shared/components/dashboard/north-star-m2";
import { OperationalDashboardLoadingState } from "@/shared/components/dashboard/OperationalDashboardLoadingState";

export default function DashboardLoading() {
  if (isNorthStarShellEnabled()) {
    return <DashboardNorthStarLoadingState />;
  }

  return <OperationalDashboardLoadingState />;
}
