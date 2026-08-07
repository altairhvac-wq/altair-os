"use client";

import { useMemo, useState } from "react";
import { Mail, UserPlus } from "lucide-react";
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
import { PendingInvitesCard } from "./PendingInvitesCard";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import { SettingsWorkspacePage } from "./SettingsWorkspacePage";
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

/**
 * Users tab — the company tree IS the page. Administrative chrome (invite
 * form, incoming invitations) lives behind count-badged toolbar buttons so
 * the first screenful is people, not forms.
 */
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
  const [invitationsOpen, setInvitationsOpen] = useState(false);
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
      description="Your company tree — click a member to manage them."
    >
      <div className={altairMcListClass}>
        {/* One toolbar: invite + incoming invitations behind buttons, search right. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-altair-border bg-[var(--surface-tile)] px-3 py-2 sm:px-4">
          {canInviteMembers ? (
            <button
              type="button"
              onClick={() => {
                setInviteExpanded((open) => !open);
                setInvitationsOpen(false);
              }}
              aria-expanded={inviteExpanded}
              className={adminPanelActionAccentClass}
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              {inviteExpanded ? "Close invite" : "Invite member"}
            </button>
          ) : null}

          {pendingInvites.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setInvitationsOpen((open) => !open);
                setInviteExpanded(false);
              }}
              aria-expanded={invitationsOpen}
              className={adminPanelActionClass}
            >
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Invitations
              <span className="ml-0.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-altair-brass/15 px-1.5 py-0.5 text-[10px] font-bold text-altair-brass">
                {pendingInvites.length}
              </span>
            </button>
          ) : null}

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members..."
            aria-label="Search team members"
            className={`${fieldSearchClass} ml-auto w-full sm:w-auto sm:max-w-xs`}
          />
        </div>

        {canInviteMembers ? (
          <TeamInviteForm
            currentUserRole={currentUserRole}
            onMemberInvited={handleMemberInvited}
            collapsible
            expanded={inviteExpanded}
            onExpandedChange={setInviteExpanded}
          />
        ) : null}

        {invitationsOpen && pendingInvites.length > 0 ? (
          <div className="border-b border-altair-border px-3 py-3 sm:px-4">
            <PendingInvitesCard invites={pendingInvites} variant="settings" />
          </div>
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
      </div>
    </SettingsWorkspacePage>
  );
}
