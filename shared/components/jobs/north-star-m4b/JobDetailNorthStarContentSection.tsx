import type { ReactNode } from "react";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobDetailNorthStarContentSectionProps = {
  title: string;
  subtitle?: string;
  anchor?: string;
  children: ReactNode;
  compact?: boolean;
};

export function JobDetailNorthStarContentSection({
  title,
  subtitle,
  anchor,
  children,
  compact = false,
}: JobDetailNorthStarContentSectionProps) {
  return (
    <section
      id={anchor}
      className={`${compact ? dt.compactSectionSurface : dt.sectionSurface} scroll-mt-6`}
    >
      <h2 className={dt.sectionTitle}>{title}</h2>
      {subtitle ? <p className={dt.sectionSubtitle}>{subtitle}</p> : null}
      <div className="mt-2">{children}</div>
    </section>
  );
}
