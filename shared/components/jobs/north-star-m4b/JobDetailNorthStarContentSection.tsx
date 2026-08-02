import type { ReactNode } from "react";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";

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
}: JobDetailNorthStarContentSectionProps) {
  return (
    <section
      id={anchor}
      data-job-section={anchor}
      tabIndex={anchor ? -1 : undefined}
      className="scroll-mt-6 space-y-2"
    >
      <SectionHeader title={title} />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        {subtitle ? (
          <p className="mb-2 text-xs text-altair-ink-on-paper-muted">{subtitle}</p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
