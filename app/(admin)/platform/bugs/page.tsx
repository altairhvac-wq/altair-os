import { getPlatformBugReports } from "@/lib/database/services/platform-admin";
import { PlatformBugReportsPageView } from "@/shared/components/platform-admin/PlatformBugReportsPageView";

export default async function PlatformBugReportsPage() {
  const { reports, error } = await getPlatformBugReports();

  return (
    <PlatformBugReportsPageView initialReports={reports} loadError={error} />
  );
}
