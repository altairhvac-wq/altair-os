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
import {
  formatCompanyStatus,
  type CompanyProfileSummary,
  type TeamMember,
} from "@/shared/types/team-member";
import { SettingsFutureCard } from "./SettingsFutureCard";
import { TeamInviteForm } from "./TeamInviteForm";
import { TeamMembersTable } from "./TeamMembersTable";

type SettingsPageViewProps = {
  companyProfile: CompanyProfileSummary;
  initialMembers: TeamMember[];
  currentUserId: string;
  currentUserRole: CompanyProfileSummary["currentUserRole"];
  canManageTeam: boolean;
  showSystemCheckLink?: boolean;
  membersLoadError?: string;
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
}: SettingsPageViewProps) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);

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

  function handleMemberInvited(member: TeamMember) {
    setMembers((previous) => {
      const existingIndex = previous.findIndex((item) => item.id === member.id);
      if (existingIndex >= 0) {
        return previous.map((item) => (item.id === member.id ? member : item));
      }

      return [...previous, member];
    });
    setRoleError(null);
  }

  const location = buildLocationLabel(companyProfile);
  const contactLine = [companyProfile.email, companyProfile.phone]
    .filter(Boolean)
    .join(" · ");

  const summaryCards = [
    {
      label: "Company",
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
      label: "Team members",
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your company profile, team members, and workspace preferences.
        </p>
        {contactLine ? (
          <p className="mt-2 text-sm text-slate-500">{contactLine}</p>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 truncate text-lg font-bold text-slate-900">
                  {card.value}
                </p>
                <p className="mt-1 text-sm text-slate-600">{card.description}</p>
              </div>
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
              >
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="admin-card">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Team Members</h2>
            <p className="text-sm text-slate-600">
              {canManageTeam
                ? "View members and update roles for your company workspace."
                : "View members in your company workspace."}
            </p>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:max-w-xs"
          />
        </div>

        {canManageTeam ? (
          <TeamInviteForm
            currentUserRole={currentUserRole}
            onMemberInvited={handleMemberInvited}
          />
        ) : null}

        {membersLoadError ? (
          <div className="mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-6">
            {membersLoadError}
          </div>
        ) : null}

        {roleError ? (
          <div className="mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:mx-6">
            {roleError}
          </div>
        ) : null}

        {!membersLoadError && filteredMembers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            {search.trim()
              ? "No team members match your search."
              : "No team members found."}
          </div>
        ) : !membersLoadError ? (
          <TeamMembersTable
            members={filteredMembers}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            canManageTeam={canManageTeam}
            onMemberUpdated={handleMemberUpdated}
            onRoleChangeError={setRoleError}
          />
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Workspace Preferences
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {showSystemCheckLink ? (
            <Link
              href="/settings/system-check"
              className="rounded-2xl border border-cyan-200 bg-white p-5 transition-colors hover:border-cyan-300 hover:bg-cyan-50/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">System Check</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Read-only production readiness checks for the internal alpha.
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-cyan-700">
                    Owner only
                  </p>
                </div>
              </div>
            </Link>
          ) : null}
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
            description="Branding, defaults, and operational configuration."
            icon={Settings2}
          />
        </div>
      </section>
    </div>
  );
}
