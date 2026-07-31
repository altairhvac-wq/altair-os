"use client";

import { useMemo, useState } from "react";
import { GitBranch, UserPlus } from "lucide-react";
import { getInvitableTeamRoles } from "@/lib/database/services/member-role-guard";
import type { PendingTeamInvite } from "@/lib/database/queries/memberships";
import type {
  CompanyProfileSummary,
  TeamMember,
} from "@/shared/types/team-member";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { adminPanelActionAccentClass, adminPanelActionClass } from "@/shared/design-system/shell";
import { CompanyOrgTreeSheet } from "./CompanyOrgTreeSheet";
import { PendingInvitesCard } from "./PendingInvitesCard";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import {
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
} from "./SettingsWorkspacePage";
import { TeamInviteForm } from "./TeamInviteForm";
import { TeamMemberMobileCards } from "./TeamMemberMobileCards";
import { TeamMembersEmptyState } from "./TeamMembersEmptyState";
import { TeamMembersTable } from "./TeamMembersTable";
import { st } from "./north-star-m10/settings-north-star-styles";

type TeamSettingsViewProps = {
  initialMembers: TeamMember[];
  currentUserId: string;
  currentUserRole: CompanyProfileSummary["currentUserRole"];
  canManageTeam: boolean;
  pendingInvites?: PendingTeamInvite[];
  membersLoadError?: string;
  northStar?: boolean;
};

export function TeamSettingsView({
  initialMembers,
  currentUserId,
  currentUserRole,
  canManageTeam,
  pendingInvites = [],
  membersLoadError,
  northStar = false,
}: TeamSettingsViewProps) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);
  const [inviteExpanded, setInviteExpanded] = useState(false);
  const [orgTreeOpen, setOrgTreeOpen] = useState(false);
  const invitableRoles = useMemo(
    () => getInvitableTeamRoles(currentUserRole),
    [currentUserRole],
  );
  const canInviteMembers = canManageTeam && invitableRoles.length > 0;
  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      [member.name, member.email, member.role]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [members, search]);

  function handleMemberUpdated(member: TeamMember) {
    setMembers((previous) =>
      previous.map((item) => (item.id === member.id ? member : item)),
    );
    setRoleError(null);
  }

  function handleMemberRemoved(membershipId: string) {
    setMembers((previous) =>
      previous.filter((item) => item.id !== membershipId),
    );
    setRoleError(null);
  }

  function handleMemberInvited(member: TeamMember) {
    setMembers((previous) => {
      const existing = previous.some((item) => item.id === member.id);
      return existing
        ? previous.map((item) => (item.id === member.id ? member : item))
        : [...previous, member];
    });
    setRoleError(null);
    setRoleSuccess(null);
    setInviteExpanded(false);
  }

  const memberSurfaceClass = northStar
    ? "overflow-hidden rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]"
    : "admin-card overflow-hidden";
  const toolbarClass = northStar
    ? "border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4]"
    : "admin-panel-header";

  return (
    <SettingsWorkspacePage
      title="Team"
      description="Manage members, invitations, roles, and reporting lines."
      northStar={northStar}
    >
      <SettingsWorkspaceSection
        title="Invitations"
        description="Review pending invitations associated with your account."
        northStar={northStar}
      >
        <PendingInvitesCard
          invites={pendingInvites}
          variant="settings"
          northStar={northStar}
        />
      </SettingsWorkspaceSection>

      <SettingsWorkspaceSection
        title="Members and roles"
        description={
          canManageTeam
            ? "Invite teammates, assign roles, and map reporting lines."
            : "View the current team roster and reporting structure."
        }
        northStar={northStar}
      >
        <div className={memberSurfaceClass}>
          <div
            className={`${toolbarClass} flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3`}
          >
            <div className="flex min-w-0 items-center justify-between gap-2 sm:block">
              <div className="min-w-0">
                <h3
                  className={`text-sm font-semibold ${
                    northStar ? "text-[#17130E]" : "text-slate-900"
                  }`}
                >
                  Members
                </h3>
                <p
                  className={`mt-0.5 hidden text-xs sm:block ${
                    northStar ? "text-[#4F4638]" : "text-slate-600"
                  }`}
                >
                  Search and manage workspace access.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrgTreeOpen(true)}
                  className={northStar ? st.panelAction : adminPanelActionClass}
                >
                  <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">View company tree</span>
                  <span className="sm:hidden">Org tree</span>
                </button>
                {canInviteMembers ? (
                  <button
                    type="button"
                    onClick={() => setInviteExpanded((open) => !open)}
                    aria-expanded={inviteExpanded}
                    className={`${
                      northStar
                        ? st.panelActionAccent
                        : adminPanelActionAccentClass
                    } md:hidden`}
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    {inviteExpanded ? "Close" : "Invite member"}
                  </button>
                ) : null}
              </div>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members..."
              aria-label="Search team members"
              className={`${
                northStar ? st.searchInput : adminFormInputClass
              } w-full sm:max-w-xs`}
            />
          </div>

          {canInviteMembers ? (
            <>
              <div className="md:hidden">
                <TeamInviteForm
                  currentUserRole={currentUserRole}
                  onMemberInvited={handleMemberInvited}
                  collapsible
                  expanded={inviteExpanded}
                  onExpandedChange={setInviteExpanded}
                  northStar={northStar}
                />
              </div>
              <div className="hidden md:block">
                <TeamInviteForm
                  currentUserRole={currentUserRole}
                  onMemberInvited={handleMemberInvited}
                  northStar={northStar}
                />
              </div>
            </>
          ) : null}

          {membersLoadError ? (
            <SettingsAlertBanner
              tone="error"
              northStar={northStar}
              className="mx-4 mt-4 sm:mx-6"
            >
              {membersLoadError}
            </SettingsAlertBanner>
          ) : null}
          {roleError ? (
            <SettingsAlertBanner
              tone="error"
              northStar={northStar}
              className="mx-4 mt-4 sm:mx-6"
            >
              {roleError}
            </SettingsAlertBanner>
          ) : null}
          {roleSuccess ? (
            <SettingsAlertBanner
              tone="success"
              northStar={northStar}
              className="mx-4 mt-4 sm:mx-6"
            >
              {roleSuccess}
            </SettingsAlertBanner>
          ) : null}

          {!membersLoadError && filteredMembers.length === 0 ? (
            <TeamMembersEmptyState
              variant={search.trim() ? "no-results" : "no-members"}
              canManageTeam={canManageTeam}
              northStar={northStar}
            />
          ) : !membersLoadError ? (
            <>
              <TeamMemberMobileCards
                members={filteredMembers}
                allMembers={members}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                canManageTeam={canManageTeam}
                onMemberUpdated={handleMemberUpdated}
                onMemberRemoved={handleMemberRemoved}
                onRoleChangeError={(message) => {
                  setRoleError(message);
                  setRoleSuccess(null);
                }}
                onRoleChangeSuccess={(message) => {
                  setRoleSuccess(message);
                  setRoleError(null);
                }}
                northStar={northStar}
              />
              <TeamMembersTable
                members={filteredMembers}
                allMembers={members}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                canManageTeam={canManageTeam}
                onMemberUpdated={handleMemberUpdated}
                onMemberRemoved={handleMemberRemoved}
                onRoleChangeError={(message) => {
                  setRoleError(message);
                  setRoleSuccess(null);
                }}
                onRoleChangeSuccess={(message) => {
                  setRoleSuccess(message);
                  setRoleError(null);
                }}
                northStar={northStar}
              />
            </>
          ) : null}

          <CompanyOrgTreeSheet
            open={orgTreeOpen}
            onClose={() => setOrgTreeOpen(false)}
            members={members}
          />
        </div>
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
