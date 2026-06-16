import { HeroHeader } from "@/shared/design-system/components/HeroHeader";
import { HorizonHero } from "@/shared/design-system/signature";
import { signatureHeroContentClass } from "@/shared/design-system/shell/tokens";
import { buildDashboardSignatureHeroContent } from "@/shared/lib/dashboard-signature-hero";
import type { DashboardData } from "@/shared/types/dashboard";

type DashboardSignatureHeroProps = {
  data: DashboardData;
  /** Mobile uses fewer highlights and compact band sizing. */
  variant?: "desktop" | "mobile";
};

export function DashboardSignatureHero({
  data,
  variant = "desktop",
}: DashboardSignatureHeroProps) {
  const isMobile = variant === "mobile";
  const content = buildDashboardSignatureHeroContent(data, {
    maxHighlights: isMobile ? 2 : 4,
  });

  return (
    <HorizonHero
      tone="cyan"
      beamTone="cyan"
      beamPosition="center"
      size={isMobile ? "compact" : "standard"}
    >
      <HeroHeader
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        highlights={content.highlights}
        insight={isMobile ? undefined : content.insight}
        className={signatureHeroContentClass}
      />
    </HorizonHero>
  );
}
