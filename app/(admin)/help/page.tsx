import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getLiveOnboardingInfo } from "@/lib/onboarding/live-onboarding";
import { HelpPageView } from "@/shared/components/support/HelpPageView";
import { HELP_AREAS, listHelpNotesFor } from "@/shared/lib/help/catalog";

export const metadata: Metadata = {
  title: "Help & support",
};

export default async function HelpPage() {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  // Only what the Help page needs of each note crosses to the browser: the
  // source-file anchors the verifier reads stay on the server.
  const notes = listHelpNotesFor(companyContext.permissions).map((note) => ({
    slug: note.slug,
    areaId: note.area,
    title: note.title,
    summary: note.summary,
    steps: note.steps,
    goodToKnow: note.goodToKnow,
    alsoAsked: note.alsoAsked,
  }));

  return (
    <HelpPageView
      notes={notes}
      areas={HELP_AREAS.map((area) => ({ id: area.id, label: area.label }))}
      info={getLiveOnboardingInfo()}
      companyName={companyContext.company.name}
      showSetupShortcuts={companyContext.permissions.manageCompany}
      feedbackButtonEnabled={isBetaBugReportEnabled()}
    />
  );
}
