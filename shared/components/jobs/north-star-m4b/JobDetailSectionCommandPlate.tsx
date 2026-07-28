"use client";

import { JobDetailSectionNav } from "./JobDetailSectionNav";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobDetailSectionCommandPlateProps = {
  showBilling: boolean;
  showEquipment: boolean;
};

/**
 * Section jump plate only. Workflow CTAs live on JobNextActionCard;
 * waiting/terminal banners stay on JobDetailNorthStarHeader.
 */
export function JobDetailSectionCommandPlate({
  showBilling,
  showEquipment,
}: JobDetailSectionCommandPlateProps) {
  return (
    <div className={dt.commandPlate}>
      <JobDetailSectionNav
        showBilling={showBilling}
        showEquipment={showEquipment}
      />
    </div>
  );
}
