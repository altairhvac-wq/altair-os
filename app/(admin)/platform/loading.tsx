import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { PlatformNorthStarLoadingState } from "@/shared/components/platform-admin/north-star-m13";

export default function PlatformLoading() {
  if (isNorthStarShellEnabled()) {
    return <PlatformNorthStarLoadingState />;
  }

  return null;
}
