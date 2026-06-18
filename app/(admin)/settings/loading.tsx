import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { SettingsLoadingState } from "@/shared/components/settings/SettingsLoadingState";
import { SettingsNorthStarLoadingState } from "@/shared/components/settings/north-star-m10";

export default function SettingsLoading() {
  if (isNorthStarShellEnabled()) {
    return <SettingsNorthStarLoadingState />;
  }

  return <SettingsLoadingState />;
}
