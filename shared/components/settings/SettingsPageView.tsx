"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  Plug,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import type { PendingTeamInvite } from "@/lib/database/queries/memberships";
import {
  formatCompanyStatus,
  type CompanyProfileSummary,
  type TeamMember,
} from "@/shared/types/team-member";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import { OnboardingChecklistSection } from "@/shared/components/onboarding/OnboardingChecklistSection";
import { DemoDataSection } from "@/shared/components/onboarding/DemoDataSection";
import { shouldShowOnboardingChecklist } from "@/shared/lib/onboarding-checklist";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { CompanyBillingDefaults } from "@/shared/lib/company-billing-defaults";
import { BillingDocumentDefaultsCard } from "./BillingDocumentDefaultsCard";
import { PendingInvitesCard } from "./PendingInvitesCard";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import { SettingsFutureCard } from "./SettingsFutureCard";
import { SettingsSection } from "./SettingsSection";
import { TeamInviteForm } from "./TeamInviteForm";
import { TeamMemberMobileCards } from "./TeamMemberMobileCards";
import { TeamMembersEmptyState } from "./TeamMembersEmptyState";
import { TeamMembersTable } from "./TeamMembersTable";

type SettingsPageViewProps = {
  companyProfile: CompanyProfileSummary;
  initialMembers: TeamMember[];
  currentUserId: string;
  currentUserRole: CompanyProfileSummary["currentUserRole"];
  canManageTeam: boolean;
  showSystemCheckLink?: boolean;
  membersLoadError?: string;
  onboardingChecklist?: OnboardingChecklist;
  billingDefaults: CompanyBillingDefaults;
  canManageBillingDefaults: boolean;
  showBillingDefaultsSetupHint?: boolean;
  demoDataStatus?: DemoDataStatus;
  pendingInvites?: PendingTeamInvite[];
};

function buildLocationLabel(profile: CompanyProfileSummary): string | null {
  const parts = [profile.city, profile.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function SettingsPageView({
  companyProfile,
  initialMembers,
  currentUserId,
  currentUserRole,
  canManageTeam,
  showSystemCheckLink = false,
  membersLoadError,
  onboardingChecklist,
  billingDefaults,
  canManageBillingDefaults,
  showBillingDefaultsSetupHint = false,
  demoDataStatus,
  pendingInvites = [],
}: SettingsPageViewProps) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) => {
      const haystack = [member.name, member.email, member.role]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
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
      const existingIndex = previous.findIndex((item) => item.id === member.id);
      if (existingIndex >= 0) {
        return previous.map((item) => (item.id === member.id ? member : item));
      }

      return [...previous, member];
    });
    setRoleError(null);
    setRoleSuccess(null);
  }

  function handleRoleChangeSuccess(message: string) {
    setRoleSuccess(message);
    setRoleError(null);
  }

  function handleRoleChangeError(message: string) {
    setRoleError(message);
    setRoleSuccess(null);
  }

  const location = buildLocationLabel(companyProfile);
  const contactLine = [companyProfile.email, companyProfile.phone]
    .filter(Boolean)
    .join(" · ");
  const hasContactInfo = Boolean(contactLine);

  const summaryCards = [
    {
      label: "Workspace",
      value: companyProfile.name,
      description: formatCompanyStatus(companyProfile.status),
      icon: Building2,
      iconClass: "text-cyan-600 bg-cyan-50",
    },
    {
      label: "Your role",
      value: COMPANY_ROLE_LABELS[companyProfile.currentUserRole],
      description: "Current workspace access",
      icon: Settings2,
      iconClass: "text-violet-600 bg-violet-50",
    },
    {
      label: "Team size",
      value: String(companyProfile.memberCount),
      description: "Active and invited members",
      icon: Users,
      iconClass: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Timezone",
      value: companyProfile.timezone,
      description: location ?? "Company locale",
      icon: Building2,
      iconClass: "text-amber-600 bg-amber-50",
    },
  ];

  const showOnboarding =
    onboardingChecklist &&
    shouldShowOnboardingChecklist(onboardingChecklist);
  const showDemoData =
    demoDataStatus &&
    (demoDataStatus.isEligibleForSeed || demoDataStatus.hasDemoData);
  const showSetupSection =
    showOnboarding || showDemoData || showSystemCheckLink;

  return (
    <div className="min-w-0 max-w-full space-y-3 sm:space-y-4">
      <header className="admin-page-header flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0 flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h1 className="shrink-0 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            Settings
          </h1>
          <p className="min-w-0 text-xs text-slate-500">
            Workspace, team, and document defaults
          </p>
        </div>
        {hasContactInfo ? (
          <p className="min-w-0 break-words text-xs text-slate-500 sm:max-w-xs sm:text-right">
            {contactLine}
          </p>
        ) : (
          <p className="text-xs text-slate-400 sm:text-right">
            Contact details coming soon
          </p>
        )}
      </header>

      <SettingsSection
        title="Company"
        description="Profile, locale, and workspace status"
      >
        <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="admin-card min-w-0 p-3 sm:p-3.5"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-1 truncate text-base font-bold text-slate-900">
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {card.description}
                  </p>
                </div>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconClass}`}
                >
                  <card.icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        id="team"
        title="Team"
        description="Members, invitations, and workspace access"
      >
        <PendingInvitesCard invites={pendingInvites} variant="settings" />

        <section
          id="team-members"
          className="admin-card min-w-0 max-w-full overflow-x-clip"
        >
          <div className="admin-panel-header flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">Members</h3>
              <p className="admin-text-helper mt-0.5">
                {canManageTeam
                  ? "Invite teammates and assign roles."
                  : "Roster is limited to owner and admin roles."}
              </p>
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search members..."
              aria-label="Search team members"
              className="w-full min-h-[44px] rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:max-w-xs"
            />
          </div>

          {canManageTeam ? (
            <TeamInviteForm
              currentUserRole={currentUserRole}
              onMemberInvited={handleMemberInvited}
            />
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
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                canManageTeam={canManageTeam}
                onMemberUpdated={handleMemberUpdated}
                onMemberRemoved={handleMemberRemoved}
                onRoleChangeError={handleRoleChangeError}
                onRoleChangeSuccess={handleRoleChangeSuccess}
              />
              <TeamMembersTable
                members={filteredMembers}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                canManageTeam={canManageTeam}
                onMemberUpdated={handleMemberUpdated}
                onMemberRemoved={handleMemberRemoved}
                onRoleChangeError={handleRoleChangeError}
                onRoleChangeSuccess={handleRoleChangeSuccess}
              />
            </>
          ) : null}
        </section>
      </SettingsSection>

      <SettingsSection
        id="billing-defaults"
        title="Documents & Billing Defaults"
        description="Defaults for new estimates and invoices"
      >
        <BillingDocumentDefaultsCard
          initialDefaults={billingDefaults}
          canManage={canManageBillingDefaults}
          showSetupHint={showBillingDefaultsSetupHint}
        />
      </SettingsSection>

      {showSetupSection ? (
        <SettingsSection
          title="Setup & Tools"
          description="Onboarding, demo data, and diagnostics"
        >
          {showOnboarding || showDemoData ? (
            <div className="grid min-w-0 gap-2.5 sm:gap-3 lg:grid-cols-2 lg:items-start">
              {showOnboarding ? (
                <OnboardingChecklistSection
                  checklist={onboardingChecklist}
                  companyId={companyProfile.id}
                  userId={currentUserId}
                  variant="settings"
                />
              ) : null}

              {showDemoData ? (
                <DemoDataSection
                  companyId={companyProfile.id}
                  status={demoDataStatus}
                  variant="settings"
                />
              ) : null}
            </div>
          ) : null}

          {showSystemCheckLink ? (
            <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:max-w-xl">
              <Link
                href="/settings/system-check"
                className="min-w-0 rounded-xl border border-cyan-200 bg-white p-3.5 transition-colors hover:border-cyan-300 hover:bg-cyan-50/40 sm:p-4"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">
                      System Check
                    </h3>
                    <p className="mt-0.5 text-xs leading-snug text-slate-600 sm:text-sm">
                      Read-only production readiness checks for the internal
                      alpha.
                    </p>
                    <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-cyan-700">
                      Owner only
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ) : null}
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Coming soon"
        description="Planned settings areas"
      >
        <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          <SettingsFutureCard
            title="Billing"
            description="Subscription plans, payment methods, and invoice history."
            icon={CreditCard}
          />
          <SettingsFutureCard
            title="Integrations"
            description="Connect accounting, payroll, and field service tools."
            icon={Plug}
          />
          <SettingsFutureCard
            title="Notifications"
            description="Configure alerts for jobs, billing, and team activity."
            icon={Bell}
          />
          <SettingsFutureCard
            title="Company Preferences"
            description="Company profile, branding, and operational configuration."
            icon={Settings2}
          />
        </div>
      </SettingsSection>
    </div>
  );
}
