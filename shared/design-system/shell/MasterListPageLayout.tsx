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
  headerCenter?: ReactNode;
  banners?: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
  density?: MasterShellDensity;
  className?: string;
  headerClassName?: string;
  headerSurfaceVariant?: "default" | "northStar";
  headerTitleClassName?: string;
  headerSubtitleClassName?: string;
  headerEyebrowClassName?: string;
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
  headerCenter,
  banners,
  summary,
  children,
  density = "default",
  className = "",
  headerClassName = "",
  headerSurfaceVariant = "default",
  headerTitleClassName = "",
  headerSubtitleClassName = "",
  headerEyebrowClassName = "",
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
        center={headerCenter}
        density={density}
        surfaceVariant={headerSurfaceVariant}
        titleClassName={headerTitleClassName}
        subtitleClassName={headerSubtitleClassName}
        eyebrowClassName={headerEyebrowClassName}
        className={headerClassName}
      />

      {summary}

      <MasterContentStack density={isCompact ? "compact" : "default"} scrollable>
        {children}
      </MasterContentStack>
    </MasterShellPage>
  );
}
