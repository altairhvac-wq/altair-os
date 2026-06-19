import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { LeadsNorthStarLoadingState } from "@/shared/components/leads/north-star-m14";
import { LeadsLoadingState } from "@/shared/components/leads/LeadsLoadingState";

export default function LeadsLoading() {
  if (isNorthStarShellEnabled()) {
    return <LeadsNorthStarLoadingState />;
  }

  return <LeadsLoadingState />;
}
