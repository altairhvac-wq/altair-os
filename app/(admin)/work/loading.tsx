import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { JobsNorthStarLoadingState } from "@/shared/components/jobs/north-star-m4a";
import { JobsLoadingState } from "@/shared/components/jobs/JobsLoadingState";

export default function JobsLoading() {
  if (isNorthStarShellEnabled()) {
    return <JobsNorthStarLoadingState />;
  }

  return <JobsLoadingState />;
}
