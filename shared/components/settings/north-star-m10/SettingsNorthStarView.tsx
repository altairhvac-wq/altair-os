"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { BillingDocumentDefaultsCard } from "../BillingDocumentDefaultsCard";
import { PaymentSettingsCard } from "../PaymentSettingsCard";
import { PendingInvitesCard } from "../PendingInvitesCard";
import { SettingsAlertBanner } from "../SettingsAlertBanner";
import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { SettingsComingSoonSection } from "../SettingsComingSoonSection";
import { TeamInviteForm } from "../TeamInviteForm";
import { TeamMemberMobileCards } from "../TeamMemberMobileCards";
import { TeamMembersEmptyState } from "../TeamMembersEmptyState";
import { TeamMembersTable } from "../TeamMembersTable";
import { CompanyOrgTreeSheet } from "../CompanyOrgTreeSheet";
import { BetaBugReportButton } from "@/shared/components/beta-feedback/BetaBugReportButton";
import { isBetaBugReportEnabled } from "@/lib/beta/beta-bug-report";
import { st } from "./settings-north-star-styles";

export type SettingsNorthStarViewProps = {
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
  canManageOnlineCheckout?: boolean;
  stripeOnboardingConfigured?: boolean;
  stripeTestMode?: boolean;
  paymentSetupNotice?: PaymentSetupReturnNotice | null;
  companyTimezone?: string | null;
};

function buildLocationLabel(profile: CompanyProfileSummary): string | null {
  const parts = [profile.city, profile.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function SettingsNorthStarSectionHeader({
  eyebrow,
  title,
  description,
  action,
  status,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  status?: React.ReactNode;
}) {
  return (
    <div className="shrink-0 border-b border-[rgba(138,99,36,0.12)] px-3 py-2.5 sm:px-4 sm:py-3 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={st.sectionEyebrow}>{eyebrow}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <h2 className={st.sectionTitle}>{title}</h2>
            {status}
          </div>
          <p className={st.sectionSubtitle}>{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function SettingsNorthStarView({
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
  canManageOnlineCheckout = false,
  stripeOnboardingConfigured = false,
  stripeTestMode = false,
  paymentSetupNotice = null,
  companyTimezone,
}: SettingsNorthStarViewProps) {
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
    <MasterShellPage density="compact" className={st.pageCanvas}>
      <MasterPageHeader
        title="Settings"
        subtitle="Configure your company, team, billing defaults, and system preferences."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-settings-page-header ${st.pageHeader}`}
        titleClassName={st.pageHeaderTitle}
        subtitleClassName={st.pageHeaderSubtitle}
      />

      <MasterContentStack
        density="compact"
        className="settings-north-star-workspace min-w-0 space-y-3 px-3 sm:space-y-3.5 sm:px-3.5 lg:px-5"
      >
        <section className={st.sectionSurface}>
          <SettingsNorthStarSectionHeader
            eyebrow="Company"
            title="Company profile"
            description="Company name, locale, and contact information."
          />

          <div className="px-3 py-2 sm:px-4 sm:py-4 lg:px-5">
            <div className="min-w-0 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-2.5 sm:p-4">
              <div className="space-y-1.5 md:hidden">
                <div className="grid grid-cols-3 gap-1.5">
                  {primaryCompanyFields.map((row) => (
                    <div
                      key={row.label}
                      className="min-w-0 rounded-lg border border-[rgba(138,99,36,0.10)] bg-[#FBF7EF] px-2 py-1.5"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4F4638]">
                        {row.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-[#17130E]">
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
                        className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-2 py-0.5"
                      >
                        <span className="shrink-0 text-[10px] font-medium text-[#4F4638]">
                          {row.label}
                        </span>
                        <span className="min-w-0 truncate text-xs font-medium text-[#17130E]">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <dl className="hidden divide-y divide-[rgba(138,99,36,0.10)] md:block">
                {companyFields.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <dt className="shrink-0 text-xs text-[#4F4638]">
                      {row.label}
                    </dt>
                    <dd className="min-w-0 truncate text-right text-sm font-medium text-[#17130E]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section id="team" className={`${st.sectionSurface} overflow-hidden`}>
          <SettingsNorthStarSectionHeader
            eyebrow="Team"
            title="Members & invitations"
            description={
              canManageTeam
                ? "Invite teammates, assign roles, and map reporting lines."
                : "Roster is limited to owner and admin roles."
            }
          />

          <div className="space-y-2.5 px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
            <PendingInvitesCard invites={pendingInvites} variant="settings" northStar />

            <div
              id="team-members"
              className="min-w-0 max-w-full overflow-x-clip rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]"
            >
              <div className="flex flex-col gap-1.5 border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5">
                <div className="flex min-w-0 items-center justify-between gap-2 sm:block">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[#17130E]">Members</h3>
                    <p className="mt-0.5 hidden text-xs text-[#4F4638] sm:block">
                      {canManageTeam
                        ? "Search, invite, and manage workspace access."
                        : "View the current team roster."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOrgTreeOpen(true)}
                      className={st.panelAction}
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
                        className={`${st.panelActionAccent} md:hidden`}
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
                  className={`${st.searchInput} w-full sm:max-w-xs`}
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
                      northStar
                    />
                  </div>
                  <div className="hidden md:block">
                    <TeamInviteForm
                      currentUserRole={currentUserRole}
                      onMemberInvited={handleMemberInvited}
                      northStar
                    />
                  </div>
                </>
              ) : null}

              {membersLoadError ? (
                <SettingsAlertBanner tone="error" northStar className="mx-4 mt-4 sm:mx-6">
                  {membersLoadError}
                </SettingsAlertBanner>
              ) : null}

              {roleError ? (
                <SettingsAlertBanner tone="error" northStar className="mx-4 mt-4 sm:mx-6">
                  {roleError}
                </SettingsAlertBanner>
              ) : null}

              {roleSuccess ? (
                <SettingsAlertBanner tone="success" northStar className="mx-4 mt-4 sm:mx-6">
                  {roleSuccess}
                </SettingsAlertBanner>
              ) : null}

              {!membersLoadError && filteredMembers.length === 0 ? (
                <TeamMembersEmptyState
                  variant={search.trim() ? "no-results" : "no-members"}
                  canManageTeam={canManageTeam}
                  northStar
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
                    northStar
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
                    northStar
                  />
                </>
              ) : null}

              <CompanyOrgTreeSheet
                open={orgTreeOpen}
                onClose={() => setOrgTreeOpen(false)}
                members={members}
              />
            </div>
          </div>
        </section>

        <section id="billing-defaults" className={st.sectionSurface}>
          <SettingsNorthStarSectionHeader
            eyebrow="Billing defaults"
            title="Document defaults"
            description="Defaults for new estimates and invoices."
          />
          <div className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5">
            <BillingDocumentDefaultsCard
              initialDefaults={billingDefaults}
              canManage={canManageBillingDefaults}
              showSetupHint={showBillingDefaultsSetupHint}
              northStar
            />
            <SettingsComingSoonSection items={billingComingSoonItems} northStar />
          </div>
        </section>

        {canViewPaymentSettings ? (
          <section id="online-payments" className={st.sectionSurface}>
            <SettingsNorthStarSectionHeader
              eyebrow="Payments"
              title="Online payments"
              description="Connect Stripe for card payments, or keep using invoices and manual recording."
            />
            <div className="px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5">
              <PaymentSettingsCard
                stripeAccount={stripePaymentSettings ?? null}
                companyTimezone={companyTimezone}
                canStartStripeSetup={canStartStripeSetup}
                canManageOnlineCheckout={canManageOnlineCheckout}
                stripeOnboardingConfigured={stripeOnboardingConfigured}
                stripeTestMode={stripeTestMode}
                paymentSetupNotice={paymentSetupNotice}
                northStar
              />
            </div>
          </section>
        ) : null}

        <section className={st.sectionSurface}>
          <SettingsNorthStarSectionHeader
            eyebrow="Integrations"
            title="External connections"
            description="Connect external tools and services."
          />
          <div className="px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5">
            <SettingsComingSoonSection items={integrationItems} northStar />
          </div>
        </section>

        <section className={st.sectionSurface}>
          <SettingsNorthStarSectionHeader
            eyebrow="System"
            title="Diagnostics & preferences"
            description="Diagnostics and workspace preferences."
          />
          <div className="space-y-3 px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5">
            {showSystemCheckLink ? (
              <Link href="/settings/system-check" className={st.systemCheckLink}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className={st.systemCheckIconWrap}>
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={st.systemCheckTitle}>System Check</h3>
                    <p className="mt-0.5 hidden text-xs leading-snug text-[#4F4638] sm:block sm:text-sm">
                      Read-only production readiness checks for the internal
                      alpha.
                    </p>
                  </div>
                </div>
                <span className={st.systemCheckBadge}>Owner only</span>
              </Link>
            ) : null}
            <SettingsComingSoonSection items={systemComingSoonItems} northStar />
          </div>
        </section>

        {isBetaBugReportEnabled() ? (
          <div className="pt-1 md:hidden">
            <BetaBugReportButton inlineOnly />
          </div>
        ) : null}
      </MasterContentStack>
    </MasterShellPage>
  );
}
