import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { ReportsOverviewLoadingState } from "@/shared/components/reports/overview/ReportsOverviewLoadingState";
import { ReportsLoadingState } from "@/shared/components/reports/ReportsLoadingState";

export default function ReportsLoading() {
  if (isNorthStarShellEnabled()) {
    return <ReportsOverviewLoadingState />;
  }

  return <ReportsLoadingState />;
}
