import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import { JOB_DETAIL_SCOPE_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";

type JobDetailDescriptionCardProps = {
  description?: string | null;
};

export function JobDetailDescriptionCard({
  description,
}: JobDetailDescriptionCardProps) {
  const text = description?.trim();

  return (
    <section
      id={JOB_DETAIL_SCOPE_ANCHOR}
      data-job-section={JOB_DETAIL_SCOPE_ANCHOR}
      tabIndex={-1}
      className="scroll-mt-6 space-y-2"
    >
      <SectionHeader title="Job Description" />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <p className="text-sm leading-relaxed text-altair-ink-on-paper-secondary">
          {text || "No description provided."}
        </p>
      </div>
    </section>
  );
}
