import { MasterPageHeader } from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type DispatchDashboardHeaderProps = {
  northStar?: boolean;
};

export function DispatchDashboardHeader({
  northStar = false,
}: DispatchDashboardHeaderProps) {
  if (northStar) {
    return (
      <MasterPageHeader
        title="Dispatch"
        subtitle="Assign technicians and manage today's board."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-dispatch-page-header ${lt.pageHeader}`}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
      />
    );
  }

  return (
    <MasterPageHeader
      density="compact"
      title="Dispatch"
      subtitle="Assign technicians and manage today's board."
    />
  );
}
