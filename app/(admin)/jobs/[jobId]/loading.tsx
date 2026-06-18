import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { JobDetailLoadingState } from "@/shared/components/jobs/JobDetailLoadingState";
import { JobDetailNorthStarLoadingState } from "@/shared/components/jobs/north-star-m4b";

export default function JobDetailLoading() {
  if (isNorthStarShellEnabled()) {
    return <JobDetailNorthStarLoadingState />;
  }

  return <JobDetailLoadingState />;
}
