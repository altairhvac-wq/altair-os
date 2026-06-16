import type { ReactNode } from "react";
import { MasterContentStack } from "./MasterContentStack";
import { MasterPageHeader } from "./MasterPageHeader";
import { MasterShellPage } from "./MasterShellPage";
import type { MasterShellDensity } from "./tokens";

export type MasterListPageLayoutProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  banners?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  density?: MasterShellDensity;
  className?: string;
};

/**
 * List-style page scaffold: header, optional banners/summary, scrollable body.
 * Mirrors production ListCommandCenterLayout for future migrations.
 */
export function MasterListPageLayout({
  title,
  subtitle,
  eyebrow,
  primaryAction,
  secondaryAction,
  banners,
  summary,
  children,
  density = "default",
  className = "",
}: MasterListPageLayoutProps) {
  const isCompact = density === "compact";

  return (
    <MasterShellPage fillViewport density={density} className={className}>
      {banners}

      <MasterPageHeader
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
        density={density}
      />

      {summary}

      <MasterContentStack density={isCompact ? "compact" : "default"} scrollable>
        {children}
      </MasterContentStack>
    </MasterShellPage>
  );
}
