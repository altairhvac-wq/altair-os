"use client";

import { useMemo, useState } from "react";
import { GitBranch, UserPlus } from "lucide-react";
import { getInvitableTeamRoles } from "@/lib/database/services/member-role-guard";
import type { PendingTeamInvite } from "@/lib/database/queries/memberships";
import type {
  CompanyProfileSummary,
  TeamMember,
} from "@/shared/types/team-member";
import { fieldSearchClass } from "@/shared/design-system/components/field-styles";
import { altairMcListClass } from "@/shared/design-system/components/mc-surface";
import {
  adminPanelActionAccentClass,
  adminPanelActionClass,
} from "@/shared/design-system/shell";
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

type TeamSettingsViewProps = {
  initialMembers: TeamMember[];
  currentUserId: string;
  currentUserRole: CompanyProfileSummary["currentUserRole"];
  canManageTeam: boolean;
  pendingInvites?: PendingTeamInvite[];
  membersLoadError?: string;
  /** @deprecated MC v2 is the settings surface; kept for call-site compatibility. */
  northStar?: boolean;
};

export function TeamSettingsView({
  initialMembers,
  currentUserId,
  currentUserRole,
  canManageTeam,
  pendingInvites = [],
  membersLoadError,
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

  return (
    <SettingsWorkspacePage
      title="Users"
      description="Manage members, invitations, roles, and reporting lines."
    >
      <SettingsWorkspaceSection
        title="Invitations"
        description="Review pending invitations associated with your account."
        card={false}
      >
        <PendingInvitesCard invites={pendingInvites} variant="settings" />
      </SettingsWorkspaceSection>

      <SettingsWorkspaceSection
        title="Members and roles"
        description={
          canManageTeam
            ? "Invite teammates, assign roles, and map reporting lines."
            : "View the current team roster and reporting structure."
        }
        card={false}
      >
        <div className={altairMcListClass}>
          <div className="flex flex-col gap-2 border-b border-altair-border bg-[var(--surface-tile)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center justify-between gap-2 sm:block">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-altair-ink">Members</h3>
                <p className="mt-0.5 hidden text-xs text-altair-ink-secondary sm:block">
                  Search and manage workspace access.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOrgTreeOpen(true)}
                  className={adminPanelActionClass}
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
                    className={`${adminPanelActionAccentClass} md:hidden`}
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
              className={`${fieldSearchClass} w-full sm:max-w-xs`}
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
                />
              </div>
              <div className="hidden md:block">
                <TeamInviteForm
                  currentUserRole={currentUserRole}
                  onMemberInvited={handleMemberInvited}
                />
              </div>
            </>
          ) : null}

          {membersLoadError ? (
            <SettingsAlertBanner tone="error" className="mx-4 mt-4 sm:mx-6">
              {membersLoadError}
            </SettingsAlertBanner>
          ) : null}
          {roleError ? (
            <SettingsAlertBanner tone="error" className="mx-4 mt-4 sm:mx-6">
              {roleError}
            </SettingsAlertBanner>
          ) : null}
          {roleSuccess ? (
            <SettingsAlertBanner tone="success" className="mx-4 mt-4 sm:mx-6">
              {roleSuccess}
            </SettingsAlertBanner>
          ) : null}

          {!membersLoadError && filteredMembers.length === 0 ? (
            <TeamMembersEmptyState
              variant={search.trim() ? "no-results" : "no-members"}
              canManageTeam={canManageTeam}
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
