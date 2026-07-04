import type { PlatformBrainSnapshot } from "@/shared/types/platform-admin";
import { PlatformActivationFunnelPanel } from "./PlatformActivationFunnelPanel";
import { PlatformMissionHero } from "./PlatformMissionHero";
import { PlatformNeedsAttentionPanel } from "./PlatformNeedsAttentionPanel";

type PlatformBrainFoundationProps = {
  brain: PlatformBrainSnapshot;
  northStar?: boolean;
};

export function PlatformBrainFoundation({
  brain,
  northStar = false,
}: PlatformBrainFoundationProps) {
  return (
    <>
      <PlatformMissionHero brain={brain} northStar={northStar} />
      <PlatformNeedsAttentionPanel brain={brain} northStar={northStar} />
      <PlatformActivationFunnelPanel
        funnel={brain.activationFunnel}
        northStar={northStar}
      />
    </>
  );
}
