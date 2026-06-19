import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "@/shared/types/customer";
import { formatMembershipStatus } from "@/shared/types/team-member";
import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import type { PlatformAdminOverview } from "@/shared/types/platform-admin";
import {
  MasterContentStack,
  MasterPageHeader,
  MasterShellPage,
} from "@/shared/design-system/shell";
import {
  Building2,
  Briefcase,
  Bug,
  ChevronRight,
  FileText,
  Receipt,
  Shield,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { pt } from "./platform-north-star-styles";

export type PlatformNorthStarViewProps = {
  data: PlatformAdminOverview;
};

type SummaryMetricProps = {
  label: string;
  value: number;
  icon: LucideIcon;
};

function SummaryMetric({ label, value, icon: Icon }: SummaryMetricProps) {
  return (
    <div className={pt.metricCard}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={pt.metricLabel}>{label}</p>
          <p className={pt.metricValue}>{value.toLocaleString()}</p>
        </div>
        <div className={pt.metricIconWrap}>
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
    <span className={pt.debugId} title={value}>
      {value.slice(0, 8)}…
    </span>
  );
}

function formatSeverityLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStatusLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function PlatformSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={pt.panelHeader}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={pt.sectionEyebrow}>{eyebrow}</p>
          <h2 className={`mt-0.5 ${pt.sectionTitle}`}>{title}</h2>
          <p className={pt.sectionSubtitle}>{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function RecentList({
  title,
  eyebrow,
  description,
  items,
}: {
  title: string;
  eyebrow: string;
  description: string;
  items: { id: string; primary: string; secondary: string; meta: string }[];
}) {
  return (
    <section className={pt.sectionSurface}>
      <PlatformSectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
        {items.length === 0 ? (
          <p className={pt.emptyCopy}>No records yet.</p>
        ) : (
          <ul className={pt.listDivider}>
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className={pt.listPrimary}>{item.primary}</p>
                  <p className={pt.listSecondary}>{item.secondary}</p>
                </div>
                <p className={pt.listMeta}>{item.meta}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function PlatformNorthStarView({ data }: PlatformNorthStarViewProps) {
  const { summary } = data;
  const openRecentBugCount = data.recentBugReports.filter(
    (report) => report.status === "open",
  ).length;
  const hasAttention = data.diagnostics.length > 0 || openRecentBugCount > 0;

  return (
    <MasterShellPage density="compact" className={pt.pageCanvas}>
      <MasterPageHeader
        eyebrow="Internal operations"
        title="Platform"
        subtitle="Cross-tenant visibility and internal admin controls for the app owner."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-platform-page-header ${pt.pageHeader}`}
        eyebrowClassName={pt.pageHeaderEyebrow}
        titleClassName={pt.pageHeaderTitle}
        subtitleClassName={pt.pageHeaderSubtitle}
        secondaryAction={
          data.recentBugReports.length > 0 ? (
            <Link
              href="/platform/bugs"
              className={`north-star-platform-secondary-action ${pt.secondaryAction} justify-center sm:justify-start`}
            >
              <Bug className="h-4 w-4" aria-hidden="true" />
              Bug reports
            </Link>
          ) : undefined
        }
      />

      <MasterContentStack density="compact" className={pt.workspaceStack}>
        <div className={pt.noticeShell}>
          <div className="flex items-start gap-2.5">
            <Shield className={pt.noticeIcon} aria-hidden="true" />
            <div className="min-w-0">
              <p className={pt.noticeTitle}>Platform admin (read-only)</p>
              <p className={pt.noticeBody}>
                Internal beta visibility for the app owner. Cross-tenant data
                never leaves the server and stays separate from day-to-day
                company operations.
              </p>
            </div>
          </div>
        </div>

        {data.diagnostics.length > 0 ? (
          <section
            className={pt.diagnosticsShell}
            aria-label="Platform admin diagnostics"
          >
            <p className={pt.diagnosticsTitle}>Diagnostics</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {data.diagnostics.map((message) => (
                <li key={message} className={pt.diagnosticsItem}>
                  {message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={pt.sectionSurface}>
          <PlatformSectionHeader
            eyebrow="Platform state"
            title="System snapshot"
            description="Live counts across auth, workspaces, and core operational records."
          />
          <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4 lg:grid-cols-4 lg:px-5">
            <SummaryMetric
              label="Auth accounts"
              value={summary.totalAuthUsers}
              icon={Users}
            />
            <SummaryMetric
              label="Companies"
              value={summary.totalCompanies}
              icon={Building2}
            />
            <SummaryMetric
              label="Active memberships"
              value={summary.totalActiveMembers}
              icon={UserRound}
            />
            <SummaryMetric label="Jobs" value={summary.totalJobs} icon={Briefcase} />
            <SummaryMetric
              label="Customers"
              value={summary.totalCustomers}
              icon={Users}
            />
            <SummaryMetric
              label="Estimates"
              value={summary.totalEstimates}
              icon={FileText}
            />
            <SummaryMetric
              label="Invoices"
              value={summary.totalInvoices}
              icon={Receipt}
            />
          </div>
        </section>

        {hasAttention ? (
          <section className={pt.attentionShell} aria-label="Needs attention">
            <p className={pt.attentionTitle}>Needs attention</p>
            <div className="mt-1 space-y-1">
              {data.diagnostics.length > 0 ? (
                <p className={pt.attentionBody}>
                  {data.diagnostics.length} diagnostic
                  {data.diagnostics.length === 1 ? "" : "s"} reported during
                  overview load.
                </p>
              ) : null}
              {openRecentBugCount > 0 ? (
                <p className={pt.attentionBody}>
                  {openRecentBugCount} open bug report
                  {openRecentBugCount === 1 ? "" : "s"} in the latest preview.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className={pt.sectionSurface}>
          <PlatformSectionHeader
            eyebrow="Internal tools"
            title="Operator controls"
            description="Restricted workflows for platform ownership and support."
          />
          <div className="space-y-2.5 p-3 sm:p-4 lg:px-5">
            <Link href="/platform/bugs" className={pt.toolLink}>
              <div className="flex min-w-0 items-center gap-3">
                <div className={pt.toolIconWrap}>
                  <Bug className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className={pt.toolTitle}>Bug reports</p>
                  <p className={pt.toolDescription}>
                    Review beta feedback from the in-app bug reporter.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {data.recentBugReports.length > 0 ? (
                  <span className={pt.toolBadge}>
                    {data.recentBugReports.length} recent
                  </span>
                ) : null}
                <ChevronRight
                  className="h-4 w-4 text-[#8A6324]"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </div>
        </section>

        <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4">
          <RecentList
            eyebrow="Onboarding"
            title="Recent companies"
            description="Latest workspaces created on the platform."
            items={data.recentCompanies.map((company) => ({
              id: company.id,
              primary: company.name,
              secondary: `Created ${formatDate(company.createdAt)}`,
              meta: formatDate(company.createdAt),
            }))}
          />
          <RecentList
            eyebrow="Identity"
            title="Recent auth sign-ups"
            description="New auth accounts registered on the platform."
            items={data.recentUsers.map((user) => ({
              id: user.id,
              primary: user.fullName?.trim() || user.email,
              secondary: user.email,
              meta: formatDate(user.createdAt),
            }))}
          />
        </div>

        <section className={pt.sectionSurface}>
          <PlatformSectionHeader
            eyebrow="Support queue"
            title="Recent bug reports"
            description="Latest beta feedback from the in-app bug reporter."
            action={
              <Link href="/platform/bugs" className={pt.panelAction}>
                View all bug reports
              </Link>
            }
          />
          <div className={pt.tableWrap}>
            <table className="min-w-full text-left text-sm">
              <thead className={pt.tableHead}>
                <tr>
                  <th className={pt.tableHeadCell}>When</th>
                  <th className={pt.tableHeadCell}>Company</th>
                  <th className={pt.tableHeadCell}>User</th>
                  <th className={pt.tableHeadCell}>Severity</th>
                  <th className={pt.tableHeadCell}>Page</th>
                  <th className={pt.tableHeadCell}>Message</th>
                  <th className={pt.tableHeadCell}>Status</th>
                </tr>
              </thead>
              <tbody className={pt.tableBody}>
                {data.recentBugReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center">
                      <p className={pt.emptyTitle}>No bug reports yet</p>
                      <p className={pt.emptyDescription}>
                        Reports from beta testers will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  data.recentBugReports.map((report) => (
                    <tr key={report.id} className={pt.tableRow}>
                      <td className={`whitespace-nowrap ${pt.tableCellMuted}`}>
                        {formatDate(report.createdAt)}
                      </td>
                      <td className={pt.tableCellTruncate}>
                        {report.companyName?.trim() || "—"}
                      </td>
                      <td className="max-w-[12rem] truncate px-3 py-2.5">
                        {report.userEmail?.trim() || "—"}
                      </td>
                      <td className={pt.tableCell}>
                        <span className={pt.severityBadge}>
                          {formatSeverityLabel(report.severity)}
                        </span>
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-2.5">
                        <a
                          href={report.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={pt.tableLink}
                          title={report.pageUrl}
                        >
                          {report.pageUrl}
                        </a>
                      </td>
                      <td className="max-w-[16rem] truncate px-3 py-2.5 text-xs text-[#4F4638]">
                        {report.messagePreview}
                      </td>
                      <td className={`text-xs ${pt.tableCell}`}>
                        {formatStatusLabel(report.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={pt.sectionSurface}>
          <PlatformSectionHeader
            eyebrow="Directory"
            title="Platform users"
            description="One row per company membership (invites included)."
          />
          <div className={pt.tableWrap}>
            <table className="min-w-full text-left text-sm">
              <thead className={pt.tableHead}>
                <tr>
                  <th className={pt.tableHeadCell}>Name</th>
                  <th className={pt.tableHeadCell}>Email</th>
                  <th className={pt.tableHeadCell}>Company</th>
                  <th className={pt.tableHeadCell}>Role</th>
                  <th className={pt.tableHeadCell}>Status</th>
                  <th className={pt.tableHeadCell}>Signed up</th>
                  <th className={pt.tableHeadCell}>Last sign-in</th>
                  <th className={pt.tableHeadCell}>IDs</th>
                </tr>
              </thead>
              <tbody className={pt.tableBody}>
                {data.users.map((row) => (
                  <tr key={row.membershipId} className={pt.tableRow}>
                    <td className={pt.tableCell}>{row.name?.trim() || "—"}</td>
                    <td className="max-w-[12rem] truncate px-3 py-2.5">
                      {row.email}
                    </td>
                    <td className={pt.tableCellTruncate}>{row.companyName}</td>
                    <td className={pt.tableCell}>
                      {COMPANY_ROLE_LABELS[row.role] ?? row.role}
                    </td>
                    <td className={pt.tableCell}>
                      {formatMembershipStatus(row.membershipStatus)}
                    </td>
                    <td className={`whitespace-nowrap ${pt.tableCellMuted}`}>
                      {formatOptionalDate(row.userCreatedAt)}
                    </td>
                    <td className={`whitespace-nowrap ${pt.tableCellMuted}`}>
                      {formatOptionalDate(row.lastSignInAt)}
                    </td>
                    <td className={pt.tableCell}>
                      <div className="flex flex-col gap-0.5">
                        {row.userId ? (
                          <DebugId value={row.userId} />
                        ) : (
                          <span>—</span>
                        )}
                        <DebugId value={row.companyId} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={pt.sectionSurface}>
          <PlatformSectionHeader
            eyebrow="Workspaces"
            title="Platform companies"
            description="Usage counts and last activity per workspace."
          />
          <div className={pt.tableWrap}>
            <table className="min-w-full text-left text-sm">
              <thead className={pt.tableHead}>
                <tr>
                  <th className={pt.tableHeadCell}>Company</th>
                  <th className={pt.tableHeadCell}>Members</th>
                  <th className={pt.tableHeadCell}>Owners</th>
                  <th className={pt.tableHeadCell}>Created</th>
                  <th className={pt.tableHeadCell}>Jobs</th>
                  <th className={pt.tableHeadCell}>Customers</th>
                  <th className={pt.tableHeadCell}>Estimates</th>
                  <th className={pt.tableHeadCell}>Invoices</th>
                  <th className={pt.tableHeadCell}>Last activity</th>
                  <th className={pt.tableHeadCell}>ID</th>
                </tr>
              </thead>
              <tbody className={pt.tableBody}>
                {data.companies.map((company) => (
                  <tr key={company.id} className={pt.tableRow}>
                    <td className="max-w-[12rem] truncate px-3 py-2.5 font-medium">
                      {company.name}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{company.memberCount}</td>
                    <td className="px-3 py-2.5 tabular-nums">{company.ownerCount}</td>
                    <td className={`whitespace-nowrap ${pt.tableCellMuted}`}>
                      {formatDate(company.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{company.jobCount}</td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {company.customerCount}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {company.estimateCount}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {company.invoiceCount}
                    </td>
                    <td className={`whitespace-nowrap ${pt.tableCellMuted}`}>
                      {formatOptionalDate(company.lastActivityAt)}
                    </td>
                    <td className={pt.tableCell}>
                      <DebugId value={company.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </MasterContentStack>
    </MasterShellPage>
  );
}
