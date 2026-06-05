import { notFound, redirect } from "next/navigation";
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
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const pageData = await getTeamMemberProfilePageData(
    companyContext.company.id,
    membershipId,
    companyContext,
  );

  if (!pageData) {
    notFound();
  }

  return (
    <TeamMemberProfileView
      membershipId={membershipId}
      initialProfile={pageData.profile}
      workSummary={pageData.workSummary}
      activity={pageData.activity}
      canEdit={pageData.canEdit}
      canViewProfitability={pageData.canViewProfitability}
      canEditProfitability={pageData.canEditProfitability}
      canViewWorkSummary={pageData.canViewWorkSummary}
    />
  );
}
