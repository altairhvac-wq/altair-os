import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { SettingsLoadingState } from "@/shared/components/settings/SettingsLoadingState";

export default function SettingsLoading() {
  return <SettingsLoadingState northStar={isNorthStarShellEnabled()} />;
}
