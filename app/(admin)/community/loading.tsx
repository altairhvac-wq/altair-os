import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { NetworkLoadingState } from "@/shared/components/network/NetworkLoadingState";
import { NetworkNorthStarLoadingState } from "@/shared/components/network/north-star-m11";

export default function NetworkLoading() {
  if (isNorthStarShellEnabled()) {
    return <NetworkNorthStarLoadingState />;
  }

  return <NetworkLoadingState />;
}
