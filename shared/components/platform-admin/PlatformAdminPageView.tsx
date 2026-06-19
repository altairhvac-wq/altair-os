import Link from "next/link";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { formatDate } from "@/shared/types/customer";
import { formatMembershipStatus } from "@/shared/types/team-member";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import type { PlatformAdminOverview } from "@/shared/types/platform-admin";
import { PlatformNorthStarView } from "@/shared/components/platform-admin/north-star-m13";
import {
  Building2,
  Briefcase,
  Bug,
  FileText,
  Receipt,
  Shield,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

type PlatformAdminPageViewProps = {
  data: PlatformAdminOverview;
};

type SummaryCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
};

function SummaryCard({ label, value, icon: Icon }: SummaryCardProps) {
  return (
    <div className="admin-metric-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="admin-metric-label">{label}</p>
          <p className="admin-metric-value mt-1 sm:text-2xl">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="admin-metric-icon admin-metric-icon-teal">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function formatOptionalDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return formatDate(value);
}

function DebugId({ value }: { value: string }) {
  return (
    <span className="font-mono text-[10px] text-slate-400" title={value}>
      {value.slice(0, 8)}…
    </span>
  );
}

function RecentList({
  title,
  items,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string; meta: string }[];
}) {
  return (
    <section className="admin-card admin-card-body">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No records yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {item.primary}
                </p>
                <p className="truncate text-xs text-slate-500">{item.secondary}</p>
              </div>
              <p className="shrink-0 text-xs text-slate-500">{item.meta}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatSeverityLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStatusLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function PlatformAdminPageView({ data }: PlatformAdminPageViewProps) {
  if (isNorthStarShellEnabled()) {
    return <PlatformNorthStarView data={data} />;
  }

  return <PlatformAdminLegacyPageView data={data} />;
}

function PlatformAdminLegacyPageView({ data }: PlatformAdminPageViewProps) {
  const { summary } = data;

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6">
      <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/50 px-4 py-3">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-cyan-800" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-cyan-950">
              Platform admin (read-only)
            </p>
            <p className="mt-0.5 text-xs text-cyan-900/80">
              Internal beta visibility for the app owner. Cross-tenant data never
              leaves the server.
            </p>
          </div>
        </div>
      </div>

      {data.diagnostics.length > 0 ? (
        <section
          className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3"
          aria-label="Platform admin diagnostics"
        >
          <p className="text-sm font-semibold text-amber-950">Diagnostics</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-900/90">
            {data.diagnostics.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <SummaryCard
          label="Auth accounts"
          value={summary.totalAuthUsers}
          icon={Users}
        />
        <SummaryCard label="Companies" value={summary.totalCompanies} icon={Building2} />
        <SummaryCard
          label="Active memberships"
          value={summary.totalActiveMembers}
          icon={UserRound}
        />
        <SummaryCard label="Jobs" value={summary.totalJobs} icon={Briefcase} />
        <SummaryCard label="Customers" value={summary.totalCustomers} icon={Users} />
        <SummaryCard label="Estimates" value={summary.totalEstimates} icon={FileText} />
        <SummaryCard label="Invoices" value={summary.totalInvoices} icon={Receipt} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentList
          title="Recent companies"
          items={data.recentCompanies.map((company) => ({
            id: company.id,
            primary: company.name,
            secondary: `Created ${formatDate(company.createdAt)}`,
            meta: formatDate(company.createdAt),
          }))}
        />
        <RecentList
          title="Recent auth sign-ups"
          items={data.recentUsers.map((user) => ({
            id: user.id,
            primary: user.fullName?.trim() || user.email,
            secondary: user.email,
            meta: formatDate(user.createdAt),
          }))}
        />
      </div>

      <section className="admin-card overflow-hidden">
        <div className="admin-panel-header px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                <h2 className="text-sm font-bold text-slate-900">Recent bug reports</h2>
              </div>
              <p className="text-xs text-slate-500">
                Latest beta feedback from the in-app bug reporter.
              </p>
            </div>
            <Link
              href="/platform/bugs"
              className="admin-btn-secondary min-h-9 shrink-0 px-3 py-2 text-xs"
            >
              View all bug reports
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Page</th>
                <th className="px-3 py-2">Message</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentBugReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">No bug reports yet</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Reports from beta testers will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                data.recentBugReports.map((report) => (
                  <tr key={report.id} className="text-slate-800">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                      {formatDate(report.createdAt)}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2.5">
                      {report.companyName?.trim() || "—"}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5">
                      {report.userEmail?.trim() || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-600/10">
                        {formatSeverityLabel(report.severity)}
                      </span>
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2.5 text-xs">
                      <a
                        href={report.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-700 hover:underline"
                        title={report.pageUrl}
                      >
                        {report.pageUrl}
                      </a>
                    </td>
                    <td className="max-w-[16rem] truncate px-3 py-2.5 text-xs text-slate-600">
                      {report.messagePreview}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {formatStatusLabel(report.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card overflow-hidden">
        <div className="admin-panel-header px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Platform users</h2>
          <p className="text-xs text-slate-500">
            One row per company membership (invites included).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Signed up</th>
                <th className="px-3 py-2">Last sign-in</th>
                <th className="px-3 py-2">IDs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((row) => (
                <tr key={row.membershipId} className="text-slate-800">
                  <td className="px-3 py-2.5">{row.name?.trim() || "—"}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2.5">{row.email}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2.5">
                    {row.companyName}
                  </td>
                  <td className="px-3 py-2.5">
                    {COMPANY_ROLE_LABELS[row.role] ?? row.role}
                  </td>
                  <td className="px-3 py-2.5">
                    {formatMembershipStatus(row.membershipStatus)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                    {formatOptionalDate(row.userCreatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                    {formatOptionalDate(row.lastSignInAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      {row.userId ? <DebugId value={row.userId} /> : <span>—</span>}
                      <DebugId value={row.companyId} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card overflow-hidden">
        <div className="admin-panel-header px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">Platform companies</h2>
          <p className="text-xs text-slate-500">
            Usage counts and last activity per workspace.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Members</th>
                <th className="px-3 py-2">Owners</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Jobs</th>
                <th className="px-3 py-2">Customers</th>
                <th className="px-3 py-2">Estimates</th>
                <th className="px-3 py-2">Invoices</th>
                <th className="px-3 py-2">Last activity</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.companies.map((company) => (
                <tr key={company.id} className="text-slate-800">
                  <td className="max-w-[12rem] truncate px-3 py-2.5 font-medium">
                    {company.name}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{company.memberCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{company.ownerCount}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                    {formatDate(company.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{company.jobCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{company.customerCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{company.estimateCount}</td>
                  <td className="px-3 py-2.5 tabular-nums">{company.invoiceCount}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                    {formatOptionalDate(company.lastActivityAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <DebugId value={company.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
