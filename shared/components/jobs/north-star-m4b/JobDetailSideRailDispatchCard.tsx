import { Calendar, MapPin, User } from "lucide-react";
import { formatAddressLine } from "@/shared/lib/address";
import type { Technician } from "@/shared/types/dispatch";
import type { JobDetail } from "@/shared/types/job";
import { JobTechnicianAssignment } from "@/shared/components/jobs/JobTechnicianAssignment";
import { JOB_DETAIL_DISPATCH_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";
import {
  SectionHeader,
  altairMcCardClass,
  altairMcCardPadClass,
  altairMcMetricLabelClass,
} from "@/shared/design-system/components";

type JobDetailSideRailDispatchCardProps = {
  job: JobDetail;
  scheduledLabel: string;
  technicians: Technician[];
  canAssignTechnician: boolean;
};

export function JobDetailSideRailDispatchCard({
  job,
  scheduledLabel,
  technicians,
  canAssignTechnician,
}: JobDetailSideRailDispatchCardProps) {
  const isAssigned = Boolean(job.assignedTechnicianId);

  return (
    <section
      id={JOB_DETAIL_DISPATCH_ANCHOR}
      data-job-section={JOB_DETAIL_DISPATCH_ANCHOR}
      className="scroll-mt-6 space-y-2"
      tabIndex={-1}
    >
      <SectionHeader title="Dispatch" />
      <div className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <div className="space-y-2 rounded-lg border border-altair-border bg-[var(--surface-tile)] px-2.5 py-2">
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
            <div className="min-w-0">
              <p className={altairMcMetricLabelClass}>Schedule</p>
              <p className="mt-0.5 text-sm font-semibold text-altair-ink-on-paper">
                {scheduledLabel}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
            <div className="min-w-0">
              <p className={altairMcMetricLabelClass}>Location</p>
              <p className="mt-0.5 text-xs text-altair-ink-on-paper-secondary">
                {formatAddressLine(job.serviceAddress, job.city, job.state, job.zip)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-altair-ink-on-paper-muted" />
            <div className="min-w-0">
              <p className={altairMcMetricLabelClass}>Technician</p>
              <p className="mt-0.5 text-sm font-semibold text-altair-ink-on-paper">
                {isAssigned ? job.assignedTechnician : "Unassigned"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <JobTechnicianAssignment
            jobId={job.id}
            jobStatus={job.status}
            assignedTechnicianId={job.assignedTechnicianId}
            assignedTechnician={job.assignedTechnician}
            technicians={technicians}
            canAssign={canAssignTechnician}
            northStar
            compact
          />
        </div>
      </div>
    </section>
  );
}
