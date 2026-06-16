import type { ReactNode } from "react";
import { MasterContentStack } from "./MasterContentStack";
import { MasterPageCanvas } from "./MasterPageCanvas";
import { MasterShellPage } from "./MasterShellPage";
import type { MasterShellDensity } from "./tokens";

export type MasterDetailPageLayoutProps = {
  /** Back navigation link or control (rendered above page body) */
  backLink?: ReactNode;
  /** Alerts or lifecycle banners above the detail canvas */
  banners?: ReactNode;
  children: ReactNode;
  density?: MasterShellDensity;
  className?: string;
};

/**
 * Detail-style page scaffold: optional back link, detail-width canvas, vertical body stack.
 * For rich record pages (Customer 360, Job detail, etc.).
 */
export function MasterDetailPageLayout({
  backLink,
  banners,
  children,
  density = "default",
  className = "",
}: MasterDetailPageLayoutProps) {
  return (
    <MasterShellPage density={density} className={className}>
      {banners}

      <MasterPageCanvas width="detail">
        <MasterContentStack density={density}>
          {backLink}
          {children}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
