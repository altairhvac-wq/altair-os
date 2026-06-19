import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import {
  DispatchLoadingState,
  DispatchNorthStarLoadingState,
} from "@/shared/components/dispatch/DispatchLoadingState";

export default function DispatchLoading() {
  if (isNorthStarShellEnabled()) {
    return <DispatchNorthStarLoadingState />;
  }

  return <DispatchLoadingState />;
}
