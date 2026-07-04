import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { COMPANY_ACTIVATION_STAGE_LABELS } from "@/shared/lib/platform-customer-health";
import type {
  CompanyHealthSummary,
  CompanyHealthStatus,
  PlatformCustomerHealthSnapshot,
} from "@/shared/types/platform-customer-health";
import { pt } from "@/shared/components/platform-admin/north-star-m13/platform-north-star-styles";

type PlatformCustomerHealthPulseProps = {
  customerHealth: PlatformCustomerHealthSnapshot;
  northStar?: boolean;
};

function healthStatusLabel(status: CompanyHealthStatus): string {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "watch":
      return "Watch";
    default:
      return "Needs help";
  }
}

function healthStatusClass(status: CompanyHealthStatus, northStar: boolean): string {
  if (northStar) {
    switch (status) {
      case "healthy":
        return "bg-[rgba(22,101,52,0.1)] text-[#166534] ring-[rgba(22,101,52,0.16)]";
      case "watch":
        return "bg-[rgba(180,83,9,0.1)] text-[#9A3412] ring-[rgba(180,83,9,0.16)]";
      default:
        return "bg-[rgba(185,28,28,0.1)] text-[#991B1B] ring-[rgba(185,28,28,0.16)]";
    }
  }

  switch (status) {
    case "healthy":
      return "bg-emerald-50 text-emerald-800 ring-emerald-600/10";
    case "watch":
      return "bg-amber-50 text-amber-800 ring-amber-600/10";
    default:
      return "bg-red-50 text-red-700 ring-red-600/10";
  }
}

function CountChip({
  label,
  value,
  northStar,
}: {
  label: string;
  value: number;
  northStar: boolean;
}) {
  return (
    <div
      className={
        northStar
          ? "min-w-0 rounded-[0.875rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-3"
          : "min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
      }
    >
      <p
        className={
          northStar
            ? "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6255]"
            : "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
        }
      >
        {label}
      </p>
      <p
        className={
          northStar
            ? "mt-1 text-lg font-bold tabular-nums text-[#17130E]"
            : "mt-1 text-lg font-bold tabular-nums text-slate-900"
        }
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function CompanyHealthRow({
  company,
  northStar,
}: {
  company: CompanyHealthSummary;
  northStar: boolean;
}) {
  const badgeClass = healthStatusClass(company.healthStatus, northStar);
  const topReason = company.riskReasons[0]?.label;

  return (
    <li>
      <Link
        href={company.actionHref}
        className={
          northStar
            ? "group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-[#F3EBDD] sm:px-3"
            : "group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 sm:px-3"
        }
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={
                northStar
                  ? "text-sm font-semibold text-[#17130E]"
                  : "text-sm font-semibold text-slate-900"
              }
            >
              {company.companyName}
            </p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeClass}`}
            >
              {healthStatusLabel(company.healthStatus)}
            </span>
            <span
              className={
                northStar
                  ? "inline-flex rounded-full bg-[#EFE4CB] px-2 py-0.5 text-[10px] font-medium text-[#8A6324]"
                  : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
              }
            >
              {COMPANY_ACTIVATION_STAGE_LABELS[company.activationStage]}
            </span>
          </div>
          <p
            className={
              northStar
                ? "mt-0.5 text-xs leading-snug text-[#4F4638]"
                : "mt-0.5 text-xs leading-snug text-slate-600"
            }
          >
            {topReason ?? company.nextBestAction}
          </p>
        </div>
        <ChevronRight
          className={
            northStar
              ? "mt-1 h-4 w-4 shrink-0 text-[#8A6324] transition-transform group-hover:translate-x-0.5"
              : "mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
          }
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

export function PlatformCustomerHealthPulse({
  customerHealth,
  northStar = false,
}: PlatformCustomerHealthPulseProps) {
  const totalOperational =
    customerHealth.healthyCount +
    customerHealth.watchCount +
    customerHealth.needsHelpCount;

  const headline =
    customerHealth.needsHelpCount > 0
      ? `${customerHealth.needsHelpCount} beta ${customerHealth.needsHelpCount === 1 ? "company needs" : "companies need"} outreach today`
      : customerHealth.watchCount > 0
        ? "Beta companies are progressing — a few need a nudge"
        : totalOperational > 0
          ? "Beta customer health looks strong"
          : "No beta companies to track yet";

  if (northStar) {
    return (
      <section
        className={pt.sectionSurface}
        aria-label="Customer health"
        id="platform-customer-health"
      >
        <div className={pt.panelHeader}>
          <p className={pt.sectionEyebrow}>Customer health pulse</p>
          <h2 className={`mt-0.5 ${pt.sectionTitle}`}>{headline}</h2>
          <p className={pt.sectionSubtitle}>
            Who is activating, stuck, or worth contacting — real usage only,
            demo-only workspaces excluded from outreach counts.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-4 sm:p-4 lg:px-5">
          <CountChip label="Healthy" value={customerHealth.healthyCount} northStar />
          <CountChip label="Watch" value={customerHealth.watchCount} northStar />
          <CountChip
            label="Needs help"
            value={customerHealth.needsHelpCount}
            northStar
          />
          {customerHealth.demoOnlyCount > 0 ? (
            <CountChip
              label="Demo only"
              value={customerHealth.demoOnlyCount}
              northStar
            />
          ) : null}
        </div>

        <div className="px-3 pb-4 sm:px-4 lg:px-5">
          {customerHealth.topNeedsAttention.length === 0 ? (
            <p className={pt.emptyCopy}>
              {totalOperational === 0
                ? "No companies on the platform yet — health signals appear after the first signup."
                : "No companies need urgent outreach right now."}
            </p>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6255]">
                Top companies needing attention
              </p>
              <ul className={pt.listDivider}>
                {customerHealth.topNeedsAttention.map((company) => (
                  <CompanyHealthRow
                    key={company.companyId}
                    company={company}
                    northStar
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      className="admin-card admin-card-body"
      aria-label="Customer health"
      id="platform-customer-health"
    >
      <h2 className="text-sm font-bold text-slate-900">{headline}</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Who is activating, stuck, or worth contacting today.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CountChip label="Healthy" value={customerHealth.healthyCount} northStar={false} />
        <CountChip label="Watch" value={customerHealth.watchCount} northStar={false} />
        <CountChip
          label="Needs help"
          value={customerHealth.needsHelpCount}
          northStar={false}
        />
        {customerHealth.demoOnlyCount > 0 ? (
          <CountChip
            label="Demo only"
            value={customerHealth.demoOnlyCount}
            northStar={false}
          />
        ) : null}
      </div>

      {customerHealth.topNeedsAttention.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {totalOperational === 0
            ? "No companies on the platform yet."
            : "No companies need urgent outreach right now."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {customerHealth.topNeedsAttention.map((company) => (
            <CompanyHealthRow
              key={company.companyId}
              company={company}
              northStar={false}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
