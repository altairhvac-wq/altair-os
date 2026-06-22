"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { SettingsNorthStarView } from "@/shared/components/settings/north-star-m10";
import {
  Bell,
  CreditCard,
  GitBranch,
  Plug,
  Settings2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { getInvitableTeamRoles } from "@/lib/database/services/member-role-guard";
import type { PendingTeamInvite } from "@/lib/database/queries/memberships";
import {
  formatCompanyStatus,
  type CompanyProfileSummary,
  type TeamMember,
} from "@/shared/types/team-member";
import type { OnboardingChecklist } from "@/shared/types/onboarding";
import type { DemoDataStatus } from "@/shared/types/demo-data";
import type { CompanyBillingDefaults } from "@/shared/lib/company-billing-defaults";
import type {
  PaymentSetupReturnNotice,
  StripePaymentSettingsSummary,
} from "@/shared/types/settings/payment-settings";
import { BillingDocumentDefaultsCard } from "./BillingDocumentDefaultsCard";
import { PaymentSettingsCard } from "./PaymentSettingsCard";
import { PendingInvitesCard } from "./PendingInvitesCard";
import { SettingsAlertBanner } from "./SettingsAlertBanner";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
  adminPanelActionAccentClass,
  adminPanelActionClass,
} from "@/shared/design-system/shell";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { SettingsComingSoonSection } from "./SettingsComingSoonSection";
import { TeamInviteForm } from "./TeamInviteForm";
import { TeamMemberMobileCards } from "./TeamMemberMobileCards";
import { TeamMembersEmptyState } from "./TeamMembersEmptyState";
import { TeamMembersTable } from "./TeamMembersTable";
import { CompanyOrgTreeSheet } from "./CompanyOrgTreeSheet";
import { BetaBugReportButton } from "@/shared/components/beta-feedback/BetaBugReportButton";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";

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
  demoDataLoadError?: string;
  pendingInvites?: PendingTeamInvite[];
  canViewPaymentSettings?: boolean;
  stripePaymentSettings?: StripePaymentSettingsSummary | null;
  canStartStripeSetup?: boolean;
  stripeOnboardingConfigured?: boolean;
  paymentSetupNotice?: PaymentSetupReturnNotice | null;
  companyTimezone?: string | null;
};

function buildLocationLabel(profile: CompanyProfileSummary): string | null {
  const parts = [profile.city, profile.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function SettingsPageView(props: SettingsPageViewProps) {
  if (isNorthStarShellEnabled()) {
    return <SettingsNorthStarView {...props} />;
  }

  return <SettingsPageLegacyView {...props} />;
}

function SettingsPageLegacyView({
  companyProfile,
  initialMembers,
  currentUserId,
  currentUserRole,
  canManageTeam,
  showSystemCheckLink = false,
  membersLoadError,
  billingDefaults,
  canManageBillingDefaults,
  showBillingDefaultsSetupHint = false,
  pendingInvites = [],
  canViewPaymentSettings = false,
  stripePaymentSettings = null,
  canStartStripeSetup = false,
  stripeOnboardingConfigured = false,
  paymentSetupNotice = null,
  companyTimezone,
}: SettingsPageViewProps) {
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
    setInviteExpanded(false);
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

  const companyFields = [
    { label: "Company", value: companyProfile.name },
    { label: "Status", value: formatCompanyStatus(companyProfile.status) },
    { label: "Timezone", value: companyProfile.timezone },
    ...(location ? [{ label: "Location", value: location }] : []),
    ...(companyProfile.email
      ? [{ label: "Email", value: companyProfile.email }]
      : []),
    ...(companyProfile.phone
      ? [{ label: "Phone", value: companyProfile.phone }]
      : []),
  ];
  const primaryCompanyFields = companyFields.slice(0, 3);
  const extraCompanyFields = companyFields.slice(3);

  const billingComingSoonItems = [
    {
      title: "Billing",
      description:
        "Subscription plans, payment methods, and invoice history.",
      icon: CreditCard,
    },
  ];

  const integrationItems = [
    {
      title: "Integrations",
      description: "Connect accounting, payroll, and field service tools.",
      icon: Plug,
    },
    {
      title: "Notifications",
      description: "Configure alerts for jobs, billing, and team activity.",
      icon: Bell,
    },
  ];

  const systemComingSoonItems = [
    {
      title: "Company Preferences",
      description: "Company profile, branding, and operational configuration.",
      icon: Settings2,
    },
  ];

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="Settings"
            subtitle="Configure your company, team, billing defaults, and system preferences."
            density="compact"
          />

          <MasterPageSection
            title="Company"
            description="Company name, locale, and contact information"
            density="compact"
          >
            <MasterPageSurface variant="card" className="min-w-0 p-2.5 sm:p-4">
              <div className="space-y-1.5 md:hidden">
                <div className="grid grid-cols-3 gap-1.5">
                  {primaryCompanyFields.map((row) => (
                    <div
                      key={row.label}
                      className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        {row.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-900">
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
                {extraCompanyFields.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {extraCompanyFields.map((row) => (
                      <div
                        key={row.label}
                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5"
                      >
                        <span className="shrink-0 text-[10px] font-medium text-slate-500">
                          {row.label}
                        </span>
                        <span className="min-w-0 truncate text-xs font-medium text-slate-900">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <dl className="hidden divide-y divide-slate-100 md:block">
                {companyFields.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <dt className="shrink-0 text-xs text-slate-500">
                      {row.label}
                    </dt>
                    <dd className="min-w-0 truncate text-right text-sm font-medium text-slate-900">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </MasterPageSurface>
          </MasterPageSection>

          <MasterPageSection
            id="team"
            title="Team"
            description="Members, invitations, roles, and reporting lines"
            density="compact"
          >
            <PendingInvitesCard invites={pendingInvites} variant="settings" />

            <MasterPageSurface
              id="team-members"
              variant="card"
              className="min-w-0 max-w-full overflow-x-clip"
            >
          <div className="admin-panel-header flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center justify-between gap-2 sm:block">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Members</h3>
                <p className="admin-text-helper mt-0.5 hidden sm:block">
                  {canManageTeam
                    ? "Invite teammates, assign roles, and map reporting lines."
                    : "Roster is limited to owner and admin roles."}
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
              className={`${adminFormInputClass} w-full shadow-sm sm:max-w-xs`}
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
                onRoleChangeError={handleRoleChangeError}
                onRoleChangeSuccess={handleRoleChangeSuccess}
              />
              <TeamMembersTable
                members={filteredMembers}
                allMembers={members}
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

            <CompanyOrgTreeSheet
              open={orgTreeOpen}
              onClose={() => setOrgTreeOpen(false)}
              members={members}
            />
            </MasterPageSurface>
          </MasterPageSection>

          <MasterPageSection
            id="billing-defaults"
            title="Billing defaults"
            description="Defaults for new estimates and invoices"
            density="compact"
          >
            <BillingDocumentDefaultsCard
              initialDefaults={billingDefaults}
              canManage={canManageBillingDefaults}
              showSetupHint={showBillingDefaultsSetupHint}
            />
            <div className="mt-3">
              <SettingsComingSoonSection items={billingComingSoonItems} />
            </div>
          </MasterPageSection>

          {canViewPaymentSettings ? (
            <MasterPageSection
              id="online-payments"
              title="Online payments"
              description="Stripe Connect account status"
              density="compact"
            >
              <PaymentSettingsCard
                stripeAccount={stripePaymentSettings ?? null}
                companyTimezone={companyTimezone}
                canStartStripeSetup={canStartStripeSetup}
                stripeOnboardingConfigured={stripeOnboardingConfigured}
                paymentSetupNotice={paymentSetupNotice}
              />
            </MasterPageSection>
          ) : null}

          <MasterPageSection
            title="Integrations"
            description="Connect external tools and services"
            density="compact"
          >
            <SettingsComingSoonSection items={integrationItems} />
          </MasterPageSection>

          <MasterPageSection
            title="System"
            description="Diagnostics and workspace preferences"
            density="compact"
          >
            {showSystemCheckLink ? (
              <Link
                href="/settings/system-check"
                className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-cyan-200 hover:bg-cyan-50/30 sm:max-w-xl sm:rounded-xl sm:border-cyan-200 sm:p-4"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <ShieldCheck
                    className="h-4 w-4 shrink-0 text-cyan-600 sm:hidden"
                    aria-hidden="true"
                  />
                  <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 sm:flex">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">
                      System Check
                    </h3>
                    <p className="hidden text-xs leading-snug text-slate-600 sm:mt-0.5 sm:block sm:text-sm">
                      Read-only production readiness checks for the internal
                      alpha.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-cyan-700">
                  Owner only
                </span>
              </Link>
            ) : null}
            <div className={showSystemCheckLink ? "mt-3" : undefined}>
              <SettingsComingSoonSection items={systemComingSoonItems} />
            </div>
          </MasterPageSection>

          {isBetaBugReportEnabled() ? (
            <div className="pt-1 md:hidden">
              <BetaBugReportButton inlineOnly />
            </div>
          ) : null}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
