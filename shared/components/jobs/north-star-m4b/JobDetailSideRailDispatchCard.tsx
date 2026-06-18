import { Calendar, MapPin, User } from "lucide-react";
import type { Technician } from "@/shared/types/dispatch";
import type { JobDetail } from "@/shared/types/job";
import { JobTechnicianAssignment } from "@/shared/components/jobs/JobTechnicianAssignment";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

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
    <section className={`${dt.compactSectionSurface} scroll-mt-6`}>
      <h2 className={dt.sectionTitle}>Dispatch</h2>
      <p className={dt.sectionSubtitle}>Schedule and assignment</p>

      <div className={`mt-3 space-y-2 ${dt.innerCard}`}>
        <div className={dt.ivoryMetaRow}>
          <Calendar className={dt.metaIcon} />
          <span className={dt.ivoryCardPrimary}>{scheduledLabel}</span>
        </div>
        <div className={dt.ivoryMetaRow}>
          <MapPin className={dt.metaIcon} />
          <span className={dt.ivoryCardSecondary}>
            {job.serviceAddress}, {job.city}, {job.state} {job.zip}
          </span>
        </div>
        <div className={dt.ivoryMetaRow}>
          <User className={dt.metaIcon} />
          <span className={dt.ivoryCardPrimary}>
            {isAssigned ? job.assignedTechnician : "Unassigned"}
          </span>
        </div>
        <div className={`pt-1 ${dt.ivoryMetaRow}`}>
          <span className={dt.metricLabel}>Job type</span>
          <span className={`ml-2 ${dt.ivoryCardSecondary}`}>{job.jobType}</span>
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
    </section>
  );
}
