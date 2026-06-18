import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { AdminTimeTrackingLoadingState } from "@/shared/components/time-clock/AdminTimeTrackingLoadingState";
import { TimeNorthStarLoadingState } from "@/shared/components/time-clock/north-star-m9";

export default function TimeLoading() {
  if (isNorthStarShellEnabled()) {
    return <TimeNorthStarLoadingState />;
  }

  return <AdminTimeTrackingLoadingState />;
}
