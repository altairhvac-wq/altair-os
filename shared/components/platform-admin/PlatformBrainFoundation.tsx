import type { PlatformBrainSnapshot } from "@/shared/types/platform-admin";
import { PlatformActivationFunnelPanel } from "./PlatformActivationFunnelPanel";
import { PlatformCustomerHealthPulse } from "./PlatformCustomerHealthPulse";
import { PlatformMissionHero } from "./PlatformMissionHero";
import { PlatformNeedsAttentionPanel } from "./PlatformNeedsAttentionPanel";
import { PlatformReliabilityPulse } from "./PlatformReliabilityPulse";

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
      <PlatformReliabilityPulse reliability={brain.reliability} northStar={northStar} />
      <PlatformCustomerHealthPulse
        customerHealth={brain.customerHealth}
        northStar={northStar}
      />
      <PlatformNeedsAttentionPanel brain={brain} northStar={northStar} />
      <PlatformActivationFunnelPanel
        funnel={brain.activationFunnel}
        northStar={northStar}
      />
    </>
  );
}
