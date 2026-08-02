"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { JobAttachmentsSection } from "@/shared/components/jobs/JobAttachmentsSection";
import { JobCustomerEquipmentSection } from "@/shared/components/jobs/JobCustomerEquipmentSection";
import { JobDetailDescriptionCard } from "@/shared/components/jobs/JobDetailDescriptionCard";
import { JobDetailSummaryCard } from "@/shared/components/jobs/JobDetailSummaryCard";
import { JobExpenseReceiptsSection } from "@/shared/components/jobs/JobExpenseReceiptsSection";
import { JobLifecycleControl } from "@/shared/components/jobs/JobLifecycleControl";
import { JobMaterialsSection } from "@/shared/components/jobs/JobMaterialsSection";
import { JobOperationalRecoverySection } from "@/shared/components/jobs/JobOperationalRecoverySection";
import { JobProfitabilitySection } from "@/shared/components/jobs/JobProfitabilitySection";
import { JobReviewChecklistSection } from "@/shared/components/jobs/JobReviewChecklistSection";
import { JobSummaryAiAssistant } from "@/shared/components/jobs/JobSummaryAiAssistant";
import { OperationalActivityTimeline } from "@/shared/components/operational/OperationalActivityTimeline";
import { JobDetailMoneyPath } from "./JobDetailMoneyPath";
import { JobDetailNorthStarContentSection } from "./JobDetailNorthStarContentSection";
import { JobDetailSectionCommandPlate } from "./JobDetailSectionCommandPlate";
import { JobDetailSideRailCustomerCard } from "./JobDetailSideRailCustomerCard";
import { JobDetailSideRailDispatchCard } from "./JobDetailSideRailDispatchCard";
import { jobDetailBodyTextClass } from "@/shared/components/jobs/job-detail-section-styles";
import { altairMcGridGapClass } from "@/shared/design-system/components";
import type { JobDeleteDependencies } from "@/shared/lib/job-lifecycle";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import {
  JOB_DETAIL_ACTIVITY_ANCHOR,
  JOB_DETAIL_ATTACHMENTS_ANCHOR,
  JOB_DETAIL_BILLING_ANCHOR,
  JOB_DETAIL_EQUIPMENT_ANCHOR,
  JOB_DETAIL_MATERIALS_ANCHOR,
  JOB_DETAIL_SCOPE_ANCHOR,
} from "@/shared/lib/jobs/job-detail-anchors";
import {
  JOB_DETAIL_SECTION_SELECT_EVENT,
  readJobDetailTabFromHash,
  resolveJobDetailTabId,
  type JobDetailSectionSelectDetail,
  type JobDetailTabId,
} from "@/shared/lib/jobs/job-detail-tabs";
import type { CustomerEquipment } from "@/shared/types/customer-equipment";
import type { Expense } from "@/shared/types/expense";
import type { JobDetail } from "@/shared/types/job";
import type { JobAttachment } from "@/shared/types/job-attachment";
import type { JobMaterial } from "@/shared/types/job-material";
import type {
  JobProfitabilityLabor,
  JobProfitabilitySnapshot,
} from "@/shared/types/job-profitability";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import type { OperationalInconsistencyEntry } from "@/shared/types/operational-inconsistencies";
import type { ServiceItem } from "@/shared/types/service-item";
import type { Technician } from "@/shared/types/dispatch";

export type JobDetailTabbedWorkspaceProps = {
  job: JobDetail;
  technicians: Technician[];
  activities: OperationalActivity[];
  equipment: CustomerEquipment[];
  attachments: JobAttachment[];
  expenses: Expense[];
  materials: JobMaterial[];
  profitability: JobProfitabilitySnapshot | null;
  laborSummary: JobProfitabilityLabor;
  laborCostRate: number | null;
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

function TabPanel({
  tabId,
  activeTab,
  children,
}: {
  tabId: JobDetailTabId;
  activeTab: JobDetailTabId;
  children: ReactNode;
}) {
  const isActive = activeTab === tabId;

  return (
    <div
      role="tabpanel"
      id={`job-detail-panel-${tabId}`}
      aria-labelledby={`job-detail-tab-${tabId}`}
      hidden={!isActive}
      className={isActive ? `flex flex-col ${altairMcGridGapClass}` : undefined}
    >
      {isActive ? children : null}
    </div>
  );
}

export function JobDetailTabbedWorkspace({
  job,
  technicians,
  activities,
  equipment,
  attachments,
  expenses,
  materials,
  profitability,
  laborSummary,
  laborCostRate,
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
}: JobDetailTabbedWorkspaceProps) {
  const showEquipmentNav = true;
  const showBillingNav = canViewFinancials;

  const [activeTab, setActiveTab] = useState<JobDetailTabId>(() =>
    readJobDetailTabFromHash({
      showBilling: canViewFinancials,
      showEquipment: true,
    }),
  );

  const selectTab = useCallback(
    (tabId: JobDetailTabId, updateHash = true) => {
      const next = resolveJobDetailTabId(tabId, {
        showBilling: showBillingNav,
        showEquipment: showEquipmentNav,
      });
      setActiveTab(next);

      if (!updateHash || typeof window === "undefined") {
        return;
      }

      const nextHash = `#${next}`;
      if (window.location.hash !== nextHash) {
        window.history.replaceState(null, "", nextHash);
      }
    },
    [showBillingNav, showEquipmentNav],
  );

  useEffect(() => {
    const options = {
      showBilling: showBillingNav,
      showEquipment: showEquipmentNav,
    };

    function handleSectionSelect(event: Event) {
      const detail = (event as CustomEvent<JobDetailSectionSelectDetail>).detail;
      if (!detail?.sectionId) {
        return;
      }
      selectTab(resolveJobDetailTabId(detail.sectionId, options), false);
    }

    function handleHashChange() {
      selectTab(readJobDetailTabFromHash(options), false);
    }

    window.addEventListener(
      JOB_DETAIL_SECTION_SELECT_EVENT,
      handleSectionSelect,
    );
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      window.removeEventListener(
        JOB_DETAIL_SECTION_SELECT_EVENT,
        handleSectionSelect,
      );
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, [selectTab, showBillingNav, showEquipmentNav]);

  const activityDescription = canViewBilling
    ? "Job workflow, estimates, and billing events"
    : "Job workflow and field events";

  return (
    <div className={`flex flex-col ${altairMcGridGapClass}`}>
      <JobDetailSectionCommandPlate
        activeTab={activeTab}
        onTabChange={(tabId) => selectTab(tabId, true)}
        showBilling={showBillingNav}
        showEquipment={showEquipmentNav}
      />

      <div
        className={`flex flex-col lg:grid lg:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)] lg:items-start ${altairMcGridGapClass}`}
      >
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <JobDetailSideRailCustomerCard
            customerId={job.customerId}
            customerName={job.customerName}
            customerCompany={customerCompany}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            serviceAddress={job.serviceAddress}
            city={job.city}
            state={job.state}
            zip={job.zip}
            canManageCustomers={canManageCustomers}
          />
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          <JobDetailSideRailDispatchCard
            job={job}
            scheduledLabel={scheduledLabel}
            technicians={technicians}
            canAssignTechnician={canAssignTechnician}
          />
        </div>

        <div
          className={`flex min-w-0 flex-col lg:col-start-1 lg:row-span-2 lg:row-start-1 ${altairMcGridGapClass}`}
        >
          <TabPanel tabId={JOB_DETAIL_SCOPE_ANCHOR} activeTab={activeTab}>
            <JobDetailDescriptionCard description={job.description} />

            <JobDetailNorthStarContentSection title="Notes">
              <p className={jobDetailBodyTextClass(true)}>
                {job.notes?.trim() ? job.notes : "No notes on file."}
              </p>
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

            <JobDetailSummaryCard
              materials={materials}
              labor={laborSummary}
              laborCostRate={laborCostRate}
              canViewLaborCost={canViewFinancials}
              hasAssignedTechnician={Boolean(job.assignedTechnicianId)}
            />
          </TabPanel>

          <TabPanel tabId={JOB_DETAIL_EQUIPMENT_ANCHOR} activeTab={activeTab}>
            <JobCustomerEquipmentSection
              customerId={job.customerId}
              jobId={job.id}
              equipment={equipment}
              canViewCustomerProfile={canManageCustomers}
              northStar
            />
          </TabPanel>

          <TabPanel tabId={JOB_DETAIL_MATERIALS_ANCHOR} activeTab={activeTab}>
            <JobMaterialsSection
              jobId={job.id}
              materials={materials}
              serviceItems={serviceItems}
              canLogMaterials={canLogMaterials}
              canViewMaterialCosts={canViewFinancials}
              northStar
            />
          </TabPanel>

          <TabPanel tabId={JOB_DETAIL_ATTACHMENTS_ANCHOR} activeTab={activeTab}>
            <JobAttachmentsSection
              jobId={job.id}
              attachments={attachments}
              canUpload={canUpdateStatus}
              northStar
            />
          </TabPanel>

          {showBillingNav ? (
            <TabPanel tabId={JOB_DETAIL_BILLING_ANCHOR} activeTab={activeTab}>
              <JobDetailMoneyPath
                estimates={billingContext?.estimates ?? []}
                invoices={billingContext?.invoices ?? []}
                profitability={profitability}
                canViewBilling={canViewBilling}
              />

              <JobExpenseReceiptsSection
                jobId={job.id}
                expenses={expenses}
                northStar
              />

              {profitability ? (
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
            </TabPanel>
          ) : null}

          <TabPanel tabId={JOB_DETAIL_ACTIVITY_ANCHOR} activeTab={activeTab}>
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
          </TabPanel>
        </div>
      </div>
    </div>
  );
}
