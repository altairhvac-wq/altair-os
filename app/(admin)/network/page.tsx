import { isAlphaHardeningEnabled } from "@/lib/beta/alpha-hardening";
import { ComingSoonView } from "@/shared/components/layout/ComingSoonView";
import { NetworkPageView } from "@/shared/components/network/NetworkPageView";

export default function NetworkPage() {
  if (isAlphaHardeningEnabled()) {
    return (
      <ComingSoonView
        title="Network coming soon"
        description="Subcontractor networking and bid workflows are in development and hidden during the internal alpha."
      />
    );
  }

  return <NetworkPageView />;
}
