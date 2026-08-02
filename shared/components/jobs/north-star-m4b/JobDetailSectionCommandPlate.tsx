"use client";

import { JobDetailSectionNav } from "./JobDetailSectionNav";
import {
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import type { JobDetailTabId } from "@/shared/lib/jobs/job-detail-tabs";

type JobDetailSectionCommandPlateProps = {
  activeTab: JobDetailTabId;
  onTabChange: (tabId: JobDetailTabId) => void;
  showBilling: boolean;
  showEquipment: boolean;
};

/**
 * Tab plate for Job Detail panels. Workflow CTAs live on JobNextActionCard;
 * waiting/terminal banners stay on the job header.
 */
export function JobDetailSectionCommandPlate({
  activeTab,
  onTabChange,
  showBilling,
  showEquipment,
}: JobDetailSectionCommandPlateProps) {
  return (
    <div className={`${altairMcCardClass} ${altairMcCardPadClass} py-2.5`}>
      <JobDetailSectionNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        showBilling={showBilling}
        showEquipment={showEquipment}
      />
    </div>
  );
}
