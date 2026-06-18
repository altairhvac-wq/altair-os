import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { ReportsNorthStarLoadingState } from "@/shared/components/reports/north-star-m8";
import { ReportsLoadingState } from "@/shared/components/reports/ReportsLoadingState";

export default function ReportsLoading() {
  if (isNorthStarShellEnabled()) {
    return <ReportsNorthStarLoadingState />;
  }

  return <ReportsLoadingState />;
}
