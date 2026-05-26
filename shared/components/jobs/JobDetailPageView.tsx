import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { getCustomerInitials } from "@/shared/types/customer";
import type { Technician } from "@/shared/types/dispatch";
import { JobDetailHeaderWorkflow } from "./JobDetailHeaderWorkflow";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobTechnicianAssignment } from "./JobTechnicianAssignment";
import { JobCustomerEquipmentSection } from "./JobCustomerEquipmentSection";
import { JobAttachmentsSection } from "./JobAttachmentsSection";
import { JobExpenseReceiptsSection } from "./JobExpenseReceiptsSection";
import { JobMaterialsSection } from "./JobMaterialsSection";
import { OperationalActivityTimeline } from "@/shared/components/operational/OperationalActivityTimeline";
import {
  formatScheduledDate,
  formatScheduledTime,
  type JobDetail,
} from "@/shared/types/job";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { Expense } from "@/shared/types/expense";
import type { JobMaterial } from "@/shared/types/job-material";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import type { ServiceItem } from "@/shared/types/service-item";

type JobDetailPageViewProps = {
  job: JobDetail;
  technicians: Technician[];
  activities: OperationalActivity[];
  equipment: CustomerEquipment[];
  attachments: JobAttachment[];
  expenses: Expense[];
  materials: JobMaterial[];
  serviceItems: ServiceItem[];
  canUpdateStatus: boolean;
  canAssignTechnician: boolean;
  canLogMaterials: boolean;
};

type ContentSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function ContentSection({ title, children, className }: ContentSectionProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className ?? ""}`}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function JobDetailPageView({
  job,
  technicians,
  activities,
  equipment,
  attachments,
  expenses,
  materials,
  serviceItems,
  canUpdateStatus,
  canAssignTechnician,
  canLogMaterials,
}: JobDetailPageViewProps) {
  const customerEmail = job.customerEmail?.trim();
  const customerPhone = job.customerPhone?.trim();
  const customerCompany = job.customerCompany?.trim();
  const isAssigned = Boolean(job.assignedTechnicianId);
  const scheduledLabel = `${formatScheduledDate(job.scheduledDate)} at ${formatScheduledTime(job.scheduledDate)}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6 sm:py-5">
          <JobDetailHeaderWorkflow
            job={job}
            scheduledLabel={scheduledLabel}
            canUpdateStatus={canUpdateStatus}
          />
        </div>

        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Service location
            </p>
            <div className="mt-2 flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 ring-1 ring-cyan-600/10">
                <MapPin className="h-5 w-5 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900">
                  {job.serviceAddress}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">
                  {job.city}, {job.state} {job.zip}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-inset sm:shrink-0 ${
              isAssigned
                ? "bg-emerald-50 text-emerald-900 ring-emerald-600/15"
                : "bg-amber-50 text-amber-900 ring-amber-600/15"
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                isAssigned ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              <User
                className={`h-4 w-4 ${isAssigned ? "text-emerald-700" : "text-amber-700"}`}
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
                Technician
              </p>
              <p className="text-sm font-semibold">
                {isAssigned ? job.assignedTechnician : "Unassigned"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Customer
        </h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
            {getCustomerInitials(job.customerName)}
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={`/customers/${job.customerId}`}
              className="text-base font-bold text-slate-900 transition-colors hover:text-cyan-700"
            >
              {job.customerName}
            </Link>
            {customerCompany ? (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{customerCompany}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:items-end sm:text-right">
            {customerEmail ? (
              <a
                href={`mailto:${customerEmail}`}
                className="inline-flex min-w-0 items-center gap-2 break-all text-sm text-cyan-600 transition-colors hover:text-cyan-700"
              >
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                {customerEmail}
              </a>
            ) : null}
            {customerPhone ? (
              <a
                href={`tel:${customerPhone}`}
                className="inline-flex items-center gap-2 text-sm text-cyan-600 transition-colors hover:text-cyan-700"
              >
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                {customerPhone}
              </a>
            ) : null}
            {!customerEmail && !customerPhone ? (
              <p className="text-sm text-slate-500">No contact details on file.</p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <ContentSection title="Description" className="lg:col-span-2">
          <p className="text-sm leading-relaxed text-slate-600">
            {job.description?.trim()
              ? job.description
              : "No description provided."}
          </p>
        </ContentSection>

        <ContentSection title="Notes">
          <p className="text-sm leading-relaxed text-slate-600">
            {job.notes?.trim() ? job.notes : "No notes on file."}
          </p>
        </ContentSection>

        <ContentSection title="Schedule">
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2.5">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-900">{scheduledLabel}</p>
                <p className="mt-0.5 text-slate-500">Scheduled service window</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job type
              </p>
              <p className="mt-1 font-medium text-slate-900">{job.jobType}</p>
            </div>
          </div>
        </ContentSection>

        <ContentSection title="Status & priority" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3">
            <JobStatusBadge status={job.status} />
            <JobPriorityBadge priority={job.priority} />
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Current workflow state and urgency for dispatch and field teams.
          </p>
        </ContentSection>

        <ContentSection title="Technician assignment" className="lg:col-span-3">
          <JobTechnicianAssignment
            jobId={job.id}
            assignedTechnicianId={job.assignedTechnicianId}
            assignedTechnician={job.assignedTechnician}
            technicians={technicians}
            canAssign={canAssignTechnician}
          />
        </ContentSection>
      </div>

      <JobCustomerEquipmentSection
        customerId={job.customerId}
        jobId={job.id}
        equipment={equipment}
      />

      <JobAttachmentsSection
        jobId={job.id}
        attachments={attachments}
        canUpload={canUpdateStatus}
      />

      <JobExpenseReceiptsSection jobId={job.id} expenses={expenses} />

      <JobMaterialsSection
        jobId={job.id}
        materials={materials}
        serviceItems={serviceItems}
        canLogMaterials={canLogMaterials}
      />

      <OperationalActivityTimeline
        activities={activities}
        description="Job workflow, estimates, and billing events"
        emptyDescription="Status changes, assignments, estimates, and invoices will appear here."
      />
    </div>
  );
}
