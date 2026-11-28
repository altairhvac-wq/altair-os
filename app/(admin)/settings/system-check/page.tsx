import type { Metadata } from "next";
import { canAccessSystemCheck } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { runSystemChecks } from "@/lib/system-check/run-system-checks";
import { UnauthorizedAccessView } from "@/shared/components/layout/UnauthorizedAccessView";
import { SystemCheckPageView } from "@/shared/components/settings/SystemCheckPageView";

export const metadata: Metadata = {
  title: "System check",
};

export default async function SystemCheckPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext || !canAccessSystemCheck(companyContext)) {
    return (
      <UnauthorizedAccessView
        title="Owner access required"
        description="System checks are limited to company owners."
      />
    );
  }

  const report = await runSystemChecks();

  // The raw checks name server settings. Only the people who run the platform
  // can act on those, so only they are shown them.
  return (
    <SystemCheckPageView
      report={report}
      showTechnicalDetail={companyContext.isPlatformAdmin}
    />
  );
}
