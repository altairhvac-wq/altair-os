import Link from "next/link";
import { CustomerNameLink } from "@/shared/components/customers/CustomerNameLink";
import { DemoCustomerInitials } from "@/shared/components/display/DemoCustomerInitials";
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
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import type { Customer } from "@/shared/types/customer";
import type { Technician } from "@/shared/types/dispatch";
import { JobCustomerQuickActions } from "./JobCustomerQuickActions";
import { JobDetailHeaderSection } from "./JobDetailHeaderSection";
import { JobPriorityBadge } from "./JobPriorityBadge";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobTechnicianAssignment } from "./JobTechnicianAssignment";
import { JobCustomerEquipmentSection } from "./JobCustomerEquipmentSection";
import { JobAttachmentsSection } from "./JobAttachmentsSection";
import { JobExpenseReceiptsSection } from "./JobExpenseReceiptsSection";
import { JobMaterialsSection } from "./JobMaterialsSection";
import { JobProfitabilitySection } from "./JobProfitabilitySection";
import { JobDetailHashScroll } from "./JobDetailHashScroll";
import { JobSummaryAiAssistant } from "./JobSummaryAiAssistant";
import { JobOperationalRecoverySection } from "./JobOperationalRecoverySection";
import { JobReviewChecklistSection } from "./JobReviewChecklistSection";
import { OperationalActivityTimeline } from "@/shared/components/operational/OperationalActivityTimeline";
import {
  formatScheduledDate,
  formatScheduledTime,
  type JobDetail,
} from "@/shared/types/job";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { Expense } from "@/shared/types/expense";
import type { JobDeleteDependencies } from "@/shared/lib/job-lifecycle";
import type { JobMaterial } from "@/shared/types/job-material";
import { JobLifecycleControl } from "@/shared/components/jobs/JobLifecycleControl";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import type { ServiceItem } from "@/shared/types/service-item";
import type { JobProfitabilitySnapshot } from "@/shared/types/job-profitability";
import type { OperationalInconsistencyEntry } from "@/shared/types/operational-inconsistencies";
import { MasterDetailPageLayout } from "@/shared/design-system/shell";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { adminCardSectionClass } from "@/shared/lib/admin-density";
import {
  JOB_DETAIL_ACTIVITY_ANCHOR,
  JOB_DETAIL_SCOPE_ANCHOR,
} from "@/shared/lib/jobs/job-detail-anchors";
import { jobDetailBodyTextClass } from "@/shared/components/jobs/job-detail-section-styles";
import {
  JobDetailNorthStarContentSection,
  JobDetailNorthStarHeader,
  JobDetailSectionCommandPlate,
  JobDetailSideRailBillingCard,
  JobDetailSideRailCustomerCard,
  JobDetailSideRailDispatchCard,
} from "@/shared/components/jobs/north-star-m4b";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import { JobWorkflowOverview } from "@/shared/components/jobs/JobWorkflowOverview";

type JobDetailPageViewProps = {
  job: JobDetail;
  customers: Customer[];
  technicians: Technician[];
  activities: OperationalActivity[];
  equipment: CustomerEquipment[];
  attachments: JobAttachment[];
  expenses: Expense[];
  materials: JobMaterial[];
  profitability: JobProfitabilitySnapshot | null;
  serviceItems: ServiceItem[];
  canUpdateStatus: boolean;
  canAssignTechnician: boolean;
  canEditJob: boolean;
  deleteDependencies: JobDeleteDependencies;
  canLogMaterials: boolean;
  canViewFinancials: boolean;
  canViewBilling: boolean;
  canManageCustomers: boolean;
  operationalInconsistencies?: OperationalInconsistencyEntry[];
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  aiFeaturesEnabled?: boolean;
};

type ContentSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function ContentSection({ title, children, className }: ContentSectionProps) {
  return (
    <section className={`${adminCardSectionClass} ${className ?? ""}`}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

type SharedWorkspaceProps = {
  job: JobDetail;
  customers: Customer[];
  technicians: Technician[];
  activities: OperationalActivity[];
  equipment: CustomerEquipment[];
  attachments: JobAttachment[];
  expenses: Expense[];
  materials: JobMaterial[];
  profitability: JobProfitabilitySnapshot | null;
  serviceItems: ServiceItem[];
  canUpdateStatus: boolean;
  canAssignTechnician: boolean;
  canEditJob: boolean;
  deleteDependencies: JobDeleteDependencies;
  canLogMaterials: boolean;
  canViewFinancials: boolean;
  canViewBilling: boolean;
  canManageCustomers: boolean;
  operationalInconsistencies: OperationalInconsistencyEntry[];
  billingContext?: {
    estimates: JobEstimateSummary[];
    invoices: JobInvoiceSummary[];
  };
  aiFeaturesEnabled: boolean;
  scheduledLabel: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerCompany?: string | null;
};

function LegacyJobDetailBody({
  job,
  customers,
  technicians,
  activities,
  equipment,
  attachments,
  expenses,
  materials,
  profitability,
  serviceItems,
  canUpdateStatus,
  canAssignTechnician,
  canEditJob,
  deleteDependencies,
  canLogMaterials,
  canViewFinancials,
  canViewBilling,
  canManageCustomers,
  operationalInconsistencies,
  billingContext,
  aiFeaturesEnabled,
  scheduledLabel,
  customerEmail,
  customerPhone,
  customerCompany,
}: SharedWorkspaceProps) {
  const isAssigned = Boolean(job.assignedTechnicianId);

  return (
    <>
      <section className="admin-card">
        <div className="border-b border-slate-100 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
          <JobDetailHeaderSection
            job={job}
            customers={customers}
            scheduledLabel={scheduledLabel}
            canUpdateStatus={canUpdateStatus}
            canEditJob={canEditJob}
            aiFeaturesEnabled={aiFeaturesEnabled}
            canCreateEstimate={canViewBilling}
            canViewBilling={canViewBilling}
            billingContext={billingContext}
          />
        </div>

        <div className="flex flex-col gap-2.5 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:px-4 sm:py-3">
          <div className="min-w-0 flex-1">
            <div className="flex gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 ring-1 ring-cyan-600/10">
                <MapPin className="h-4 w-4 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {job.serviceAddress}
                  <span className="font-normal text-slate-600">
                    {" · "}
                    {job.city}, {job.state} {job.zip}
                  </span>
                </p>
                <div className="mt-2">
                  <JobCustomerQuickActions
                    customerPhone={customerPhone}
                    customerEmail={customerEmail}
                    serviceAddress={job.serviceAddress}
                    city={job.city}
                    state={job.state}
                    zip={job.zip}
                  />
                </div>
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

      <JobWorkflowOverview
        job={job}
        billingContext={billingContext}
        canUpdateStatus={canUpdateStatus}
        canViewBilling={canViewBilling}
        showBillingSection={Boolean(canViewFinancials && profitability)}
        showEquipmentSection={equipment.length > 0}
        aiFeaturesEnabled={aiFeaturesEnabled}
      />

      <JobSummaryAiAssistant
        jobId={job.id}
        aiFeaturesEnabled={aiFeaturesEnabled}
      />

      <section className={adminCardSectionClass}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Customer
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-bold text-white">
            <DemoCustomerInitials name={job.customerName} />
          </div>

          <div className="min-w-0 flex-1">
            <CustomerNameLink
              customerId={job.customerId}
              customerName={job.customerName}
              canManageCustomers={canManageCustomers}
              linkClassName="text-base font-bold text-slate-900 transition-colors hover:text-cyan-700"
            />
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

      <div className="grid gap-4 lg:grid-cols-3">
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
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Job type
              </p>
              <p className="mt-1 font-medium text-slate-900">{job.jobType}</p>
            </div>
          </div>
        </ContentSection>

        <ContentSection title="Status & priority" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            <JobPriorityBadge priority={job.priority} />
          </div>
        </ContentSection>

        <ContentSection title="Technician assignment" className="lg:col-span-3">
          <JobTechnicianAssignment
            jobId={job.id}
            jobStatus={job.status}
            assignedTechnicianId={job.assignedTechnicianId}
            assignedTechnician={job.assignedTechnician}
            technicians={technicians}
            canAssign={canAssignTechnician}
          />
        </ContentSection>
      </div>

      {operationalInconsistencies.length > 0 ? (
        <JobOperationalRecoverySection
          jobId={job.id}
          entries={operationalInconsistencies}
        />
      ) : null}

      {canViewFinancials && profitability ? (
        <>
          <JobReviewChecklistSection
            jobId={job.id}
            jobStatus={job.status}
            customerId={job.customerId}
            snapshot={profitability}
            invoices={billingContext?.invoices ?? []}
          />

          <JobProfitabilitySection
            jobId={job.id}
            jobStatus={job.status}
            snapshot={profitability}
          />
        </>
      ) : null}

      <JobCustomerEquipmentSection
        customerId={job.customerId}
        jobId={job.id}
        equipment={equipment}
        canViewCustomerProfile={canManageCustomers}
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
        canViewMaterialCosts={canViewFinancials}
      />

      <OperationalActivityTimeline
        activities={activities}
        canViewBilling={canViewBilling}
        title="History"
        description={
          canViewBilling
            ? "Job workflow, estimates, and billing events"
            : "Job workflow and field events"
        }
        emptyDescription={
          canViewBilling
            ? "Status changes, assignments, estimates, and invoices will appear here."
            : "Status changes, assignments, and field updates will appear here."
        }
      />

      <JobLifecycleControl
        job={job}
        deleteDependencies={deleteDependencies}
        canManage={canEditJob}
      />
    </>
  );
}

function NorthStarMainColumn({
  job,
  activities,
  attachments,
  expenses,
  materials,
  profitability,
  serviceItems,
  canUpdateStatus,
  canEditJob,
  deleteDependencies,
  canLogMaterials,
  canViewFinancials,
  canViewBilling,
  operationalInconsistencies,
  billingContext,
  aiFeaturesEnabled,
}: SharedWorkspaceProps) {
  const activityDescription = canViewBilling
    ? "Job workflow, estimates, and billing events"
    : "Job workflow and field events";

  return (
    <>
      <JobDetailNorthStarContentSection
        title="Work scope"
        subtitle="Description and notes for this job"
        anchor={JOB_DETAIL_SCOPE_ANCHOR}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638]">
              Description
            </p>
            <p className={`mt-1.5 ${jobDetailBodyTextClass(true)}`}>
              {job.description?.trim()
                ? job.description
                : "No description provided."}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638]">
              Notes
            </p>
            <p className={`mt-1.5 ${jobDetailBodyTextClass(true)}`}>
              {job.notes?.trim() ? job.notes : "No notes on file."}
            </p>
          </div>
        </div>
      </JobDetailNorthStarContentSection>

      <JobSummaryAiAssistant
        jobId={job.id}
        aiFeaturesEnabled={aiFeaturesEnabled}
      />

      {operationalInconsistencies.length > 0 ? (
        <JobOperationalRecoverySection
          jobId={job.id}
          entries={operationalInconsistencies}
        />
      ) : null}

      {canViewFinancials && profitability ? (
        <>
          <JobReviewChecklistSection
            jobId={job.id}
            jobStatus={job.status}
            customerId={job.customerId}
            snapshot={profitability}
            invoices={billingContext?.invoices ?? []}
          />

          <JobProfitabilitySection
            jobId={job.id}
            jobStatus={job.status}
            snapshot={profitability}
            northStar
          />
        </>
      ) : null}

      <JobMaterialsSection
        jobId={job.id}
        materials={materials}
        serviceItems={serviceItems}
        canLogMaterials={canLogMaterials}
        canViewMaterialCosts={canViewFinancials}
        northStar
      />

      <JobAttachmentsSection
        jobId={job.id}
        attachments={attachments}
        canUpload={canUpdateStatus}
        northStar
      />

      <JobExpenseReceiptsSection jobId={job.id} expenses={expenses} northStar />

      <OperationalActivityTimeline
        activities={activities}
        canViewBilling={canViewBilling}
        title="History"
        sectionId={JOB_DETAIL_ACTIVITY_ANCHOR}
        sectionClassName="scroll-mt-6"
        northStar
        compact
        description={activityDescription}
        emptyDescription={
          canViewBilling
            ? "Status changes, assignments, estimates, and invoices will appear here."
            : "Status changes, assignments, and field updates will appear here."
        }
      />

      <JobLifecycleControl
        job={job}
        deleteDependencies={deleteDependencies}
        canManage={canEditJob}
        northStar
      />
    </>
  );
}

function NorthStarJobDetailBody(props: SharedWorkspaceProps) {
  // Single DOM tree: mobile stacks customer/dispatch first; desktop places
  // them in the side column without duplicating section anchors.
  return (
    <div className="flex flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)] lg:items-start lg:gap-2.5">
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">
        <JobDetailSideRailCustomerCard
          customerId={props.job.customerId}
          customerName={props.job.customerName}
          customerCompany={props.customerCompany}
          customerEmail={props.customerEmail}
          customerPhone={props.customerPhone}
          serviceAddress={props.job.serviceAddress}
          city={props.job.city}
          state={props.job.state}
          zip={props.job.zip}
          canManageCustomers={props.canManageCustomers}
        />
      </div>

      <div className="min-w-0 lg:col-start-2 lg:row-start-2">
        <JobDetailSideRailDispatchCard
          job={props.job}
          scheduledLabel={props.scheduledLabel}
          technicians={props.technicians}
          canAssignTechnician={props.canAssignTechnician}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2.5 lg:col-start-1 lg:row-span-4 lg:row-start-1">
        <NorthStarMainColumn {...props} />
      </div>

      <div className="flex min-w-0 flex-col gap-2.5 lg:col-start-2 lg:row-start-3">
        <JobCustomerEquipmentSection
          customerId={props.job.customerId}
          jobId={props.job.id}
          equipment={props.equipment}
          canViewCustomerProfile={props.canManageCustomers}
          northStar
          compact
        />

        {props.canViewFinancials && props.profitability ? (
          <JobDetailSideRailBillingCard
            profitability={props.profitability}
            estimates={props.billingContext?.estimates ?? []}
            invoices={props.billingContext?.invoices ?? []}
            canViewBilling={props.canViewBilling}
          />
        ) : null}
      </div>
    </div>
  );
}

export function JobDetailPageView({
  job,
  customers,
  technicians,
  activities,
  equipment,
  attachments,
  expenses,
  materials,
  profitability,
  serviceItems,
  canUpdateStatus,
  canAssignTechnician,
  canEditJob,
  deleteDependencies,
  canLogMaterials,
  canViewFinancials,
  canViewBilling,
  canManageCustomers,
  operationalInconsistencies = [],
  billingContext,
  aiFeaturesEnabled = false,
}: JobDetailPageViewProps) {
  const customerEmail = job.customerEmail?.trim();
  const customerPhone = job.customerPhone?.trim();
  const customerCompany = job.customerCompany?.trim();
  const scheduledLabel = `${formatScheduledDate(job.scheduledDate)} at ${formatScheduledTime(job.scheduledDate)}`;
  const northStar = isNorthStarShellEnabled();
  const showEquipmentNav = equipment.length > 0;
  const showBillingNav = Boolean(canViewFinancials && profitability);

  const workspaceProps: SharedWorkspaceProps = {
    job,
    customers,
    technicians,
    activities,
    equipment,
    attachments,
    expenses,
    materials,
    profitability,
    serviceItems,
    canUpdateStatus,
    canAssignTechnician,
    canEditJob,
    deleteDependencies,
    canLogMaterials,
    canViewFinancials,
    canViewBilling,
    canManageCustomers,
    operationalInconsistencies,
    billingContext,
    aiFeaturesEnabled,
    scheduledLabel,
    customerEmail,
    customerPhone,
    customerCompany,
  };

  return (
    <MasterDetailPageLayout
      className={northStar ? dt.pageCanvas : undefined}
      canvasWidth={northStar ? "detailWide" : "detail"}
      backLink={
        <Link
          href="/jobs"
          className={
            northStar
              ? dt.backLink
              : "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
      }
    >
      <JobDetailHashScroll />

      {northStar ? (
        <>
          <JobDetailNorthStarHeader
            job={job}
            customers={customers}
            scheduledLabel={scheduledLabel}
            canUpdateStatus={canUpdateStatus}
            canEditJob={canEditJob}
            canManageCustomers={canManageCustomers}
            canViewFinancials={canViewFinancials}
            aiFeaturesEnabled={aiFeaturesEnabled}
            canCreateEstimate={canViewBilling}
            canViewBilling={canViewBilling}
            billingContext={billingContext}
            profitability={profitability}
          />
          <JobWorkflowOverview
            job={job}
            billingContext={billingContext}
            canUpdateStatus={canUpdateStatus}
            canViewBilling={canViewBilling}
            showBillingSection={showBillingNav}
            showEquipmentSection={showEquipmentNav}
            aiFeaturesEnabled={aiFeaturesEnabled}
            northStar
          />
          <JobDetailSectionCommandPlate
            job={job}
            canUpdateStatus={canUpdateStatus}
            canEditJob={canEditJob}
            canViewBilling={canViewBilling}
            canCreateEstimate={canViewBilling}
            aiFeaturesEnabled={aiFeaturesEnabled}
            showBilling={showBillingNav}
            showEquipment={showEquipmentNav}
            billingContext={billingContext}
          />
          <NorthStarJobDetailBody {...workspaceProps} />
        </>
      ) : (
        <LegacyJobDetailBody {...workspaceProps} />
      )}
    </MasterDetailPageLayout>
  );
}
