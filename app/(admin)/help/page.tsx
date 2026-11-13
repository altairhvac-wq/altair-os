import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getLiveOnboardingInfo } from "@/lib/onboarding/live-onboarding";
import { HelpPageView } from "@/shared/components/support/HelpPageView";

export const metadata: Metadata = {
  title: "Help & support",
};

export default async function HelpPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  return (
    <HelpPageView
      info={getLiveOnboardingInfo()}
      companyName={companyContext.company.name}
      showSetupShortcuts={companyContext.permissions.manageCompany}
      feedbackButtonEnabled={isBetaBugReportEnabled()}
    />
  );
}
