import type { Metadata } from "next";
import { getPlatformBugReports } from "@/lib/database/services/platform-admin";
import { PlatformBugReportsPageView } from "@/shared/components/platform-admin/PlatformBugReportsPageView";

export const metadata: Metadata = {
  title: "Bug reports",
};

export default async function PlatformBugReportsPage() {
  const { reports, error } = await getPlatformBugReports();

  return (
    <PlatformBugReportsPageView initialReports={reports} loadError={error} />
  );
}
