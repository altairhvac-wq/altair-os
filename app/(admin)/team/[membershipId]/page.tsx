import { notFound, redirect } from "next/navigation";
import { canAccessAppRedirectPath } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getTeamMemberProfilePageData } from "@/lib/database/queries/team-member-profile";
import { TeamMemberProfileView } from "@/shared/components/team/TeamMemberProfileView";

type TeamMemberProfilePageProps = {
  params: Promise<{ membershipId: string }>;
};

export default async function TeamMemberProfilePage({
  params,
}: TeamMemberProfilePageProps) {
  const { membershipId } = await params;
  const normalizedMembershipId = membershipId.trim();

  if (!normalizedMembershipId) {
    notFound();
  }

  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  if (
    !canAccessAppRedirectPath(
      companyContext,
      `/team/${normalizedMembershipId}`,
    )
  ) {
    notFound();
  }

  const pageData = await getTeamMemberProfilePageData(
    companyContext.company.id,
    normalizedMembershipId,
    companyContext,
  );

  if (!pageData) {
    notFound();
  }

  return (
    <TeamMemberProfileView
      membershipId={normalizedMembershipId}
      initialProfile={pageData.profile}
      workSummary={pageData.workSummary}
      activity={pageData.activity}
      canEdit={pageData.canEdit}
      canEditSpecialties={pageData.canEditSpecialties}
      canViewNotes={pageData.canViewNotes}
      canViewProfitability={pageData.canViewProfitability}
      canEditProfitability={pageData.canEditProfitability}
      canViewWorkSummary={pageData.canViewWorkSummary}
    />
  );
}
