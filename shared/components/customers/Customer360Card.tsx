import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleDollarSign,
  ClipboardList,
  Clock,
  History,
  MapPin,
  Sparkles,
  Tag,
} from "lucide-react";
import type {
  Customer360Data,
  Customer360Opportunity,
} from "@/shared/lib/customers/customer-360";
import { filterOperationalActivitiesForBillingAccess } from "@/shared/lib/billing-activity-visibility";
import { CUSTOMER_DETAIL_360_ANCHOR } from "@/shared/lib/customers/customer-detail-anchors";
import { DemoDisplayName } from "@/shared/components/display/DemoDisplayName";
import { OperationalActivityEntryContent } from "@/shared/components/operational/OperationalActivityEntryContent";
import {
  adminCardSectionClass,
  adminEmptyWrapClass,
  adminMetaRowClass,
} from "@/shared/lib/admin-density";
import {
  formatEquipmentDate,
  formatWarrantyStatus,
  getWarrantyStatusStyles,
} from "@/shared/types/customer-equipment";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type Customer360CardVariant = "full" | "facts" | "opportunities";

type Customer360CardProps = {
  data: Customer360Data;
  canViewBilling: boolean;
  northStar?: boolean;
  /** Split layout: facts rail, opportunities column, or legacy full card */
  variant?: Customer360CardVariant;
  /** When true, identity omits fields already shown in the North Star hero */
  heroCoversIdentity?: boolean;
};

const legacySeverityStyles: Record<
  Customer360Opportunity["severity"],
  string
> = {
  info: "border-slate-200 bg-slate-50/70",
  warning: "border-amber-200 bg-amber-50/70",
  critical: "border-rose-200 bg-rose-50/70",
};

const northStarSeverityStyles: Record<
  Customer360Opportunity["severity"],
  string
> = {
  info: "border-[rgba(138,99,36,0.12)] bg-[#FFF9EA]",
  warning: "border-[rgba(245,158,11,0.35)] bg-[rgba(254,243,199,0.55)]",
  critical: "border-[rgba(244,63,94,0.25)] bg-[rgba(254,226,226,0.55)]",
};

export function Customer360Card({
  data,
  canViewBilling,
  northStar = false,
  variant = "full",
  heroCoversIdentity = false,
}: Customer360CardProps) {
  const sectionClass = northStar
    ? variant === "facts" || variant === "opportunities"
      ? dt.compactSectionSurface
      : dt.sectionSurface
    : adminCardSectionClass;

  if (variant === "facts") {
    return (
      <section
        className={`${sectionClass} scroll-mt-6`}
        id={CUSTOMER_DETAIL_360_ANCHOR}
      >
        <CustomerFactsSection
          identity={data.identity}
          limitations={data.limitations}
          northStar={northStar}
          heroCoversIdentity={heroCoversIdentity}
        />
      </section>
    );
  }

  if (variant === "opportunities") {
    return (
      <section className={`${sectionClass} scroll-mt-6`}>
        <OpportunitiesSection
          opportunities={data.opportunities}
          northStar={northStar}
          compact
        />
      </section>
    );
  }

  return (
    <section
      className={`${sectionClass} scroll-mt-6`}
      id={CUSTOMER_DETAIL_360_ANCHOR}
    >
      <div className="mb-2">
        <h2 className={northStar ? dt.sectionTitle : "text-sm font-semibold text-slate-900"}>
          Customer 360
        </h2>
        <p className={northStar ? dt.sectionSubtitle : "text-[11px] text-slate-500"}>
          {canViewBilling
            ? "Identity, financials, equipment, opportunities, and recent activity"
            : "Identity, equipment, opportunities, and recent activity"}
        </p>
      </div>

      <div className="space-y-2.5">
        <IdentitySection
          identity={data.identity}
          northStar={northStar}
        />
        {data.financial ? (
          <FinancialSection financial={data.financial} northStar={northStar} />
        ) : null}
        <EquipmentSection equipment={data.equipment} northStar={northStar} />
        <OpportunitiesSection opportunities={data.opportunities} northStar={northStar} />
        <RecentActivitySection
          activities={data.recentActivity}
          canViewBilling={canViewBilling}
          northStar={northStar}
        />
      </div>

      {data.limitations.length > 0 ? (
        <p className="mt-2 rounded-md border border-amber-100 bg-amber-50/60 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
          {data.limitations.join(" ")}
        </p>
      ) : null}
    </section>
  );
}

function CustomerFactsSection({
  identity,
  limitations,
  northStar,
  heroCoversIdentity,
}: {
  identity: Customer360Data["identity"];
  limitations: string[];
  northStar: boolean;
  heroCoversIdentity: boolean;
}) {
  const shellClass = northStar
    ? dt.innerCard
    : "rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2";

  return (
    <>
      <div className="mb-2">
        <h2 className={northStar ? dt.sectionTitle : "text-sm font-semibold text-slate-900"}>
          Customer facts
        </h2>
        <p className={northStar ? dt.sectionSubtitle : "text-[11px] text-slate-500"}>
          Account details and tags
        </p>
      </div>

      <div className={shellClass}>
        {!heroCoversIdentity ? (
          <>
            <p className={northStar ? dt.ivoryCardPrimary : "text-sm font-semibold text-slate-900"}>
              <DemoDisplayName>{identity.name}</DemoDisplayName>
            </p>
            {identity.company ? (
              <p className={northStar ? dt.ivoryCardSecondary : "text-xs text-slate-600"}>
                {identity.company}
              </p>
            ) : null}
            <p className={northStar ? `mt-0.5 ${dt.ivoryCardSecondary}` : "mt-0.5 text-xs text-slate-600"}>
              {[identity.email, identity.phone].filter(Boolean).join(" · ") ||
                "No contact info on file"}
            </p>
          </>
        ) : null}

        <div className={`${heroCoversIdentity ? "" : "mt-1.5"} ${northStar ? dt.ivoryMetaRow : adminMetaRowClass}`}>
          <MapPin className={northStar ? dt.metaIcon : "h-3.5 w-3.5 shrink-0 text-slate-400"} />
          <span className={northStar ? dt.ivoryCardSecondary : "text-xs text-slate-600"}>
            {identity.addressLine}
          </span>
        </div>
        <div className={`mt-1 ${northStar ? dt.ivoryMetaRow : adminMetaRowClass}`}>
          <Clock className={northStar ? dt.metaIcon : "h-3.5 w-3.5 shrink-0 text-slate-400"} />
          <span className={northStar ? dt.ivoryCardSecondary : "text-xs text-slate-600"}>
            Customer since {formatDate(identity.customerSince)}
          </span>
        </div>
        {identity.tags.length > 0 ? (
          <div className={`mt-1.5 flex flex-wrap gap-1.5 ${northStar ? dt.ivoryMetaRow : adminMetaRowClass}`}>
            {identity.tags.map((tag) => (
              <span
                key={tag}
                className={
                  northStar
                    ? dt.ivoryTagChip
                    : "inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                }
              >
                <Tag className={northStar ? "h-2.5 w-2.5 text-[#8A6324]" : "h-2.5 w-2.5 text-slate-400"} />
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {!heroCoversIdentity ? (
          <span
            className={
              northStar
                ? "mt-2 inline-flex items-center rounded-full bg-[#EFE4CB] px-2 py-0.5 text-[11px] font-medium text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]"
                : "mt-2 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
            }
          >
            {identity.statusLabel}
          </span>
        ) : null}
      </div>

      {limitations.length > 0 ? (
        <p className="mt-2 rounded-md border border-amber-100 bg-amber-50/60 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
          {limitations.join(" ")}
        </p>
      ) : null}
    </>
  );
}

function IdentitySection({
  identity,
  northStar = false,
}: {
  identity: Customer360Data["identity"];
  northStar?: boolean;
  heroCoversIdentity?: boolean;
}) {
  const shellClass = northStar
    ? dt.innerCard
    : "rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2";

  return (
    <div className={shellClass}>
      <p
        className={
          northStar
            ? dt.metricLabel
            : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
        }
      >
        Identity
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            className={
              northStar
                ? dt.ivoryCardPrimary
                : "text-sm font-semibold text-slate-900"
            }
          >
            <DemoDisplayName>{identity.name}</DemoDisplayName>
          </p>
          {identity.company ? (
            <p className={northStar ? dt.ivoryCardSecondary : "text-xs text-slate-600"}>
              {identity.company}
            </p>
          ) : null}
          <div
            className={`mt-0.5 ${northStar ? dt.ivoryCardSecondary : "text-xs text-slate-600"}`}
          >
            {identity.email ? (
              <p className="break-all sm:hidden">{identity.email}</p>
            ) : null}
            {identity.phone ? (
              <p className="sm:hidden">{identity.phone}</p>
            ) : null}
            <p className="hidden break-words sm:block">
              {[identity.email, identity.phone].filter(Boolean).join(" · ") ||
                "No contact info on file"}
            </p>
          </div>
        </div>
        <span
          className={
            northStar
              ? "inline-flex items-center rounded-full bg-[#EFE4CB] px-2 py-0.5 text-[11px] font-medium text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.12)]"
              : "inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
          }
        >
          {identity.statusLabel}
        </span>
      </div>
      <div className={`mt-1.5 ${northStar ? dt.ivoryMetaRow : adminMetaRowClass}`}>
        <MapPin className={northStar ? dt.metaIcon : "h-3.5 w-3.5 shrink-0 text-slate-400"} />
        <span className={northStar ? dt.ivoryCardSecondary : "text-xs text-slate-600"}>
          {identity.addressLine}
        </span>
      </div>
      <div className={`mt-1 ${northStar ? dt.ivoryMetaRow : adminMetaRowClass}`}>
        <Clock className={northStar ? dt.metaIcon : "h-3.5 w-3.5 shrink-0 text-slate-400"} />
        <span className={northStar ? dt.ivoryCardSecondary : "text-xs text-slate-600"}>
          Customer since {formatDate(identity.customerSince)}
        </span>
      </div>
      {identity.tags.length > 0 ? (
        <div
          className={`mt-1.5 flex flex-wrap gap-1.5 ${northStar ? dt.ivoryMetaRow : adminMetaRowClass}`}
        >
          {identity.tags.map((tag) => (
            <span
              key={tag}
              className={
                northStar
                  ? dt.ivoryTagChip
                  : "inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
              }
            >
              <Tag className={northStar ? "h-2.5 w-2.5 text-[#8A6324]" : "h-2.5 w-2.5 text-slate-400"} />
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FinancialSection({
  financial,
  northStar = false,
}: {
  financial: NonNullable<Customer360Data["financial"]>;
  northStar?: boolean;
}) {
  const shellClass = northStar
    ? dt.innerCard
    : "rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2";

  return (
    <div className={shellClass}>
      <p
        className={
          northStar
            ? dt.metricLabel
            : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
        }
      >
        Financial snapshot
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SummaryMetric
          label="Total invoiced"
          value={formatCurrency(financial.totalInvoiced)}
          icon={ClipboardList}
          northStar={northStar}
        />
        <SummaryMetric
          label="Total collected"
          value={formatCurrency(financial.totalCollected)}
          icon={CircleDollarSign}
          northStar={northStar}
        />
        <SummaryMetric
          label="Balance due"
          value={formatCurrency(financial.outstandingBalance)}
          icon={AlertTriangle}
          highlighted={financial.outstandingBalance > 0}
          northStar={northStar}
        />
        <SummaryMetric
          label="Paid invoices"
          value={`${financial.paidInvoiceCount} / ${financial.invoiceCount}`}
          icon={Sparkles}
          northStar={northStar}
        />
      </div>
    </div>
  );
}

function EquipmentSection({
  equipment,
  northStar = false,
}: {
  equipment: Customer360Data["equipment"];
  northStar?: boolean;
}) {
  const shellClass = northStar
    ? dt.innerCard
    : "rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2";

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={
            northStar
              ? dt.metricLabel
              : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
          }
        >
          Equipment
        </p>
        <p className={northStar ? dt.ivoryCardSecondary : "text-xs text-slate-600"}>
          {equipment.activeCount} active
          {equipment.agingCount > 0
            ? ` · ${equipment.agingCount} aging`
            : ""}
        </p>
      </div>

      {equipment.items.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {equipment.items.map((item) => (
            <li
              key={item.id}
              className={
                northStar
                  ? "flex flex-wrap items-center justify-between gap-2 rounded-md border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-2 py-1.5"
                  : "flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-2 py-1.5"
              }
            >
              <div className="min-w-0">
                <p
                  className={
                    northStar
                      ? "truncate text-sm font-medium text-[#17130E]"
                      : "truncate text-sm font-medium text-slate-900"
                  }
                >
                  <DemoDisplayName>{item.name}</DemoDisplayName>
                </p>
                <p className={northStar ? dt.ivoryCardMuted : "text-[11px] text-slate-500"}>
                  {item.equipmentType || "Equipment"}
                  {item.installDate
                    ? ` · Installed ${formatEquipmentDate(item.installDate)}`
                    : ""}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getWarrantyStatusStyles(item.warrantyStatus)}`}
              >
                {formatWarrantyStatus(item.warrantyStatus)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`mt-1.5 ${adminEmptyWrapClass}`}>
          <p className={northStar ? dt.ivoryCardMuted : "text-sm text-slate-500"}>
            No active equipment on file.
          </p>
        </div>
      )}
    </div>
  );
}

function OpportunitiesSection({
  opportunities,
  northStar = false,
  compact = false,
}: {
  opportunities: Customer360Opportunity[];
  northStar?: boolean;
  compact?: boolean;
}) {
  const shellClass = northStar
    ? compact
      ? undefined
      : dt.innerCard
    : "rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2";

  const content = (
    <>
      <div className={compact && northStar ? "mb-2" : undefined}>
        <h2
          className={
            compact && northStar
              ? dt.sectionTitle
              : northStar
                ? dt.metricLabel
                : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
          }
        >
          Opportunities
        </h2>
        {compact && northStar ? (
          <p className={dt.sectionSubtitle}>Follow-ups and next actions</p>
        ) : null}
      </div>

      {opportunities.length > 0 ? (
        <ul className={`${compact && northStar ? "mt-0" : "mt-1.5"} space-y-1.5`}>
          {opportunities.map((opportunity) => (
            <OpportunityRow
              key={opportunity.type}
              opportunity={opportunity}
              northStar={northStar}
            />
          ))}
        </ul>
      ) : (
        <div className={`${compact && northStar ? "mt-2" : "mt-1.5"} ${adminEmptyWrapClass}`}>
          <p className={northStar ? dt.ivoryCardMuted : "text-sm text-slate-500"}>
            No follow-up opportunities right now.
          </p>
        </div>
      )}
    </>
  );

  if (shellClass) {
    return <div className={shellClass}>{content}</div>;
  }

  return content;
}

function RecentActivitySection({
  activities,
  canViewBilling,
  northStar = false,
}: {
  activities: Customer360Data["recentActivity"];
  canViewBilling: boolean;
  northStar?: boolean;
}) {
  const visibleActivities = filterOperationalActivitiesForBillingAccess(
    activities,
    canViewBilling,
  );
  const shellClass = northStar
    ? dt.innerCard
    : "rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2";

  return (
    <div className={shellClass}>
      <p
        className={
          northStar
            ? dt.metricLabel
            : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
        }
      >
        Recent activity
      </p>

      {visibleActivities.length > 0 ? (
        <ol className="mt-1.5 space-y-1.5">
          {visibleActivities.map((activity) => (
            <li
              key={activity.id}
              className={
                northStar
                  ? "rounded-md border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-2 py-1.5"
                  : "rounded-md border border-slate-100 bg-white px-2 py-1.5"
              }
            >
              <div className="flex items-start gap-2">
                <History
                  className={
                    northStar
                      ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A6324]"
                      : "mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  }
                />
                <div className="min-w-0 flex-1">
                  <OperationalActivityEntryContent
                    activity={activity}
                    canViewBilling={canViewBilling}
                    labelClassName={
                      northStar
                        ? "text-sm font-medium text-[#17130E]"
                        : "text-sm font-medium text-slate-900"
                    }
                    timestampClassName={
                      northStar
                        ? "shrink-0 text-[11px] text-[#64748B]"
                        : "shrink-0 text-[11px] text-slate-400"
                    }
                    detailsClassName={
                      northStar
                        ? "mt-0.5 text-xs text-[#4F4638]"
                        : "mt-0.5 text-xs text-slate-600"
                    }
                    attributionClassName={
                      northStar
                        ? "mt-0.5 text-[11px] text-[#64748B]"
                        : "mt-0.5 text-[11px] text-slate-400"
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className={`mt-1.5 ${adminEmptyWrapClass}`}>
          <p className={northStar ? dt.ivoryCardMuted : "text-sm text-slate-500"}>
            Activity will appear here as work progresses.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  highlighted = false,
  northStar = false,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  highlighted?: boolean;
  northStar?: boolean;
}) {
  return (
    <div
      className={
        northStar
          ? highlighted
            ? dt.metricCardHighlight
            : dt.metricCard
          : highlighted
            ? "rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-2"
            : "rounded-lg border border-slate-100 bg-white px-2.5 py-2"
      }
    >
      <div className="flex items-center gap-1.5">
        <Icon
          className={
            northStar ? dt.metricIcon : "h-3.5 w-3.5 shrink-0 text-slate-400"
          }
        />
        <p
          className={
            northStar
              ? dt.metricLabel
              : "text-[10px] font-semibold uppercase tracking-wide text-slate-400"
          }
        >
          {label}
        </p>
      </div>
      <p
        className={
          northStar ? dt.metricValue : "mt-0.5 text-sm font-bold tabular-nums text-slate-900"
        }
      >
        {value}
      </p>
    </div>
  );
}

function OpportunityRow({
  opportunity,
  northStar = false,
}: {
  opportunity: Customer360Opportunity;
  northStar?: boolean;
}) {
  const severityStyles = northStar ? northStarSeverityStyles : legacySeverityStyles;

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p
          className={
            northStar
              ? dt.ivoryCardPrimary
              : "text-sm font-semibold text-slate-900"
          }
        >
          {opportunity.title}
        </p>
        {opportunity.href && opportunity.actionLabel ? (
          <span
            className={
              northStar
                ? dt.opportunityLink
                : "inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-cyan-700"
            }
          >
            {opportunity.actionLabel}
            <ArrowRight className="h-3 w-3" />
          </span>
        ) : null}
      </div>
      <p
        className={
          northStar
            ? "mt-0.5 text-xs leading-snug text-[#4F4638]"
            : "mt-0.5 text-xs leading-snug text-slate-600"
        }
      >
        {opportunity.description}
      </p>
    </>
  );

  const className = `block rounded-lg border px-2.5 py-2 ${severityStyles[opportunity.severity]}`;

  if (opportunity.href) {
    return (
      <li>
        <Link
          href={opportunity.href}
          className={`${className} transition-colors ${northStar ? "hover:border-[rgba(201,164,77,0.28)]" : "hover:bg-white"}`}
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className={className}>{content}</div>
    </li>
  );
}
